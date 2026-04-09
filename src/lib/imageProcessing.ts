// Client-side image processing using browser Canvas API
// No server dependencies — runs entirely in the browser

export type StyleId = 'pencil' | 'inkwash' | 'lineart'

export async function processImage(
  dataUrl: string,
  style: StyleId
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const { data, width, height } = imageData

        if (style === 'pencil') applyPencilSketch(data, width, height)
        else if (style === 'inkwash') applyInkWash(data, width, height)
        else applyLineArt(data, width, height)

        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

// ── Pencil Sketch ──────────────────────────────────────────────────────────
function applyPencilSketch(data: Uint8ClampedArray, w: number, h: number) {
  // 1. Grayscale
  const gray = new Uint8ClampedArray(w * h)
  for (let i = 0; i < data.length; i += 4)
    gray[i >> 2] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])

  // 2. Invert
  const inv = new Uint8ClampedArray(w * h)
  for (let i = 0; i < gray.length; i++) inv[i] = 255 - gray[i]

  // 3. Blur the inverted (simulates pencil strokes)
  const blurred = boxBlur(inv, w, h, 8)

  // 4. Color Dodge blend → sketch
  for (let i = 0; i < gray.length; i++) {
    const g = gray[i]
    const b = blurred[i]
    const dodge = b >= 255 ? 255 : Math.min(255, Math.round((g * 255) / (255 - b)))
    const p = i << 2
    data[p] = data[p + 1] = data[p + 2] = dodge
    data[p + 3] = 255
  }
}

// ── Ink Wash ───────────────────────────────────────────────────────────────
function applyInkWash(data: Uint8ClampedArray, w: number, h: number) {
  const gray = new Uint8ClampedArray(w * h)
  for (let i = 0; i < data.length; i += 4)
    gray[i >> 2] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])

  const blurred = boxBlur(gray, w, h, 3)

  for (let i = 0; i < blurred.length; i++) {
    let v = blurred[i]
    v = Math.round(Math.pow(v / 255, 1.5) * 255) // darken
    v = Math.round(v / 42) * 42                   // posterize (6 ink tones)
    const p = i << 2
    data[p] = data[p + 1] = data[p + 2] = v
    data[p + 3] = 255
  }
}

// ── Line Art ───────────────────────────────────────────────────────────────
function applyLineArt(data: Uint8ClampedArray, w: number, h: number) {
  const gray = new Uint8ClampedArray(w * h)
  for (let i = 0; i < data.length; i += 4)
    gray[i >> 2] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])

  const blurred = boxBlur(gray, w, h, 1)
  const edges = sobelEdges(blurred, w, h)

  for (let i = 0; i < edges.length; i++) {
    const line = edges[i] * 3 > 40 ? 0 : 255 // threshold → black lines on white
    const p = i << 2
    data[p] = data[p + 1] = data[p + 2] = line
    data[p + 3] = 255
  }
}

// ── Utilities ──────────────────────────────────────────────────────────────
function boxBlur(src: Uint8ClampedArray, w: number, h: number, r: number): Uint8ClampedArray {
  const tmp = new Uint8ClampedArray(src.length)
  const out = new Uint8ClampedArray(src.length)
  const len = r * 2 + 1

  // Horizontal
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0
      for (let k = -r; k <= r; k++) s += src[y * w + Math.min(Math.max(x + k, 0), w - 1)]
      tmp[y * w + x] = Math.round(s / len)
    }

  // Vertical
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0
      for (let k = -r; k <= r; k++) s += tmp[Math.min(Math.max(y + k, 0), h - 1) * w + x]
      out[y * w + x] = Math.round(s / len)
    }

  return out
}

function sobelEdges(src: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length)
  const Kx = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const Ky = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      let gx = 0, gy = 0
      for (let ky = -1; ky <= 1; ky++)
        for (let kx = -1; kx <= 1; kx++) {
          const v = src[(y + ky) * w + (x + kx)]
          const ki = (ky + 1) * 3 + (kx + 1)
          gx += v * Kx[ki]; gy += v * Ky[ki]
        }
      out[y * w + x] = Math.min(255, Math.round(Math.sqrt(gx * gx + gy * gy)))
    }
  return out
}
