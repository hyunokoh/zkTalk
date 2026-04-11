import { send, subscribe } from '@/hooks/useWebSocket';
import type { WSOutgoing } from '@zktalk/shared';
import { devLogError } from '@/lib/client-log';

// ── Constants ───────────────────────────────────────────────────────

const CHUNK_SIZE = 64 * 1024; // 64KB chunks
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// ── File chunking helpers ───────────────────────────────────────────

export async function splitFileIntoChunks(
  file: File,
  chunkSize: number = CHUNK_SIZE,
): Promise<ArrayBuffer[]> {
  const chunks: ArrayBuffer[] = [];
  let offset = 0;

  while (offset < file.size) {
    const slice = file.slice(offset, offset + chunkSize);
    const buffer = await slice.arrayBuffer();
    chunks.push(buffer);
    offset += chunkSize;
  }

  return chunks;
}

export function reassembleChunks(chunks: ArrayBuffer[]): Blob {
  return new Blob(chunks);
}

export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ── Types ───────────────────────────────────────────────────────────

interface SeedEntry {
  file: File;
  chunks: ArrayBuffer[];
}

interface PendingRequest {
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
  chunks: ArrayBuffer[];
  totalChunks: number;
  receivedChunks: number;
}

// ── P2P File Transfer Manager ───────────────────────────────────────

export class P2PFileManager {
  private files: Map<string, SeedEntry> = new Map();
  private connections: Map<string, RTCPeerConnection> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private unsubscribers: Array<() => void> = [];

  /** Progress callback: fileId -> 0..100 */
  onProgress?: (fileId: string, progress: number) => void;

  /** Called when transfer completes */
  onComplete?: (fileId: string, blob: Blob) => void;

  /** Called on error */
  onError?: (fileId: string, error: Error) => void;

  constructor() {
    this.setupSignalingListeners();
  }

  // ── Setup WebSocket event listeners ─────────────────────────────

  private setupSignalingListeners(): void {
    // Listen for incoming P2P signals (ICE/SDP)
    const unsub1 = subscribe('p2p.signal', (msg: WSOutgoing) => {
      const data = msg.data as {
        fromUserId: string;
        fileId: string;
        signal: RTCSessionDescriptionInit | RTCIceCandidateInit;
      };
      this.handleSignal(data.fromUserId, data.fileId, data.signal).catch(
        (error) => devLogError('[P2P] Failed to handle signal', error),
      );
    });

    // Listen for file requests from other peers
    const unsub2 = subscribe('p2p.file_request', (msg: WSOutgoing) => {
      const data = msg.data as { fileId: string; requesterId: string };
      this.handleFileRequest(data.fileId, data.requesterId).catch(
        (error) => devLogError('[P2P] Failed to handle file request', error),
      );
    });

    // Listen for seeder availability notifications
    const unsub3 = subscribe('p2p.file_available', (msg: WSOutgoing) => {
      const data = msg.data as { fileId: string; seederId: string };
      this.handleFileAvailable(data.fileId, data.seederId).catch(
        (error) => devLogError('[P2P] Failed to handle file availability', error),
      );
    });

    this.unsubscribers.push(unsub1, unsub2, unsub3);
  }

  // ── Register a file for seeding ─────────────────────────────────

  async seedFile(fileId: string, file: File): Promise<void> {
    const chunks = await splitFileIntoChunks(file);
    this.files.set(fileId, { file, chunks });
  }

  // ── Check if we have a file available for seeding ───────────────

  hasFile(fileId: string): boolean {
    return this.files.has(fileId);
  }

  // ── Request a file from peers ───────────────────────────────────

  async requestFile(
    fileId: string,
    channelId?: string,
    conversationId?: string,
  ): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      this.pendingRequests.set(fileId, {
        resolve,
        reject,
        chunks: [],
        totalChunks: 0,
        receivedChunks: 0,
      });

      // Broadcast request to find seeders
      send({
        type: 'p2p_file_request',
        fileId,
        channelId,
        conversationId,
      });

      // Timeout after 30 seconds if no seeder responds
      setTimeout(() => {
        const pending = this.pendingRequests.get(fileId);
        if (pending && pending.receivedChunks === 0) {
          this.pendingRequests.delete(fileId);
          reject(new Error('No seeders available'));
        }
      }, 30_000);
    });
  }

  // ── Handle incoming P2P signal (ICE/SDP) ────────────────────────

  async handleSignal(
    fromUserId: string,
    fileId: string,
    signal: RTCSessionDescriptionInit | RTCIceCandidateInit,
  ): Promise<void> {
    const connKey = `${fromUserId}:${fileId}`;

    if ('type' in signal && (signal.type === 'offer' || signal.type === 'answer')) {
      const desc = signal as RTCSessionDescriptionInit;

      if (desc.type === 'offer') {
        // We received an offer: we are the sender (seeder)
        await this.handleOfferAsSender(fromUserId, fileId, desc);
      } else if (desc.type === 'answer') {
        // We received an answer: we are the receiver
        const pc = this.connections.get(connKey);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(desc));
        }
      }
    } else if ('candidate' in signal) {
      // ICE candidate
      const pc = this.connections.get(connKey);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(signal as RTCIceCandidateInit));
      }
    }
  }

  // ── Handle file request from another peer ───────────────────────

  private async handleFileRequest(
    fileId: string,
    requesterId: string,
  ): Promise<void> {
    if (!this.files.has(fileId)) return;

    // Announce that we have the file
    send({
      type: 'p2p_file_available',
      fileId,
      targetUserId: requesterId,
    });
  }

  // ── Handle seeder availability notification ─────────────────────

  private async handleFileAvailable(
    fileId: string,
    seederId: string,
  ): Promise<void> {
    const pending = this.pendingRequests.get(fileId);
    if (!pending) return;

    // Create receiver connection and send offer to seeder
    await this.createReceiverConnection(seederId, fileId);
  }

  // ── Create receiver connection (we want the file) ───────────────

  private async createReceiverConnection(
    seederId: string,
    fileId: string,
  ): Promise<void> {
    const connKey = `${seederId}:${fileId}`;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.connections.set(connKey, pc);

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          type: 'p2p_signal',
          targetUserId: seederId,
          fileId,
          signal: event.candidate.toJSON(),
        });
      }
    };

    // Create data channel for receiving file
    const dc = pc.createDataChannel('file-transfer', {
      ordered: true,
    });

    dc.binaryType = 'arraybuffer';

    dc.onopen = () => {
      // Send a request for the file metadata first
      dc.send(JSON.stringify({ type: 'request', fileId }));
    };

    dc.onmessage = (event) => {
      this.handleReceivedData(fileId, event.data);
    };

    dc.onclose = () => {
      this.cleanupConnection(connKey);
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    send({
      type: 'p2p_signal',
      targetUserId: seederId,
      fileId,
      signal: pc.localDescription!.toJSON(),
    });
  }

  // ── Handle offer as sender (we have the file) ──────────────────

  private async handleOfferAsSender(
    requesterId: string,
    fileId: string,
    offer: RTCSessionDescriptionInit,
  ): Promise<void> {
    const seedEntry = this.files.get(fileId);
    if (!seedEntry) return;

    const connKey = `${requesterId}:${fileId}`;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.connections.set(connKey, pc);

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          type: 'p2p_signal',
          targetUserId: requesterId,
          fileId,
          signal: event.candidate.toJSON(),
        });
      }
    };

    // Handle incoming data channel from receiver
    pc.ondatachannel = (event) => {
      const dc = event.channel;
      dc.binaryType = 'arraybuffer';

      dc.onmessage = (msgEvent) => {
        try {
          const msg = JSON.parse(msgEvent.data as string);
          if (msg.type === 'request' && msg.fileId === fileId) {
            this.sendFileChunks(dc, fileId, seedEntry);
          }
        } catch {
          // Not a JSON message, ignore
        }
      };
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    send({
      type: 'p2p_signal',
      targetUserId: requesterId,
      fileId,
      signal: pc.localDescription!.toJSON(),
    });
  }

  // ── Send file chunks over DataChannel ──────────────────────────

  private sendFileChunks(
    dc: RTCDataChannel,
    fileId: string,
    seedEntry: SeedEntry,
  ): void {
    const { chunks } = seedEntry;

    // First send metadata
    dc.send(
      JSON.stringify({
        type: 'metadata',
        totalChunks: chunks.length,
        fileId,
      }),
    );

    // Then send each chunk
    let chunkIndex = 0;

    const sendNextChunk = () => {
      while (chunkIndex < chunks.length) {
        if (dc.bufferedAmount > 1024 * 1024) {
          // Back-pressure: wait for buffer to drain
          setTimeout(sendNextChunk, 50);
          return;
        }

        // Send chunk header (4 bytes for index)
        const header = new ArrayBuffer(4);
        new DataView(header).setUint32(0, chunkIndex);

        // Combine header + chunk data
        const combined = new Uint8Array(4 + chunks[chunkIndex].byteLength);
        combined.set(new Uint8Array(header), 0);
        combined.set(new Uint8Array(chunks[chunkIndex]), 4);

        dc.send(combined.buffer);
        chunkIndex++;
      }

      // Signal end of transfer
      dc.send(JSON.stringify({ type: 'done', fileId }));
    };

    sendNextChunk();
  }

  // ── Handle received data from DataChannel ─────────────────────

  private handleReceivedData(fileId: string, data: unknown): void {
    const pending = this.pendingRequests.get(fileId);
    if (!pending) return;

    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'metadata') {
          pending.totalChunks = msg.totalChunks;
          pending.chunks = new Array(msg.totalChunks);
        } else if (msg.type === 'done') {
          // Transfer complete, reassemble
          const blob = reassembleChunks(pending.chunks);
          this.pendingRequests.delete(fileId);
          this.onComplete?.(fileId, blob);
          pending.resolve(blob);
        }
      } catch {
        // Not a JSON message
      }
    } else if (data instanceof ArrayBuffer) {
      // Binary chunk: first 4 bytes = chunk index
      const view = new DataView(data);
      const chunkIndex = view.getUint32(0);
      const chunkData = data.slice(4);

      pending.chunks[chunkIndex] = chunkData;
      pending.receivedChunks++;

      // Report progress
      if (pending.totalChunks > 0) {
        const progress = Math.round(
          (pending.receivedChunks / pending.totalChunks) * 100,
        );
        this.onProgress?.(fileId, progress);
      }
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────

  private cleanupConnection(connKey: string): void {
    const pc = this.connections.get(connKey);
    if (pc) {
      pc.close();
      this.connections.delete(connKey);
    }
  }

  destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    for (const pc of this.connections.values()) {
      pc.close();
    }
    this.connections.clear();
    this.files.clear();
    this.pendingRequests.clear();
  }
}

// ── Singleton instance ──────────────────────────────────────────────

let instance: P2PFileManager | null = null;

export function getP2PManager(): P2PFileManager {
  if (!instance) {
    instance = new P2PFileManager();
  }
  return instance;
}

export function destroyP2PManager(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
