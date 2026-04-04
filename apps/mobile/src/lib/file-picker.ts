import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { api, ApiError } from './api';
import { API_ORIGIN } from './network-config';
import { getToken } from './storage';
import {
  deleteSimulatorHarnessFile,
  getSimulatorHarnessPath,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from './simulator-harness';

// ---------------------------------------------------------------------------
// File picker and upload helpers
// ---------------------------------------------------------------------------

const RAW_UPLOAD_CONTENT_TYPE = 'application/octet-stream';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

interface SimulatorFilePickerAction {
  picker?: 'image' | 'camera' | 'document';
  fileName?: string;
  mimeType?: string;
  base64?: string;
  size?: number;
}

const SIMULATOR_TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sM1n8kAAAAASUVORK5CYII=';

function sanitizeSimulatorFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function estimateBase64Size(base64: string): number {
  const paddingMatch = base64.match(/=+$/);
  const padding = paddingMatch ? paddingMatch[0].length : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

async function readSimulatorHarnessPickedFile(
  picker: 'image' | 'camera' | 'document',
): Promise<PickedFile | null> {
  if (!isSimulatorHarnessEnabled) {
    return null;
  }

  const action = await readSimulatorHarnessJson<SimulatorFilePickerAction>(
    'dev-file-picker-action.json',
  );
  if (!action || action.picker !== picker) {
    return null;
  }

  const fileName =
    action.fileName ??
    (picker === 'camera'
      ? `simulator-camera-${Date.now()}.png`
      : picker === 'document'
        ? `simulator-document-${Date.now()}.pdf`
        : `simulator-image-${Date.now()}.png`);
  const mimeType = action.mimeType ?? guessMimeType(fileName);
  const base64 = action.base64 ?? SIMULATOR_TINY_PNG_BASE64;
  const targetPath = getSimulatorHarnessPath(
    `simulator-picked-${Date.now()}-${sanitizeSimulatorFileName(fileName)}`,
  );

  if (!targetPath) {
    throw new Error('Simulator harness path is not available for the file picker');
  }

  await LegacyFileSystem.writeAsStringAsync(targetPath, base64, {
    encoding: LegacyFileSystem.EncodingType.Base64,
  });
  await deleteSimulatorHarnessFile('dev-file-picker-action.json');

  return {
    uri: targetPath,
    name: fileName,
    mimeType,
    size: action.size ?? estimateBase64Size(base64),
  };
}

/**
 * Pick an image or video from the device gallery.
 */
export async function pickImage(
  options?: { allowsVideo?: boolean },
): Promise<PickedFile | null> {
  const simulatedFile = await readSimulatorHarnessPickedFile('image');
  if (simulatedFile) {
    return simulatedFile;
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Camera roll permission is required to select images');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: options?.allowsVideo
      ? ImagePicker.MediaTypeOptions.All
      : ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsMultipleSelection: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'image.jpg';
  const mimeType = asset.mimeType ?? guessMimeType(fileName);

  return {
    uri: asset.uri,
    name: fileName,
    mimeType,
    size: asset.fileSize ?? 0,
  };
}

/**
 * Take a photo with the camera.
 */
export async function takePhoto(): Promise<PickedFile | null> {
  const simulatedFile = await readSimulatorHarnessPickedFile('camera');
  if (simulatedFile) {
    return simulatedFile;
  }

  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Camera permission is required to take photos');
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const fileName = asset.fileName ?? `photo_${Date.now()}.jpg`;
  const mimeType = asset.mimeType ?? 'image/jpeg';

  return {
    uri: asset.uri,
    name: fileName,
    mimeType,
    size: asset.fileSize ?? 0,
  };
}

/**
 * Pick a document/file of any type.
 */
export async function pickDocument(): Promise<PickedFile | null> {
  const simulatedFile = await readSimulatorHarnessPickedFile('document');
  if (simulatedFile) {
    return simulatedFile;
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];

  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'application/octet-stream',
    size: asset.size ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Upload flow: presign -> upload -> attach
// ---------------------------------------------------------------------------

interface PresignResponse {
  uploadSessionId: string;
  uploadUrl: string;
  storageKey: string;
  uploadMode?: 'single' | 'multipart';
  partSize?: number | null;
  partCount?: number;
}

interface AssetPresignResponse extends PresignResponse {
  assetUrl: string;
}

/**
 * Upload a picked file using the presign flow.
 * 1. Get a presigned upload URL from the server
 * 2. Upload the file directly to the storage (S3/MinIO)
 * 3. Return the storage key for attaching to a message
 */
export async function uploadFile(
  file: PickedFile,
  target: { channelId?: string; conversationId?: string },
  onProgress?: (progress: number) => void,
): Promise<{ uploadSessionId: string; storageKey: string; fileName: string; mimeType: string; fileSize: number }> {
  // Step 1: Get presigned URL
  const presign = await api<PresignResponse>('/api/upload/presign', {
    method: 'POST',
    body: {
      ...target,
      fileName: file.name,
      mimeType: file.mimeType,
      fileSize: file.size,
    },
  });

  // Step 2: Upload file to presigned URL
  // The server may return a relative or absolute URL. Ensure we have a full URL.
  const uploadUrl = presign.uploadUrl.startsWith('http')
    ? presign.uploadUrl
    : `${API_ORIGIN}${presign.uploadUrl}`;

  // Use XMLHttpRequest with FormData for React Native file upload compatibility.
  // Plain object { uri, type, name } only works as a FormData part in RN.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded / event.total);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        if (xhr.status === 429) {
          reject(new ApiError(429, 'Too many requests', 'RATE_LIMITED'));
          return;
        }

        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', RAW_UPLOAD_CONTENT_TYPE);

    // React Native XHR supports sending a { uri, type, name } blob-like object
    // directly without FormData for PUT requests.
    const body = { uri: file.uri, type: file.mimeType, name: file.name };
    xhr.send(body as unknown as BodyInit);
  });

  await api(`/api/upload/sessions/${presign.uploadSessionId}/complete`, {
    method: 'POST',
    body: {
      parts: [{ partNumber: 1, etag: 'single-part' }],
    },
  });

  return {
    uploadSessionId: presign.uploadSessionId,
    storageKey: presign.storageKey,
    fileName: file.name,
    mimeType: file.mimeType,
    fileSize: file.size,
  };
}

export async function uploadImageAsset(
  file: PickedFile,
  scope: 'user_avatar' | 'community_icon',
  communityId?: string,
): Promise<string> {
  const presign = await api<AssetPresignResponse>('/api/upload/assets/presign', {
    method: 'POST',
    body: {
      scope,
      communityId,
      fileName: file.name,
      mimeType: file.mimeType,
      fileSize: file.size,
    },
  });

  const uploadUrl = presign.uploadUrl.startsWith('http')
    ? presign.uploadUrl
    : `${API_ORIGIN}${presign.uploadUrl}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        if (xhr.status === 429) {
          reject(new ApiError(429, 'Too many requests', 'RATE_LIMITED'));
          return;
        }

        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.mimeType);

    xhr.send({ uri: file.uri, type: file.mimeType, name: file.name } as unknown as BodyInit);
  });

  return presign.assetUrl.startsWith('http')
    ? presign.assetUrl
    : `${API_ORIGIN}${presign.assetUrl}`;
}

/**
 * Register an uploaded attachment with a message.
 */
export async function attachToMessage(
  messageId: string,
  attachment: {
    uploadSessionId: string;
    storageKey: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    width?: number;
    height?: number;
  },
): Promise<void> {
  await api('/api/upload/attachments', {
    method: 'POST',
    body: {
      messageId,
      ...attachment,
    },
  });
}

export async function attachToDmMessage(
  dmMessageId: string,
  attachment: {
    uploadSessionId: string;
    storageKey: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    width?: number;
    height?: number;
  },
): Promise<void> {
  await api('/api/upload/attachments', {
    method: 'POST',
    body: {
      dmMessageId,
      ...attachment,
    },
  });
}

export function getAttachmentFileUrl(attachmentId: string): string {
  return `${API_ORIGIN}/api/upload/attachments/${attachmentId}/file`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function guessMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    zip: 'application/zip',
  };
  return mimeMap[ext ?? ''] ?? 'application/octet-stream';
}
