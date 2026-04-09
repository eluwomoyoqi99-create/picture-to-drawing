import { NextRequest, NextResponse } from 'next/server'

const DAILY_LIMIT = 3
const usageMap = new Map<string, { count: number; date: string }>()

function getToday() {
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

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const today = getToday()

  const usage = usageMap.get(ip)
  if (usage && usage.date === today && usage.count >= DAILY_LIMIT) {
    return NextResponse.json({ error: 'Daily limit reached', remaining: 0 }, { status: 429 })
  }

  // Just validate the request — actual processing is done client-side
  let style: string
  try {
    const body = await req.json()
    style = body.style || 'pencil'
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Increment usage
  if (!usage || usage.date !== today) {
    usageMap.set(ip, { count: 1, date: today })
  } else {
    usage.count++
  }

  const remaining = Math.max(0, DAILY_LIMIT - (usageMap.get(ip)?.count ?? 1))
  return NextResponse.json({ ok: true, remaining })
}
