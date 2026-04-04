import { isImageFileLike } from '@/lib/file-mime';

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('File preview read returned a non-string result.'));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error('File preview read failed.'));
    };

    reader.readAsDataURL(file);
  });
}

export async function createFilePreviewUrl(file: File): Promise<string | null> {
  if (!isImageFileLike(file)) {
    return null;
  }

  try {
    return URL.createObjectURL(file);
  } catch (error) {
    console.warn('Falling back to FileReader preview for attachment.', {
      fileName: file.name,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    return await readFileAsDataUrl(file);
  } catch (error) {
    console.warn('Attachment preview could not be generated.', {
      fileName: file.name,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function revokeFilePreviewUrl(previewUrl: string | null | undefined): void {
  if (!previewUrl || !previewUrl.startsWith('blob:')) {
    return;
  }

  URL.revokeObjectURL(previewUrl);
}
