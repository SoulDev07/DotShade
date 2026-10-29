import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { colord } from "@/lib/utils";

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

  public start(palette: string[] = ["#000000", "#ffffff"], loop = 0) {
    this.gif.reset();
    this.loopCount = loop;
    this.frameCount = 0;

    if (palette && palette.length > 0) {
      this.palette = palette.slice(0, 256).map((hex) => {
        const c = colord(hex).toRgb();
        return [c.r, c.g, c.b];
      });
    } else {
      this.palette = null;
    }
  }

  public addFrame(imageData: ImageData, delayMs = 100) {
    const { data } = imageData;
    const pal =
      this.palette && this.palette.length > 0
        ? this.palette
        : quantize(data, 256);

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

export function extractPaletteFromImageData(
  imageData: ImageData,
  maxColors = 8
): string[] {
  const count = Math.min(256, Math.max(2, maxColors));
  const rawPalette = quantize(imageData.data, count);
  return rawPalette.map(([r, g, b]: number[]) => colord({ r, g, b }).toHex());
}
