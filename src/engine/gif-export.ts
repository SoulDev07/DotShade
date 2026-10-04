

/**
 * Client-side Animated GIF89a Encoder:
 * Pure TypeScript implementation producing valid binary GIF files directly in the browser
 * without external dependencies, Node.js binaries, or WebAssembly overhead.
 * Supports arbitrary palettes, Netscape 2.0 infinite loops, and variable frame delays.
 */

export interface GifFrameOptions {
  /** Frame duration in milliseconds (default: 100ms) */
  delay?: number; 
  /** Optional custom local palette */
  palette?: number[][]; 
}

/**
 * GIF89a stream encoder with variable-length LZW compression and Netscape 2.0 loop extension.
 */
export class ClientGifEncoder {
  private width: number;
  private height: number;
  private buffer: number[] = [];
  private globalPalette: number[][] = [];
  private colorDepth = 8;
  private loopCount = 0; 

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * Initializes the GIF stream header, logical screen descriptor, and global color table.
   *
   * @param palette - Array of hex colors for the global color table (up to 256 colors)
   * @param loop - Loop count (0 = infinite loop)
   */
  public start(palette: string[] = ["#000000", "#ffffff"], loop = 0) {
    this.buffer = [];
    this.loopCount = loop;

    this.globalPalette = palette.slice(0, 256).map((hex) => {
      const h = hex.replace("#", "");
      return [
        parseInt(h.slice(0, 2), 16) || 0,
        parseInt(h.slice(2, 4), 16) || 0,
        parseInt(h.slice(4, 6), 16) || 0,
      ];
    });

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

    const packed = 0x80 | 0x70 | sizeBits; 
    this.buffer.push(packed);
    this.buffer.push(0); 
    this.buffer.push(0); 

    for (let i = 0; i < this.globalPalette.length; i++) {
      this.buffer.push(this.globalPalette[i][0]);
      this.buffer.push(this.globalPalette[i][1]);
      this.buffer.push(this.globalPalette[i][2]);
    }
  }

  private writeNetscapeApplicationExtension() {
    // Netscape 2.0 application extension for looping
    this.buffer.push(0x21); // Extension introducer
    this.buffer.push(0xff); // Application extension label
    this.buffer.push(11); // Block size
    this.writeString("NETSCAPE2.0");
    this.buffer.push(3); // Sub-block size
    this.buffer.push(1); // Loop sub-block ID
    this.writeShort(this.loopCount); // 0 = loop forever
    this.buffer.push(0); // Block terminator
  }

  /**
   * Encodes a single frame from raw ImageData into the GIF stream.
   * Maps RGBA pixels to the closest global palette color index, writes the Graphic Control Extension,
   * writes the Image Descriptor block, and executes variable-length LZW raster data compression.
   *
   * @param imageData - Raw RGBA image data for this frame
   * @param delayMs - Frame duration in milliseconds (default: 100ms)
   */
  public addFrame(imageData: ImageData, delayMs = 100) {
    const data = imageData.data;
    const indexedPixels: number[] = [];

    // Map each RGBA pixel to the closest palette color index in Euclidean RGB space
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

    // Graphic Control Extension (0x21 0xF9): specifies frame timing and disposal
    this.buffer.push(0x21); // Extension Introducer
    this.buffer.push(0xf9); // Graphic Control Label
    this.buffer.push(4); // Block size (always 4 bytes)
    this.buffer.push(0x00); // Packed fields (no transparency, no disposal method)
    const delayHundredths = Math.max(1, Math.round(delayMs / 10)); // Delay in 1/100ths of a second
    this.writeShort(delayHundredths);
    this.buffer.push(0); // Transparent color index
    this.buffer.push(0); // Block terminator

    // Image Descriptor (0x2C): defines local frame geometry
    this.buffer.push(0x2c); // Image separator
    this.writeShort(0); // Left position (0)
    this.writeShort(0); // Top position (0)
    this.writeShort(this.width);
    this.writeShort(this.height);
    this.buffer.push(0); // Packed fields (no local color table)

    // LZW compress raster indices and append data sub-blocks
    this.lzwEncode(indexedPixels);
  }

  /**
   * Compresses stream of palette color indices using variable-length LZW compression.
   * Emits sub-blocks of up to 254 bytes terminated with a null block (0x00).
   */
  private lzwEncode(pixels: number[]) {
    // Determine minimum code size based on palette length
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

    // Helper to push variable-bit-width codes into 8-bit byte packets
    const writeBits = (code: number, size: number) => {
      bitBuffer |= code << bitCount;
      bitCount += size;

      while (bitCount >= 8) {
        packet.push(bitBuffer & 0xff);
        bitBuffer >>= 8;
        bitCount -= 8;

        // Flush sub-block when reaching maximum sub-block size (254 bytes)
        if (packet.length === 254) {
          this.buffer.push(packet.length);
          for (let i = 0; i < packet.length; i++) {
            this.buffer.push(packet[i]);
          }
          packet.length = 0;
        }
      }
    };

    // Output initial Clear Code
    writeBits(clearCode, codeSize);

    let prefix = String(pixels[0]);
    for (let i = 1; i < pixels.length; i++) {
      const current = String(pixels[i]);
      const combined = prefix + "," + current;

      if (dictionary.has(combined)) {
        prefix = combined;
      } else {
        writeBits(dictionary.get(prefix)!, codeSize);

        // Expand dictionary up to 12-bit max (4096 entries)
        if (nextCode < 4096) {
          dictionary.set(combined, nextCode++);
          if (nextCode > 1 << codeSize && codeSize < 12) {
            codeSize++;
          }
        } else {
          // Dictionary full: reset and emit Clear Code
          writeBits(clearCode, codeSize);
          resetDictionary();
        }

        prefix = current;
      }
    }

    // Flush remaining prefix and emit End of Information code
    writeBits(dictionary.get(prefix)!, codeSize);
    writeBits(endCode, codeSize);

    // Flush remaining buffered bits
    if (bitCount > 0) {
      packet.push(bitBuffer & 0xff);
    }

    // Flush final packet block
    if (packet.length > 0) {
      this.buffer.push(packet.length);
      for (let i = 0; i < packet.length; i++) {
        this.buffer.push(packet[i]);
      }
    }

    // Terminate raster data sub-blocks with 0-length byte
    this.buffer.push(0); 
  }

  /**
   * Finalizes the GIF stream by appending the GIF trailer byte (0x3B ';')
   * and packaging the bytes into an image/gif Blob.
   *
   * @returns Binary Blob formatted as image/gif
   */
  public finish(): Blob {
    this.buffer.push(0x3b); // GIF Trailer
    return new Blob([new Uint8Array(this.buffer)], { type: "image/gif" });
  }
}
