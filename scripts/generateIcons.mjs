import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, '../src/client/assets');

if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
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

function generatePNG(size, themeColor = [27, 27, 58], accentColor = [255, 216, 62], diceColor = [255, 255, 255]) {
    const width = size;
    const height = size;
    
    // Create RGBA raw buffer (plus 1 filter byte per row)
    const rowSize = width * 4 + 1;
    const rawBuffer = Buffer.alloc(rowSize * height);

    const cx = width / 2;
    const cy = height / 2;
    const outerRadius = width * 0.45;
    const diceSize = width * 0.48;
    const cornerRadius = diceSize * 0.22;

    for (let y = 0; y < height; y++) {
        const rowOffset = y * rowSize;
        rawBuffer[rowOffset] = 0; // None filter

        for (let x = 0; x < width; x++) {
            const pxOffset = rowOffset + 1 + x * 4;

            // Background circle / rounded square gradient
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let r = themeColor[0];
            let g = themeColor[1];
            let b = themeColor[2];
            let a = 255;

            // Rounded Dice Body in Center
            const diceLeft = cx - diceSize / 2;
            const diceRight = cx + diceSize / 2;
            const diceTop = cy - diceSize / 2;
            const diceBottom = cy + diceSize / 2;

            const inXBounds = x >= diceLeft && x <= diceRight;
            const inYBounds = y >= diceTop && y <= diceBottom;

            if (inXBounds && inYBounds) {
                // Calculate distance to nearest corner for rounded rect
                let insideDice = true;
                const cornerX = x < cx ? diceLeft + cornerRadius : diceRight - cornerRadius;
                const cornerY = y < cy ? diceTop + cornerRadius : diceBottom - cornerRadius;

                if ((x < diceLeft + cornerRadius || x > diceRight - cornerRadius) &&
                    (y < diceTop + cornerRadius || y > diceBottom - cornerRadius)) {
                    const cdist = Math.sqrt((x - cornerX) ** 2 + (y - cornerY) ** 2);
                    if (cdist > cornerRadius) {
                        insideDice = false;
                    }
                }

                if (insideDice) {
                    // Dice surface
                    r = diceColor[0];
                    g = diceColor[1];
                    b = diceColor[2];

                    // Draw 5 Dots pattern on the dice
                    const dotRadius = diceSize * 0.085;
                    const dots = [
                        [cx, cy], // Center
                        [cx - diceSize * 0.24, cy - diceSize * 0.24], // Top-Left
                        [cx + diceSize * 0.24, cy + diceSize * 0.24], // Bottom-Right
                        [cx + diceSize * 0.24, cy - diceSize * 0.24], // Top-Right
                        [cx - diceSize * 0.24, cy + diceSize * 0.24]  // Bottom-Left
                    ];

                    for (const [dotX, dotY] of dots) {
                        const dDist = Math.sqrt((x - dotX) ** 2 + (y - dotY) ** 2);
                        if (dDist <= dotRadius) {
                            r = accentColor[0];
                            g = accentColor[1];
                            b = accentColor[2];
                        }
                    }
                }
            }

            // Outer ring accent
            if (dist > outerRadius - width * 0.03 && dist <= outerRadius) {
                r = accentColor[0];
                g = accentColor[1];
                b = accentColor[2];
            }

            rawBuffer[pxOffset] = r;
            rawBuffer[pxOffset + 1] = g;
            rawBuffer[pxOffset + 2] = b;
            rawBuffer[pxOffset + 3] = a;
        }
    }

    const compressedData = zlib.deflateSync(rawBuffer);

    // PNG Header
    const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    // IHDR Chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;  // Bit depth
    ihdrData[9] = 6;  // Color type RGBA
    ihdrData[10] = 0; // Compression
    ihdrData[11] = 0; // Filter
    ihdrData[12] = 0; // Interlace

    const ihdrChunk = writeChunk('IHDR', ihdrData);
    const idatChunk = writeChunk('IDAT', compressedData);
    const iendChunk = writeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

console.log('Generating PWA icons...');

const icon192 = generatePNG(192);
fs.writeFileSync(path.join(assetsDir, 'icon-192.png'), icon192);
console.log('Created assets/icon-192.png');

const icon512 = generatePNG(512);
fs.writeFileSync(path.join(assetsDir, 'icon-512.png'), icon512);
console.log('Created assets/icon-512.png');

const appleIcon = generatePNG(180);
fs.writeFileSync(path.join(assetsDir, 'apple-touch-icon.png'), appleIcon);
console.log('Created assets/apple-touch-icon.png');

console.log('All PWA icons generated successfully!');
