import { api } from '@/lib/api';
import { resolveFileMimeType } from '@/lib/file-mime';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { getSessionToken } from '@/lib/session-token';

interface AssetPresignResponse {
  uploadUrl: string;
  assetUrl: string;
}

export async function uploadImageAsset(
  file: File,
  scope: 'user_avatar' | 'community_icon',
  communityId?: string,
): Promise<string> {
  const mimeType = resolveFileMimeType(file);
  const presign = await api<AssetPresignResponse>('/api/upload/assets/presign', {
    method: 'POST',
    body: {
      scope,
      communityId,
      fileName: file.name,
      mimeType,
      fileSize: file.size,
    },
  });

  const uploadUrl = presign.uploadUrl.startsWith('http')
    ? presign.uploadUrl
    : `${getApiBaseUrl()}${presign.uploadUrl}`;

  const sessionToken = getSessionToken();
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': mimeType,
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    },
    credentials: 'include',
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed with status ${uploadResponse.status}`);
  }

  return presign.assetUrl.startsWith('http')
    ? presign.assetUrl
    : `${getApiBaseUrl()}${presign.assetUrl}`;
}
