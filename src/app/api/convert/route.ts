import { NextRequest, NextResponse } from 'next/server'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
const DAILY_LIMIT = 3

// Simple in-memory rate limiter (use Cloudflare KV in production)
const usageMap = new Map<string, { count: number; date: string }>()

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function getClientIP(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const today = getToday()

  // Check rate limit
  const usage = usageMap.get(ip)
  if (usage && usage.date === today && usage.count >= DAILY_LIMIT) {
    return NextResponse.json({ error: 'Daily limit reached' }, { status: 429 })
  }

  const { image, prompt } = await req.json()

  if (!image || !prompt) {
    return NextResponse.json({ error: 'Missing image or prompt' }, { status: 400 })
  }

  if (!REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: 'API token not configured' }, { status: 500 })
  }

  try {
    // Start prediction
    const startRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-max/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt: prompt,
          input_image: image,
        },
      }),
    })

    if (!startRes.ok) {
      const err = await startRes.text()
      return NextResponse.json({ error: `Replicate error: ${err}` }, { status: 500 })
    }

    const prediction = await startRes.json()

    // Poll for result (max 60s)
    let result = prediction
    const maxAttempts = 30
    for (let i = 0; i < maxAttempts; i++) {
      if (result.status === 'succeeded') break
      if (result.status === 'failed' || result.status === 'canceled') {
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
      }
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
      })
      result = await pollRes.json()
    }

    if (result.status !== 'succeeded') {
      return NextResponse.json({ error: 'Timeout waiting for result' }, { status: 500 })
    }

    // Update usage count
    const currentUsage = usageMap.get(ip)
    if (!currentUsage || currentUsage.date !== today) {
      usageMap.set(ip, { count: 1, date: today })
    } else {
      currentUsage.count++
    }

    const remaining = DAILY_LIMIT - (usageMap.get(ip)?.count || 0)
    const output = Array.isArray(result.output) ? result.output[0] : result.output

    return NextResponse.json({ output, remaining })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
