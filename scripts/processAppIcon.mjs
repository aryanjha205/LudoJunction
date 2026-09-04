import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'src/client/assets');
const sourceIconPath = path.join(rootDir, 'icon.png');

if (!fs.existsSync(sourceIconPath)) {
    console.error('source icon.png not found at:', sourceIconPath);
    process.exit(1);
}

function crc32(buf) {
    let c = -1;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let p = n;
        for (let k = 0; k < 8; k++) {
            p = ((p & 1) ? (0xEDB88320 ^ (p >>> 1)) : (p >>> 1));
        }
        table[n] = p;
    }
    for (let i = 0; i < buf.length; i++) {
        c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xFF];
    }
    return (c ^ (-1)) >>> 0;
}

function writeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const checksum = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(checksum, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function parsePNG(buf) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const bitDepth = buf[24];
    const colorType = buf[25]; // 2 = RGB, 6 = RGBA

    const idatChunks = [];
    let offset = 8;
    while (offset < buf.length) {
        const length = buf.readUInt32BE(offset);
        const type = buf.toString('ascii', offset + 4, offset + 8);
        if (type === 'IDAT') {
            idatChunks.push(buf.subarray(offset + 8, offset + 8 + length));
        }
        offset += 12 + length;
    }

    const compressed = Buffer.concat(idatChunks);
    const decompressed = zlib.inflateSync(compressed);

    const bpp = colorType === 6 ? 4 : 3;
    const srcRowSize = width * bpp + 1;

    // Unfilter PNG scanlines (sub/up/average/paeth filters if any)
    const rawPixels = Buffer.alloc(width * height * 4); // convert to RGBA

    function paeth(a, b, c) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        if (pa <= pb && pa <= pc) return a;
        if (pb <= pc) return b;
        return c;
    }

    for (let y = 0; y < height; y++) {
        const filter = decompressed[y * srcRowSize];
        const rowStart = y * srcRowSize + 1;

        for (let x = 0; x < width; x++) {
            const pxOffset = rowStart + x * bpp;
            const targetOffset = (y * width + x) * 4;

            let r = decompressed[pxOffset];
            let g = decompressed[pxOffset + 1];
            let b = decompressed[pxOffset + 2];
            let a = colorType === 6 ? decompressed[pxOffset + 3] : 255;

            // Apply filter restoration
            const leftOffset = x > 0 ? pxOffset - bpp : -1;
            const aboveOffset = y > 0 ? (y - 1) * srcRowSize + 1 + x * bpp : -1;
            const aboveLeftOffset = (x > 0 && y > 0) ? (y - 1) * srcRowSize + 1 + (x - 1) * bpp : -1;

            if (filter === 1) { // Sub
                if (x > 0) {
                    const prevOffset = (y * width + (x - 1)) * 4;
                    r = (r + rawPixels[prevOffset]) & 0xFF;
                    g = (g + rawPixels[prevOffset + 1]) & 0xFF;
                    b = (b + rawPixels[prevOffset + 2]) & 0xFF;
                    if (colorType === 6) a = (a + rawPixels[prevOffset + 3]) & 0xFF;
                }
            } else if (filter === 2) { // Up
                if (y > 0) {
                    const prevOffset = ((y - 1) * width + x) * 4;
                    r = (r + rawPixels[prevOffset]) & 0xFF;
                    g = (g + rawPixels[prevOffset + 1]) & 0xFF;
                    b = (b + rawPixels[prevOffset + 2]) & 0xFF;
                    if (colorType === 6) a = (a + rawPixels[prevOffset + 3]) & 0xFF;
                }
            } else if (filter === 3) { // Average
                const leftR = x > 0 ? rawPixels[(y * width + (x - 1)) * 4] : 0;
                const aboveR = y > 0 ? rawPixels[((y - 1) * width + x) * 4] : 0;
                r = (r + Math.floor((leftR + aboveR) / 2)) & 0xFF;

                const leftG = x > 0 ? rawPixels[(y * width + (x - 1)) * 4 + 1] : 0;
                const aboveG = y > 0 ? rawPixels[((y - 1) * width + x) * 4 + 1] : 0;
                g = (g + Math.floor((leftG + aboveG) / 2)) & 0xFF;

                const leftB = x > 0 ? rawPixels[(y * width + (x - 1)) * 4 + 2] : 0;
                const aboveB = y > 0 ? rawPixels[((y - 1) * width + x) * 4 + 2] : 0;
                b = (b + Math.floor((leftB + aboveB) / 2)) & 0xFF;

                if (colorType === 6) {
                    const leftA = x > 0 ? rawPixels[(y * width + (x - 1)) * 4 + 3] : 0;
                    const aboveA = y > 0 ? rawPixels[((y - 1) * width + x) * 4 + 3] : 0;
                    a = (a + Math.floor((leftA + aboveA) / 2)) & 0xFF;
                }
            } else if (filter === 4) { // Paeth
                const leftR = x > 0 ? rawPixels[(y * width + (x - 1)) * 4] : 0;
                const aboveR = y > 0 ? rawPixels[((y - 1) * width + x) * 4] : 0;
                const aboveLeftR = (x > 0 && y > 0) ? rawPixels[((y - 1) * width + (x - 1)) * 4] : 0;
                r = (r + paeth(leftR, aboveR, aboveLeftR)) & 0xFF;

                const leftG = x > 0 ? rawPixels[(y * width + (x - 1)) * 4 + 1] : 0;
                const aboveG = y > 0 ? rawPixels[((y - 1) * width + x) * 4 + 1] : 0;
                const aboveLeftG = (x > 0 && y > 0) ? rawPixels[((y - 1) * width + (x - 1)) * 4 + 1] : 0;
                g = (g + paeth(leftG, aboveG, aboveLeftG)) & 0xFF;

                const leftB = x > 0 ? rawPixels[(y * width + (x - 1)) * 4 + 2] : 0;
                const aboveB = y > 0 ? rawPixels[((y - 1) * width + x) * 4 + 2] : 0;
                const aboveLeftB = (x > 0 && y > 0) ? rawPixels[((y - 1) * width + (x - 1)) * 4 + 2] : 0;
                b = (b + paeth(leftB, aboveB, aboveLeftB)) & 0xFF;

                if (colorType === 6) {
                    const leftA = x > 0 ? rawPixels[(y * width + (x - 1)) * 4 + 3] : 0;
                    const aboveA = y > 0 ? rawPixels[((y - 1) * width + x) * 4 + 3] : 0;
                    const aboveLeftA = (x > 0 && y > 0) ? rawPixels[((y - 1) * width + (x - 1)) * 4 + 3] : 0;
                    a = (a + paeth(leftA, aboveA, aboveLeftA)) & 0xFF;
                }
            }

            rawPixels[targetOffset] = r;
            rawPixels[targetOffset + 1] = g;
            rawPixels[targetOffset + 2] = b;
            rawPixels[targetOffset + 3] = a;
        }
    }

    return { width, height, pixels: rawPixels };
}

function resizeRGBA(src, targetWidth, targetHeight) {
    const { width: srcW, height: srcH, pixels: srcPixels } = src;
    const dstRowSize = targetWidth * 4 + 1;
    const rawBuffer = Buffer.alloc(dstRowSize * targetHeight);

    const scaleX = srcW / targetWidth;
    const scaleY = srcH / targetHeight;

    for (let y = 0; y < targetHeight; y++) {
        const rowOffset = y * dstRowSize;
        rawBuffer[rowOffset] = 0; // None filter

        const srcY = Math.min(Math.floor(y * scaleY), srcH - 1);

        for (let x = 0; x < targetWidth; x++) {
            const srcX = Math.min(Math.floor(x * scaleX), srcW - 1);
            const srcOffset = (srcY * srcW + srcX) * 4;
            const dstOffset = rowOffset + 1 + x * 4;

            rawBuffer[dstOffset] = srcPixels[srcOffset];
            rawBuffer[dstOffset + 1] = srcPixels[srcOffset + 1];
            rawBuffer[dstOffset + 2] = srcPixels[srcOffset + 2];
            rawBuffer[dstOffset + 3] = srcPixels[srcOffset + 3];
        }
    }

    const compressedData = zlib.deflateSync(rawBuffer);
    const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(targetWidth, 0);
    ihdrData.writeUInt32BE(targetHeight, 4);
    ihdrData[8] = 8;  // Bit depth
    ihdrData[9] = 6;  // Color type RGBA
    ihdrData[10] = 0;
    ihdrData[11] = 0;
    ihdrData[12] = 0;

    const ihdrChunk = writeChunk('IHDR', ihdrData);
    const idatChunk = writeChunk('IDAT', compressedData);
    const iendChunk = writeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const inputBuffer = fs.readFileSync(sourceIconPath);
console.log('Processing user custom app icon: icon.png (2MB)...');

const srcImageData = parsePNG(inputBuffer);
console.log(`Parsed source icon.png (${srcImageData.width}x${srcImageData.height})`);

const icon512 = resizeRGBA(srcImageData, 512, 512);
fs.writeFileSync(path.join(assetsDir, 'icon-512.png'), icon512);
console.log('Created assets/icon-512.png');

const icon192 = resizeRGBA(srcImageData, 192, 192);
fs.writeFileSync(path.join(assetsDir, 'icon-192.png'), icon192);
console.log('Created assets/icon-192.png');

const appleIcon = resizeRGBA(srcImageData, 180, 180);
fs.writeFileSync(path.join(assetsDir, 'apple-touch-icon.png'), appleIcon);
console.log('Created assets/apple-touch-icon.png');

const diceIcon = resizeRGBA(srcImageData, 64, 64);
fs.writeFileSync(path.join(assetsDir, 'dice.png'), diceIcon);
console.log('Created assets/dice.png');

fs.copyFileSync(sourceIconPath, path.join(assetsDir, 'app-icon.png'));
console.log('Copied high-res icon.png to assets/app-icon.png');

console.log('Custom app icon successfully applied to all PWA assets!');
