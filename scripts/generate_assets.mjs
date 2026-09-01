import fs from 'node:fs'
import zlib from 'node:zlib'

// Generate pure uncompressed/deflated PNGs for logo.png, og-image.png, and favicon.ico
// Standard CRC32 table
const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[n] = c >>> 0
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createPng(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData.writeUInt8(8, 8) // bit depth: 8
  ihdrData.writeUInt8(6, 9) // color type: 6 (RGBA)
  ihdrData.writeUInt8(0, 10) // compression
  ihdrData.writeUInt8(0, 11) // filter
  ihdrData.writeUInt8(0, 12) // interlace (none)

  const ihdrChunk = makeChunk('IHDR', ihdrData)

  // Scanlines with filter byte 0 (None)
  const rowBytes = width * 4
  const rawScanlines = Buffer.alloc(height * (rowBytes + 1))
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (rowBytes + 1)
    rawScanlines[rawOffset] = 0 // Filter type 0
    rgbaBuffer.copy(rawScanlines, rawOffset + 1, y * rowBytes, (y + 1) * rowBytes)
  }

  const compressedData = zlib.deflateSync(rawScanlines, { level: 9 })
  const idatChunk = makeChunk('IDAT', compressedData)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function makeChunk(type, data) {
  const len = data.length
  const chunk = Buffer.alloc(4 + 4 + len + 4)
  chunk.writeUInt32BE(len, 0)
  chunk.write(type, 4, 4, 'ascii')
  data.copy(chunk, 8)
  const typeAndData = chunk.subarray(4, 8 + len)
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len)
  return chunk
}

// Minimal drawing primitives on RGBA buffer
class Bitmap {
  constructor(width, height, bgR = 0, bgG = 0, bgB = 0, bgA = 0) {
    this.width = width
    this.height = height
    this.buffer = Buffer.alloc(width * height * 4)
    if (bgA > 0) {
      for (let i = 0; i < width * height; i++) {
        this.buffer[i * 4] = bgR
        this.buffer[i * 4 + 1] = bgG
        this.buffer[i * 4 + 2] = bgB
        this.buffer[i * 4 + 3] = bgA
      }
    }
  }

  setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return
    const idx = (Math.floor(y) * this.width + Math.floor(x)) * 4
    if (a === 255) {
      this.buffer[idx] = r
      this.buffer[idx + 1] = g
      this.buffer[idx + 2] = b
      this.buffer[idx + 3] = 255
    } else {
      // Alpha blending over existing
      const srcA = a / 255
      const dstA = this.buffer[idx + 3] / 255
      const outA = srcA + dstA * (1 - srcA)
      if (outA > 0) {
        this.buffer[idx] = Math.round((r * srcA + this.buffer[idx] * dstA * (1 - srcA)) / outA)
        this.buffer[idx + 1] = Math.round(
          (g * srcA + this.buffer[idx + 1] * dstA * (1 - srcA)) / outA,
        )
        this.buffer[idx + 2] = Math.round(
          (b * srcA + this.buffer[idx + 2] * dstA * (1 - srcA)) / outA,
        )
        this.buffer[idx + 3] = Math.round(outA * 255)
      }
    }
  }

  // Draw rounded rect with gradient from cyan (#00F2FF) to purple (#7000FF)
  drawGradientRoundedRect(x0, y0, w, h, radius) {
    const c1 = { r: 0x00, g: 0xf2, b: 0xff } // #00F2FF
    const c2 = { r: 0x70, g: 0x00, b: 0xff } // #7000FF

    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        // Check corner roundedness
        let inRect = true
        let dist = 0
        if (x < x0 + radius && y < y0 + radius) {
          dist = Math.hypot(x - (x0 + radius), y - (y0 + radius))
          inRect = dist <= radius
        } else if (x >= x0 + w - radius && y < y0 + radius) {
          dist = Math.hypot(x - (x0 + w - radius), y - (y0 + radius))
          inRect = dist <= radius
        } else if (x < x0 + radius && y >= y0 + h - radius) {
          dist = Math.hypot(x - (x0 + radius), y - (y0 + h - radius))
          inRect = dist <= radius
        } else if (x >= x0 + w - radius && y >= y0 + h - radius) {
          dist = Math.hypot(x - (x0 + w - radius), y - (y0 + h - radius))
          inRect = dist <= radius
        }

        if (inRect) {
          // Antialiased edge
          let alpha = 255
          if (dist > radius - 1 && dist <= radius) {
            alpha = Math.round((radius - dist) * 255)
          }

          // Diagonal gradient t
          const t = Math.max(0, Math.min(1, (x - x0 + (y - y0)) / (w + h)))
          const r = Math.round(c1.r + t * (c2.r - c1.r))
          const g = Math.round(c1.g + t * (c2.g - c1.g))
          const b = Math.round(c1.b + t * (c2.b - c1.b))

          this.setPixel(x, y, r, g, b, alpha)
        }
      }
    }
  }

  // Draw Lucide Radar geometry inside box
  drawRadarSymbol(boxX, boxY, boxSize, strokeThickness = 3, color = { r: 10, g: 11, b: 16 }) {
    const cx = boxX + boxSize / 2
    const cy = boxY + boxSize / 2
    const scale = boxSize / 24

    // Helper: draw arc from angle -135deg (top-left) to +135deg (bottom-left)
    const drawArc = (radiusLucide) => {
      const r = radiusLucide * scale
      for (let deg = -135; deg <= 135; deg += 0.5) {
        const rad = (deg * Math.PI) / 180
        const px = cx + r * Math.cos(rad)
        const py = cy + r * Math.sin(rad)
        for (let dx = -strokeThickness / 2; dx <= strokeThickness / 2; dx += 0.5) {
          for (let dy = -strokeThickness / 2; dy <= strokeThickness / 2; dy += 0.5) {
            if (dx * dx + dy * dy <= (strokeThickness / 2) * (strokeThickness / 2)) {
              this.setPixel(px + dx, py + dy, color.r, color.g, color.b, 255)
            }
          }
        }
      }
    }

    // Lucide arcs: radius 10, 6, 2
    drawArc(8.5)
    drawArc(5.2)
    drawArc(2.0)

    // Beam line: from center (cx, cy) to (cx + 6*scale, cy - 6*scale)
    const x1 = cx
    const y1 = cy
    const x2 = cx + 6.2 * scale
    const y2 = cy - 6.2 * scale
    const steps = Math.hypot(x2 - x1, y2 - y1) * 2
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const lx = x1 + t * (x2 - x1)
      const ly = y1 + t * (y2 - y1)
      for (let dx = -strokeThickness / 2; dx <= strokeThickness / 2; dx += 0.5) {
        for (let dy = -strokeThickness / 2; dy <= strokeThickness / 2; dy += 0.5) {
          if (dx * dx + dy * dy <= (strokeThickness / 2) * (strokeThickness / 2)) {
            this.setPixel(lx + dx, ly + dy, color.r, color.g, color.b, 255)
          }
        }
      }
    }
  }

  toPngBuffer() {
    return createPng(this.width, this.height, this.buffer)
  }
}

// Generate files
console.log('Generating logo.png, og-image.png, favicon.ico...')

// 1. Logo mark 128x128
const markBmp = new Bitmap(128, 128)
markBmp.drawGradientRoundedRect(8, 8, 112, 112, 28)
markBmp.drawRadarSymbol(8, 8, 112, 4.5)
fs.writeFileSync('public/logo-mark.png', markBmp.toPngBuffer())

// 2. Favicon 32x32 & ICO
const favBmp = new Bitmap(32, 32)
favBmp.drawGradientRoundedRect(2, 2, 28, 28, 7)
favBmp.drawRadarSymbol(2, 2, 28, 1.8)
const favPng32 = favBmp.toPngBuffer()
fs.writeFileSync('public/favicon.png', favPng32)

// ICO header + 1 image (PNG embedded)
const icoHeader = Buffer.alloc(6)
icoHeader.writeUInt16LE(0, 0) // reserved
icoHeader.writeUInt16LE(1, 2) // ICO type
icoHeader.writeUInt16LE(1, 4) // 1 image

const icoEntry = Buffer.alloc(16)
icoEntry.writeUInt8(32, 0) // width
icoEntry.writeUInt8(32, 1) // height
icoEntry.writeUInt8(0, 2) // color palette
icoEntry.writeUInt8(0, 3) // reserved
icoEntry.writeUInt16LE(1, 4) // color planes
icoEntry.writeUInt16LE(32, 6) // bits per pixel
icoEntry.writeUInt32LE(favPng32.length, 8) // size of image data
icoEntry.writeUInt32LE(22, 12) // offset of data (6 + 16 = 22)

const icoFile = Buffer.concat([icoHeader, icoEntry, favPng32])
fs.writeFileSync('public/favicon.ico', icoFile)

// 3. Logo PNG (512x512 high resolution square or horizontal banner)
// Let's create high-res logo.png (512x512) and 600x160 logo
const logoBmp = new Bitmap(512, 512)
logoBmp.drawGradientRoundedRect(32, 32, 448, 448, 112)
logoBmp.drawRadarSymbol(32, 32, 448, 18)
fs.writeFileSync('public/logo.png', logoBmp.toPngBuffer())

// 4. OG-Image (1200x630)
const ogBmp = new Bitmap(1200, 630, 10, 11, 16, 255) // #0A0B10

// Ambient radial gradient glow in the center
for (let y = 0; y < 630; y++) {
  for (let x = 0; x < 1200; x++) {
    const dist = Math.hypot(x - 600, y - 315)
    if (dist < 500) {
      const factor = (1 - dist / 500) * 0.35
      // blend purple & cyan glow
      const rGlow = Math.round(112 * factor)
      const gGlow = Math.round(120 * factor * 0.5)
      const bGlow = Math.round(255 * factor)
      ogBmp.setPixel(
        x,
        y,
        Math.min(255, 10 + rGlow),
        Math.min(255, 11 + gGlow),
        Math.min(255, 16 + bGlow),
        255,
      )
    }
  }
}

// Center Symbol
const ogIconSize = 220
const ogIconX = (1200 - ogIconSize) / 2
const ogIconY = 170
ogBmp.drawGradientRoundedRect(ogIconX, ogIconY, ogIconSize, ogIconSize, 55)
ogBmp.drawRadarSymbol(ogIconX, ogIconY, ogIconSize, 8.5)

fs.writeFileSync('public/og-image.png', ogBmp.toPngBuffer())
console.log('All binary assets generated successfully!')
