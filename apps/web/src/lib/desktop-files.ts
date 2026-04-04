function toUint8Array(bytes: Uint8Array | number[] | ArrayBuffer): Uint8Array {
  if (bytes instanceof Uint8Array) {
    return bytes;
  }

  if (bytes instanceof ArrayBuffer) {
    return new Uint8Array(bytes);
  }

  return Uint8Array.from(bytes);
}

export async function pickDesktopFiles(
  options: { multiple?: boolean } = { multiple: true },
): Promise<File[] | null> {
  if (typeof window === 'undefined' || typeof window.zkTalkDesktop?.pickFiles !== 'function') {
    return null;
  }

  const pickedFiles = await window.zkTalkDesktop.pickFiles(options);
  if (!Array.isArray(pickedFiles) || pickedFiles.length === 0) {
    return [];
  }

  return pickedFiles.map((file) => {
    const normalizedBytes = new Uint8Array(toUint8Array(file.bytes));
    return new File(
      [normalizedBytes],
      file.name,
      {
        type: file.type ?? '',
        lastModified: file.lastModified ?? Date.now(),
      },
    );
  });
}
