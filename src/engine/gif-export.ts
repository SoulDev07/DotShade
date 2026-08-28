/**
 * Lightweight, zero-dependency client-side GIF89a encoder with LZW compression.
 * Enables instant animated GIF export directly in the browser from Canvas / Video frames.
 */

export interface GifFrameOptions {
  delay?: number; // Delay in milliseconds (e.g. 50ms = 20fps)
  palette?: number[][]; // [ [r,g,b], ... ] max 256 colors
}

export class ClientGifEncoder {
  private width: number;
  private height: number;
  private buffer: number[] = [];
  private globalPalette: number[][] = [];
  private colorDepth = 8;
  private loopCount = 0; // 0 = infinite loop

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * Start encoding GIF stream
   */
  public start(palette: string[] = ["#000000", "#ffffff"], loop = 0) {
    this.buffer = [];
    this.loopCount = loop;

    // Convert hex palette to RGB numbers
    this.globalPalette = palette.slice(0, 256).map((hex) => {
      const h = hex.replace("#", "");
      return [
        parseInt(h.slice(0, 2), 16) || 0,
        parseInt(h.slice(2, 4), 16) || 0,
        parseInt(h.slice(4, 6), 16) || 0,
      ];
    });

    // Pad palette to power of 2 (at least 2, max 256)
    while (
      this.globalPalette.length < 2 ||
      (this.globalPalette.length & (this.globalPalette.length - 1)) !== 0
    ) {
      this.globalPalette.push([0, 0, 0]);
    }

    this.writeHeader();
    this.writeLogicalScreenDescriptor();
    this.writeNetscapeApplicationExtension();
  }

  private writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      this.buffer.push(str.charCodeAt(i));
    }
  }

  private writeShort(val: number) {
    this.buffer.push(val & 0xff);
    this.buffer.push((val >> 8) & 0xff);
  }

  private writeHeader() {
    this.writeString("GIF89a");
  }

  private writeLogicalScreenDescriptor() {
    this.writeShort(this.width);
    this.writeShort(this.height);

    const paletteSize = this.globalPalette.length;
    let sizeBits = 0;
    while (1 << (sizeBits + 1) < paletteSize) {
      sizeBits++;
    }

    const packed = 0x80 | 0x70 | sizeBits; // Global color table flag + 8-bit depth + table size
    this.buffer.push(packed);
    this.buffer.push(0); // Background color index
    this.buffer.push(0); // Pixel aspect ratio

    // Write Global Color Table
    for (let i = 0; i < this.globalPalette.length; i++) {
      this.buffer.push(this.globalPalette[i][0]);
      this.buffer.push(this.globalPalette[i][1]);
      this.buffer.push(this.globalPalette[i][2]);
    }
  }

  private writeNetscapeApplicationExtension() {
    this.buffer.push(0x21); // Extension Introducer
    this.buffer.push(0xff); // Application Extension Label
    this.buffer.push(11); // Block Size
    this.writeString("NETSCAPE2.0");
    this.buffer.push(3); // Sub-block Size
    this.buffer.push(1); // Loop sub-block ID
    this.writeShort(this.loopCount); // Loop count (0 = forever)
    this.buffer.push(0); // Block Terminator
  }

  /**
   * Add a frame from ImageData (RGBA)
   */
  public addFrame(imageData: ImageData, delayMs = 100) {
    const data = imageData.data;
    const indexedPixels: number[] = [];

    // Map each RGBA pixel to nearest palette index
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      let bestIdx = 0;
      let minDiff = Infinity;
      for (let p = 0; p < this.globalPalette.length; p++) {
        const pal = this.globalPalette[p];
        const diff =
          (r - pal[0]) * (r - pal[0]) +
          (g - pal[1]) * (g - pal[1]) +
          (b - pal[2]) * (b - pal[2]);
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = p;
        }
      }
      indexedPixels.push(bestIdx);
    }

    // Write Graphic Control Extension
    this.buffer.push(0x21); // Extension
    this.buffer.push(0xf9); // Graphic Control Label
    this.buffer.push(4); // Block Size
    this.buffer.push(0x00); // Packed fields (no transparency)
    const delayHundredths = Math.max(1, Math.round(delayMs / 10));
    this.writeShort(delayHundredths);
    this.buffer.push(0); // Transparent color index
    this.buffer.push(0); // Terminator

    // Write Image Descriptor
    this.buffer.push(0x2c); // Image Separator
    this.writeShort(0); // Left
    this.writeShort(0); // Top
    this.writeShort(this.width);
    this.writeShort(this.height);
    this.buffer.push(0); // No local color table

    // LZW Encode image data
    this.lzwEncode(indexedPixels);
  }

  private lzwEncode(pixels: number[]) {
    let minCodeSize = 2;
    while (1 << minCodeSize < this.globalPalette.length) {
      minCodeSize++;
    }
    this.buffer.push(minCodeSize);

    const clearCode = 1 << minCodeSize;
    const endCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = clearCode + 2;

    const dictionary = new Map<string, number>();
    const resetDictionary = () => {
      dictionary.clear();
      for (let i = 0; i < clearCode; i++) {
        dictionary.set(String(i), i);
      }
      codeSize = minCodeSize + 1;
      nextCode = clearCode + 2;
    };

    resetDictionary();

    let bitBuffer = 0;
    let bitCount = 0;
    const packet: number[] = [];

    const writeBits = (code: number, size: number) => {
      bitBuffer |= code << bitCount;
      bitCount += size;

      while (bitCount >= 8) {
        packet.push(bitBuffer & 0xff);
        bitBuffer >>= 8;
        bitCount -= 8;

        if (packet.length === 254) {
          this.buffer.push(packet.length);
          for (let i = 0; i < packet.length; i++) {
            this.buffer.push(packet[i]);
          }
          packet.length = 0;
        }
      }
    };

    writeBits(clearCode, codeSize);

    let prefix = String(pixels[0]);
    for (let i = 1; i < pixels.length; i++) {
      const current = String(pixels[i]);
      const combined = prefix + "," + current;

      if (dictionary.has(combined)) {
        prefix = combined;
      } else {
        writeBits(dictionary.get(prefix)!, codeSize);

        if (nextCode < 4096) {
          dictionary.set(combined, nextCode++);
          if (nextCode > 1 << codeSize && codeSize < 12) {
            codeSize++;
          }
        } else {
          writeBits(clearCode, codeSize);
          resetDictionary();
        }

        prefix = current;
      }
    }

    writeBits(dictionary.get(prefix)!, codeSize);
    writeBits(endCode, codeSize);

    if (bitCount > 0) {
      packet.push(bitBuffer & 0xff);
    }

    if (packet.length > 0) {
      this.buffer.push(packet.length);
      for (let i = 0; i < packet.length; i++) {
        this.buffer.push(packet[i]);
      }
    }

    this.buffer.push(0); // Sub-block Terminator
  }

  /**
   * Finalize and export Uint8Array Blob
   */
  public finish(): Blob {
    this.buffer.push(0x3b); // Trailer
    return new Blob([new Uint8Array(this.buffer)], { type: "image/gif" });
  }
}
