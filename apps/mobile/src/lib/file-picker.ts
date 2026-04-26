import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { api, ApiError } from './api';
import { API_ORIGIN } from './network-config';
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
 * Pick MULTIPLE images from the device gallery in one shot. Used by the
 * bulk business-card import flow.
 */
export async function pickImagesMulti(): Promise<PickedFile[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Camera roll permission is required to select images');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsMultipleSelection: true,
    selectionLimit: 0,
  });

  if (result.canceled || result.assets.length === 0) {
    return [];
  }

  return result.assets.map((asset) => {
    const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'image.jpg';
    const mimeType = asset.mimeType ?? guessMimeType(fileName);
    return {
      uri: asset.uri,
      name: fileName,
      mimeType,
      size: asset.fileSize ?? 0,
    };
  });
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
    mimeType: asset.mimeType ?? guessMimeType(asset.name),
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

interface MultipartUploadPartUrl {
  partNumber: number;
  uploadUrl: string;
}

interface MultipartUploadPartUrlsResponse {
  sessionId: string;
  parts: MultipartUploadPartUrl[];
}

function resolveUploadUrl(uploadUrl: string): string {
  return uploadUrl.startsWith('http')
    ? uploadUrl
    : `${API_ORIGIN}${uploadUrl}`;
}

function getMultipartUploadEtag(response: Response): string {
  const etag = response.headers.get('etag');
  if (!etag) {
    throw new Error('Multipart upload did not return an ETag');
  }
  return etag;
}

function getMultipartUploadEtagFromHeaders(headers: Record<string, string>): string {
  const etag = headers.etag ?? headers.ETag;
  if (!etag) {
    throw new Error('Multipart upload did not return an ETag');
  }
  return etag;
}

async function uploadSinglePartFile(
  file: PickedFile,
  uploadUrl: string,
  onProgress?: (progress: number) => void,
): Promise<void> {
  const uploadTask = LegacyFileSystem.createUploadTask(
    uploadUrl,
    file.uri,
    {
      httpMethod: 'PUT',
      uploadType: LegacyFileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': file.mimeType || RAW_UPLOAD_CONTENT_TYPE,
      },
    },
    (progressEvent) => {
      if (!onProgress || !progressEvent.totalBytesExpectedToSend) {
        return;
      }
      onProgress(progressEvent.totalBytesSent / progressEvent.totalBytesExpectedToSend);
    },
  );

  const result = await uploadTask.uploadAsync();
  if (!result) {
    throw new Error('Upload failed');
  }
  if (result.status === 429) {
    throw new ApiError(429, 'Too many requests', 'RATE_LIMITED');
  }
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed with status ${result.status}`);
  }
}

async function uploadMultipartFile(
  file: PickedFile,
  presign: PresignResponse,
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (!presign.partSize || !presign.partCount || presign.partCount < 1) {
    throw new Error('Multipart upload is missing part metadata');
  }

  const { parts } = await api<MultipartUploadPartUrlsResponse>(
    `/api/upload/sessions/${presign.uploadSessionId}/parts`,
    {
      method: 'POST',
      body: {
        partNumbers: Array.from({ length: presign.partCount }, (_, index) => index + 1),
      },
    },
  );

  const nativeFile = new ExpoFile(file.uri);
  const completedParts: Array<{ partNumber: number; etag: string }> = [];
  for (const part of parts) {
    const start = (part.partNumber - 1) * presign.partSize;
    const end = Math.min(start + presign.partSize, file.size);
    const chunkFile = nativeFile.slice(start, end, file.mimeType || RAW_UPLOAD_CONTENT_TYPE);
    const chunkBase64 = await chunkFile.base64();
    const chunkUri = `${LegacyFileSystem.cacheDirectory}multipart-${presign.uploadSessionId}-${part.partNumber}`;

    await LegacyFileSystem.writeAsStringAsync(chunkUri, chunkBase64, {
      encoding: LegacyFileSystem.EncodingType.Base64,
    });

    let uploadResult: Awaited<ReturnType<typeof LegacyFileSystem.uploadAsync>>;
    try {
      uploadResult = await LegacyFileSystem.uploadAsync(resolveUploadUrl(part.uploadUrl), chunkUri, {
        httpMethod: 'PUT',
        uploadType: LegacyFileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Content-Type': file.mimeType || RAW_UPLOAD_CONTENT_TYPE,
        },
      });
    } finally {
      await LegacyFileSystem.deleteAsync(chunkUri, { idempotent: true }).catch(() => undefined);
    }

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      throw new Error(`Upload failed with status ${uploadResult.status}`);
    }

    completedParts.push({
      partNumber: part.partNumber,
      etag: getMultipartUploadEtagFromHeaders(uploadResult.headers),
    });
    onProgress?.(part.partNumber / presign.partCount);
  }

  await api(`/api/upload/sessions/${presign.uploadSessionId}/complete`, {
    method: 'POST',
    body: {
      parts: completedParts,
    },
  });
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
  const presign = await api<PresignResponse>('/api/upload/presign', {
    method: 'POST',
    body: {
      ...target,
      fileName: file.name,
      mimeType: file.mimeType,
      fileSize: file.size,
    },
  });

  try {
    if (presign.uploadMode === 'multipart') {
      await uploadMultipartFile(file, presign, onProgress);
    } else {
      await uploadSinglePartFile(file, resolveUploadUrl(presign.uploadUrl), onProgress);
      await api(`/api/upload/sessions/${presign.uploadSessionId}/complete`, {
        method: 'POST',
        body: {
          parts: [{ partNumber: 1, etag: 'single-part' }],
        },
      });
    }
  } catch (error) {
    try {
      await api(`/api/upload/sessions/${presign.uploadSessionId}/abort`, {
        method: 'POST',
      });
    } catch {
      // Best effort cleanup for partially uploaded sessions.
    }
    throw error;
  }

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

  const uploadResult = await LegacyFileSystem.uploadAsync(uploadUrl, file.uri, {
    httpMethod: 'PUT',
    uploadType: LegacyFileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': file.mimeType,
    },
  });

  if (uploadResult.status === 429) {
    throw new ApiError(429, 'Too many requests', 'RATE_LIMITED');
  }
  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(`Upload failed with status ${uploadResult.status}`);
  }

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
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    json: 'application/json',
    pdf: 'application/pdf',
    dmg: 'application/x-apple-diskimage',
    iso: 'application/x-iso9660-image',
    pkg: 'application/vnd.apple.installer+xml',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    tgz: 'application/gzip',
    bz2: 'application/x-bzip2',
    xz: 'application/x-xz',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    exe: 'application/vnd.microsoft.portable-executable',
    msi: 'application/x-msi',
    apk: 'application/vnd.android.package-archive',
  };
  return mimeMap[ext ?? ''] ?? 'application/octet-stream';
}
