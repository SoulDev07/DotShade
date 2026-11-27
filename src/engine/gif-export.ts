import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { parseHex, rgbToHex } from "@/lib/color";

export class ClientGifEncoder {
  private gif: ReturnType<typeof GIFEncoder>;
  private width: number;
  private height: number;
  private palette: number[][] | null = null;
  private loopCount = 0;
  private frameCount = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.gif = GIFEncoder();
  }

  /**
   * @param palette Fixed palette shared by all frames. Pass `null` to quantize once from the
   * first frame and reuse that palette for every later frame (avoids per-frame flicker).
   */
  public start(palette: string[] | null, loop = 0) {
    this.gif.reset();
    this.loopCount = loop;
    this.frameCount = 0;

    if (palette && palette.length > 0) {
      this.palette = palette.slice(0, 256).map((hex) => parseHex(hex));
    } else {
      this.palette = null;
    }
  }

  public addFrame(imageData: ImageData, delayMs = 100) {
    const { data } = imageData;
    if (!this.palette || this.palette.length === 0) this.palette = quantize(data, 256);
    const pal = this.palette;

    const index = applyPalette(data, pal);

    this.gif.writeFrame(index, this.width, this.height, {
      palette: pal,
      delay: delayMs,
      repeat: this.frameCount === 0 ? this.loopCount : undefined,
    });
    this.frameCount++;
  }

  public finish(): Blob {
    this.gif.finish();
    const bytes = this.gif.bytes();
    return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "image/gif" });
  }
}

export function extractPaletteFromImageData(imageData: ImageData, maxColors = 8): string[] {
  const count = Math.min(256, Math.max(2, maxColors));
  const rawPalette = quantize(imageData.data, count);
  return rawPalette.map(([r, g, b]: number[]) => rgbToHex(r, g, b));
}
