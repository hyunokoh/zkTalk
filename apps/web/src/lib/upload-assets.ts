import { api, assertOkResponse } from '@/lib/api';
import { resolveFileMimeType } from '@/lib/file-mime';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { createUploadRequestInit, resolveUploadUrl } from '@/lib/upload-request';

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

  const uploadUrl = resolveUploadUrl(presign.uploadUrl);

  const uploadResponse = await fetch(uploadUrl, {
    ...createUploadRequestInit(presign.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': mimeType,
      },
    }),
  });

  await assertOkResponse(uploadResponse, `Upload failed with status ${uploadResponse.status}`);

  return presign.assetUrl.startsWith('http')
    ? presign.assetUrl
    : `${getApiBaseUrl()}${presign.assetUrl}`;
}
