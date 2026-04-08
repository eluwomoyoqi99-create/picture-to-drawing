import { NextRequest, NextResponse } from 'next/server'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
const DAILY_LIMIT = 3
const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 30 // 60 seconds max

// In-memory rate limiter (use Cloudflare KV in production)
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

function getRemainingUses(ip: string): number {
  const today = getToday()
  const usage = usageMap.get(ip)
  if (!usage || usage.date !== today) return DAILY_LIMIT
  return Math.max(0, DAILY_LIMIT - usage.count)
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

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const today = getToday()

  // Check rate limit
  const usage = usageMap.get(ip)
  if (usage && usage.date === today && usage.count >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: 'Daily limit reached', remaining: 0 },
      { status: 429 }
    )
  }

  // Validate API token
  if (!REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: 'Server configuration error: missing API token' },
      { status: 500 }
    )
  }

  // Parse request body
  let image: string
  let prompt: string
  try {
    const body = await req.json()
    image = body.image
    prompt = body.prompt
    if (!image || !prompt) throw new Error('Missing fields')
  } catch {
    return NextResponse.json(
      { error: 'Invalid request: image and prompt are required' },
      { status: 400 }
    )
  }

  // Validate image format
  if (!image.startsWith('data:image/')) {
    return NextResponse.json(
      { error: 'Invalid image format' },
      { status: 400 }
    )
  }

  try {
    // Start Replicate prediction
    const startRes = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-max/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
          Prefer: 'wait', // wait up to 60s for sync response
        },
        body: JSON.stringify({
          input: {
            prompt: prompt,
            input_image: image,
            output_format: 'png',
            safety_tolerance: 2,
          },
        }),
      }
    )

    if (!startRes.ok) {
      const errText = await startRes.text()
      console.error('Replicate API error:', errText)
      return NextResponse.json(
        { error: 'AI service error, please try again later' },
        { status: 502 }
      )
    }

    let prediction = await startRes.json()

    // If not done yet, poll for result
    let attempts = 0
    while (
      prediction.status !== 'succeeded' &&
      prediction.status !== 'failed' &&
      prediction.status !== 'canceled' &&
      attempts < MAX_POLL_ATTEMPTS
    ) {
      await sleep(POLL_INTERVAL_MS)
      attempts++

      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
        }
      )
      if (!pollRes.ok) break
      prediction = await pollRes.json()
    }

    // Check final status
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      return NextResponse.json(
        { error: prediction.error || 'Processing failed' },
        { status: 500 }
      )
    }

    if (prediction.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Processing timed out, please try again' },
        { status: 504 }
      )
    }

    // Extract output URL
    const output = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output

    if (!output) {
      return NextResponse.json(
        { error: 'No output received from AI' },
        { status: 500 }
      )
    }

    // Increment usage and return success
    const remaining = incrementUsage(ip)
    return NextResponse.json({ output, remaining })

  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
