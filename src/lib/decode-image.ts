/** Decodes an image URL to an ImageBitmap once. fetch() first, `<img>` as a cross-origin fallback. */
export async function decodeImageUrl(url: string): Promise<ImageBitmap> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await createImageBitmap(await res.blob());
  } catch {
    const img = new Image();
    if (/^https?:/.test(url)) img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    return createImageBitmap(img);
  }
}
