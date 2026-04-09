import { NextRequest, NextResponse } from 'next/server'

const DAILY_LIMIT = 3

// In-memory rate limiter
const usageMap = new Map<string, { count: number; date: string }>()

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  )
}

function incrementUsage(ip: string): number {
  const today = getToday()
  const usage = usageMap.get(ip)
  if (!usage || usage.date !== today) {
    usageMap.set(ip, { count: 1, date: today })
    return DAILY_LIMIT - 1
  }
  usage.count++
  return Math.max(0, DAILY_LIMIT - usage.count)
}

// Pure JS image processing using raw pixel manipulation
// Input/output: base64 data URLs, processed via typed arrays

function applyPencilSketch(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): void {
  // Step 1: grayscale
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0; i < pixels.length; i += 4) {
    gray[i / 4] = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2])
  }

  // Step 2: invert grayscale
  const inverted = new Uint8ClampedArray(width * height)
  for (let i = 0; i < gray.length; i++) inverted[i] = 255 - gray[i]

  // Step 3: blur the inverted (box blur as approximation)
  const blurred = boxBlur(inverted, width, height, 8)

  // Step 4: color dodge blend
  for (let i = 0; i < gray.length; i++) {
    const g = gray[i]
    const b = blurred[i]
    const dodge = b >= 255 ? 255 : Math.min(255, Math.round((g * 255) / (255 - b)))
    const pi = i * 4
    pixels[pi] = dodge
    pixels[pi + 1] = dodge
    pixels[pi + 2] = dodge
    pixels[pi + 3] = 255
  }
}

function applyInkWash(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): void {
  // Grayscale → blur → posterize (ink tones)
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0; i < pixels.length; i += 4) {
    gray[i / 4] = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2])
  }

  const blurred = boxBlur(gray, width, height, 3)

  for (let i = 0; i < blurred.length; i++) {
    let v = blurred[i]
    // Darken + posterize into ink-like tones (6 levels)
    v = Math.round(Math.pow(v / 255, 1.5) * 255)
    v = Math.round(v / 42) * 42
    const pi = i * 4
    pixels[pi] = v
    pixels[pi + 1] = v
    pixels[pi + 2] = v
    pixels[pi + 3] = 255
  }
}

function applyLineArt(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): void {
  // Grayscale → Sobel edges → threshold → invert (black lines on white)
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0; i < pixels.length; i += 4) {
    gray[i / 4] = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2])
  }

  const blurred = boxBlur(gray, width, height, 1)
  const edges = sobelEdges(blurred, width, height)

  for (let i = 0; i < edges.length; i++) {
    const edge = Math.min(255, edges[i] * 2.5)
    const line = edge > 40 ? 0 : 255 // threshold: dark edge = black line
    const pi = i * 4
    pixels[pi] = line
    pixels[pi + 1] = line
    pixels[pi + 2] = line
    pixels[pi + 3] = 255
  }
}

function boxBlur(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length)
  const tmp = new Uint8ClampedArray(data.length)
  const len = radius * 2 + 1

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      for (let k = -radius; k <= radius; k++) {
        const sx = Math.min(Math.max(x + k, 0), width - 1)
        sum += data[y * width + sx]
      }
      tmp[y * width + x] = Math.round(sum / len)
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.min(Math.max(y + k, 0), height - 1)
        sum += tmp[sy * width + x]
      }
      out[y * width + x] = Math.round(sum / len)
    }
  }

  return out
}

function sobelEdges(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length)
  const Kx = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const Ky = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = (y + ky) * width + (x + kx)
          const ki = (ky + 1) * 3 + (kx + 1)
          gx += data[px] * Kx[ki]
          gy += data[px] * Ky[ki]
        }
      }
      out[y * width + x] = Math.min(255, Math.round(Math.sqrt(gx * gx + gy * gy)))
    }
  }
  return out
}

// Decode base64 PNG/JPEG → raw RGBA pixel array (pure JS, no canvas)
// We use a minimal approach: parse the image dimensions and pixels
// via the Web Streams / fetch trick available in Edge runtime

export const runtime = 'nodejs'  // use Node.js runtime for OffscreenCanvas / sharp

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const today = getToday()

  // Check rate limit
  const usage = usageMap.get(ip)
  if (usage && usage.date === today && usage.count >= DAILY_LIMIT) {
    return NextResponse.json({ error: 'Daily limit reached', remaining: 0 }, { status: 429 })
  }

  let imageDataUrl: string
  let style: string
  try {
    const body = await req.json()
    imageDataUrl = body.image
    style = body.style || 'pencil'
    if (!imageDataUrl) throw new Error('missing')
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!imageDataUrl.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
  }

  try {
    // Dynamically import sharp (server-side only)
    const sharp = (await import('sharp')).default

    // Decode base64
    const base64Data = imageDataUrl.split(',')[1]
    const inputBuffer = Buffer.from(base64Data, 'base64')

    // Get raw RGBA pixels via sharp
    const { data: rawPixels, info } = await sharp(inputBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { width, height } = info
    const pixels = new Uint8ClampedArray(rawPixels.buffer)

    // Apply style effect
    if (style === 'pencil') {
      applyPencilSketch(pixels, width, height)
    } else if (style === 'inkwash') {
      applyInkWash(pixels, width, height)
    } else {
      applyLineArt(pixels, width, height)
    }

    // Encode back to PNG
    const outputBuffer = await sharp(Buffer.from(pixels.buffer), {
      raw: { width, height, channels: 4 },
    })
      .png()
      .toBuffer()

    const outputDataUrl = `data:image/png;base64,${outputBuffer.toString('base64')}`
    const remaining = incrementUsage(ip)
    return NextResponse.json({ output: outputDataUrl, remaining })
  } catch (err) {
    console.error('Processing error:', err)
    return NextResponse.json({ error: 'Image processing failed' }, { status: 500 })
  }
}
