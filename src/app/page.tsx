'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import UploadZone from '@/components/UploadZone'
import StyleSelector from '@/components/StyleSelector'
import ImageCompare from '@/components/ImageCompare'
import LoadingSpinner from '@/components/LoadingSpinner'
import { STYLES } from '@/lib/styles'
import { processImage, StyleId } from '@/lib/imageProcessing'

const DAILY_LIMIT_GUEST = 3
const DAILY_LIMIT_USER = 10
const STORAGE_KEY = 'p2d_usage'

interface UserInfo {
  email: string
  name: string
  picture?: string
}

function checkAndIncrementUsage(isLoggedIn: boolean): { allowed: boolean; remaining: number } {
  const limit = isLoggedIn ? DAILY_LIMIT_USER : DAILY_LIMIT_GUEST
  const today = new Date().toISOString().split('T')[0]
  let record = { date: '', count: 0 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) record = JSON.parse(raw)
  } catch {}
  if (record.date !== today) record = { date: today, count: 0 }
  if (record.count >= limit) return { allowed: false, remaining: 0 }
  record.count += 1
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)) } catch {}
  return { allowed: true, remaining: limit - record.count }
}

type Status = 'idle' | 'processing' | 'done' | 'error' | 'limit'

// ─── Upgrade Modal ────────────────────────────────────────────────────────────
const PAYPAL_CLIENT_ID = 'AbRG-THm4_Pm5pAplZEHutc6Rv79jYIowdwaF8L0iTbpkzblp1lWmoLVQm7IG4LIU512PTT1dND-Qr6h'
const PAYPAL_PLAN_MONTHLY = 'P-5H914883PY489063BNHMKSTY'
const PAYPAL_PLAN_ANNUAL  = 'P-1K523494TJ200721JNHMKSTY'

function UpgradeModal({ onClose, isLoggedIn }: { onClose: () => void; isLoggedIn: boolean }) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')
  const [loading, setLoading] = useState(false)
  const [paypalReady, setPaypalReady] = useState(false)
  const paypalRef = useRef<HTMLDivElement>(null)

  // Load PayPal SDK
  useEffect(() => {
    if (document.getElementById('paypal-sdk')) { setPaypalReady(true); return }
    const script = document.createElement('script')
    script.id = 'paypal-sdk'
    script.src = `https://www.sandbox.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`
    script.onload = () => setPaypalReady(true)
    document.head.appendChild(script)
  }, [])

  // Render PayPal button when ready
  useEffect(() => {
    if (!paypalReady || !paypalRef.current || !isLoggedIn) return
    const win = window as any
    if (!win.paypal) return
    paypalRef.current.innerHTML = ''
    win.paypal.Buttons({
      style: { shape: 'pill', color: 'gold', layout: 'horizontal', label: 'subscribe' },
      createSubscription: (_data: any, actions: any) => {
        return actions.subscription.create({
          plan_id: billing === 'annual' ? PAYPAL_PLAN_ANNUAL : PAYPAL_PLAN_MONTHLY,
        })
      },
      onApprove: async (data: any) => {
        setLoading(true)
        window.location.href = `/api/paypal/success?subscription_id=${data.subscriptionID}`
      },
      onError: (err: any) => {
        console.error('PayPal error', err)
        alert('Payment failed. Please try again.')
        setLoading(false)
      },
    }).render(paypalRef.current)
  }, [paypalReady, billing, isLoggedIn])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🚀</div>
          <h2 className="text-2xl font-bold text-gray-800">Upgrade to Pro</h2>
          <p className="text-gray-500 mt-1">Unlock unlimited conversions and premium features</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <button onClick={() => setBilling('monthly')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${billing === 'monthly' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Monthly — $4.9
          </button>
          <button onClick={() => setBilling('annual')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${billing === 'annual' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Annual — $29 <span className="text-xs opacity-80">save 51%</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Free */}
          <div className="border border-gray-200 rounded-2xl p-4">
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Free</div>
            <div className="text-2xl font-bold text-gray-800 mb-3">$0</div>
            <ul className="space-y-1.5 text-sm text-gray-600">
              <li>✅ {isLoggedIn ? '10' : '3'} conversions/day</li>
              <li>✅ 3 drawing styles</li>
              <li>✅ PNG download</li>
              <li className="text-gray-400">❌ High-res output</li>
              <li className="text-gray-400">❌ History</li>
            </ul>
            {!isLoggedIn && (
              <a href="/auth/login" className="mt-4 block text-center py-2 rounded-xl border border-orange-300 text-orange-600 text-sm font-medium hover:bg-orange-50 transition-colors">
                Sign in free
              </a>
            )}
          </div>

          {/* Pro */}
          <div className="border-2 border-orange-400 rounded-2xl p-4 bg-orange-50 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</div>
            <div className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-1">Pro</div>
            <div className="text-2xl font-bold text-gray-800 mb-0.5">
              {billing === 'annual' ? '$2.4' : '$4.9'}<span className="text-sm font-normal text-gray-500">/mo</span>
            </div>
            <div className="text-xs text-orange-600 font-medium mb-3">
              {billing === 'annual' ? 'Billed $29/year' : 'Billed monthly'}
            </div>
            <ul className="space-y-1.5 text-sm text-gray-700">
              <li>✅ <strong>Unlimited</strong> conversions</li>
              <li>✅ <strong>All styles</strong></li>
              <li>✅ <strong>4K high-res</strong> output</li>
              <li>✅ <strong>Unlimited</strong> history</li>
              <li>✅ No ads</li>
            </ul>
          </div>
        </div>

        {/* PayPal Button */}
        {isLoggedIn ? (
          <div>
            {loading && (
              <div className="text-center py-3 text-orange-600 text-sm font-medium">Processing payment...</div>
            )}
            <div ref={paypalRef} className="min-h-[45px]">
              {!paypalReady && <div className="text-center py-3 text-gray-400 text-sm">Loading payment...</div>}
            </div>
          </div>
        ) : (
          <a href="/auth/login" className="block w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold text-center transition-colors">
            Sign in to Upgrade →
          </a>
        )}

        <p className="text-center text-xs text-gray-400 mt-3">Cancel anytime · Secure payment via PayPal · No hidden fees</p>
      </div>
    </div>
  )
}

// ─── Pricing Section ──────────────────────────────────────────────────────────
function PricingSection({ onUpgrade }: { onUpgrade: () => void }) {
  const [annual, setAnnual] = useState(true)

  return (
    <section className="mt-16" id="pricing">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Simple, Transparent Pricing</h2>
        <p className="text-gray-500">Start free. Upgrade when you need more.</p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <span className={`text-sm font-medium ${!annual ? 'text-gray-800' : 'text-gray-400'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-orange-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-gray-800' : 'text-gray-400'}`}>
            Annual <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full ml-1">Save 51%</span>
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {/* Guest */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Guest</div>
          <div className="text-3xl font-bold text-gray-800 mb-1">$0</div>
          <p className="text-sm text-gray-500 mb-5">No account needed</p>
          <ul className="space-y-2 text-sm text-gray-600 mb-6">
            <li className="flex gap-2"><span className="text-green-500">✓</span> 3 conversions/day</li>
            <li className="flex gap-2"><span className="text-green-500">✓</span> 3 drawing styles</li>
            <li className="flex gap-2"><span className="text-green-500">✓</span> PNG download</li>
            <li className="flex gap-2"><span className="text-gray-300">✗</span> <span className="text-gray-400">High-res output</span></li>
            <li className="flex gap-2"><span className="text-gray-300">✗</span> <span className="text-gray-400">History</span></li>
          </ul>
          <div className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium text-center">Current Plan</div>
        </div>

        {/* Free Account */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Free Account</div>
          <div className="text-3xl font-bold text-gray-800 mb-1">$0</div>
          <p className="text-sm text-gray-500 mb-5">Sign in with Google</p>
          <ul className="space-y-2 text-sm text-gray-600 mb-6">
            <li className="flex gap-2"><span className="text-green-500">✓</span> <strong>10</strong> conversions/day</li>
            <li className="flex gap-2"><span className="text-green-500">✓</span> 3 drawing styles</li>
            <li className="flex gap-2"><span className="text-green-500">✓</span> PNG download</li>
            <li className="flex gap-2"><span className="text-green-500">✓</span> Last 10 history</li>
            <li className="flex gap-2"><span className="text-gray-300">✗</span> <span className="text-gray-400">High-res output</span></li>
          </ul>
          <a href="/auth/login" className="block w-full py-2.5 rounded-xl border-2 border-orange-400 text-orange-600 text-sm font-bold text-center hover:bg-orange-50 transition-colors">
            Sign in Free →
          </a>
        </div>

        {/* Pro */}
        <div className="bg-gradient-to-b from-orange-500 to-orange-600 rounded-2xl p-6 text-white relative shadow-xl shadow-orange-200">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-orange-600 text-xs font-bold px-3 py-1 rounded-full shadow">
            ⭐ MOST POPULAR
          </div>
          <div className="text-sm font-semibold text-orange-200 uppercase tracking-wide mb-1">Pro</div>
          <div className="text-3xl font-bold mb-0.5">
            {annual ? '$2.4' : '$4.9'}<span className="text-lg font-normal text-orange-200">/mo</span>
          </div>
          <p className="text-sm text-orange-200 mb-5">
            {annual ? 'Billed $29/year' : 'Billed monthly'}
          </p>
          <ul className="space-y-2 text-sm mb-6">
            <li className="flex gap-2"><span>✓</span> <strong>Unlimited</strong> conversions</li>
            <li className="flex gap-2"><span>✓</span> All styles + new releases</li>
            <li className="flex gap-2"><span>✓</span> <strong>4K high-res</strong> output</li>
            <li className="flex gap-2"><span>✓</span> <strong>Unlimited</strong> history</li>
            <li className="flex gap-2"><span>✓</span> SVG export</li>
            <li className="flex gap-2"><span>✓</span> No ads</li>
          </ul>
          <button
            onClick={onUpgrade}
            className="w-full py-2.5 rounded-xl bg-white text-orange-600 text-sm font-bold hover:bg-orange-50 transition-colors shadow"
          >
            Get Pro {annual ? '— $29/yr' : '— $4.9/mo'} →
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────
const faqs = [
  {
    q: 'Is my photo uploaded to any server?',
    a: 'No. All processing happens 100% in your browser. Your photos never leave your device and are never uploaded to any server. Your privacy is fully protected.',
  },
  {
    q: 'What are the limits for free users?',
    a: 'Visitors without an account can convert 3 photos per day. Signing up with Google (free) increases this to 10 per day. Pro members get unlimited conversions.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept Visa, Mastercard, and PayPal. All payments are securely processed by Stripe. We never store your card details.',
  },
  {
    q: 'Can I cancel my Pro subscription anytime?',
    a: 'Yes, absolutely. Cancel anytime with no cancellation fee. You\'ll continue to have Pro access until the end of your current billing period.',
  },
  {
    q: 'What image formats are supported?',
    a: 'You can upload JPG and PNG images up to 10MB. Free users can download in PNG. Pro users can also export in SVG format and download in 4K high resolution.',
  },
  {
    q: 'What drawing styles are available?',
    a: 'Currently we offer Pencil Sketch, Ink Wash, and Line Art. Pro members get access to all future styles as they are released.',
  },
]

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section className="mt-16 max-w-2xl mx-auto" id="faq">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Frequently Asked Questions</h2>
        <p className="text-gray-500">Everything you need to know</p>
      </div>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="font-medium text-gray-800">{faq.q}</span>
              <span className={`text-orange-500 text-xl transition-transform flex-shrink-0 ${open === i ? 'rotate-45' : ''}`}>+</span>
            </button>
            {open === i && (
              <div className="px-6 pb-4 text-gray-500 text-sm leading-relaxed border-t border-gray-100 pt-3">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [status, setStatus] = useState<Status>('idle')
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].id)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [remainingUses, setRemainingUses] = useState<number | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    fetch('/auth/me')
      .then(r => r.json())
      .then(data => setUser(data.user || null))
      .catch(() => setUser(null))
      .finally(() => setUserLoading(false))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth')) window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const handleFileSelect = useCallback((dataUrl: string) => {
    setOriginalImage(dataUrl)
    setResultImage(null)
    setStatus('idle')
    setErrorMsg('')
  }, [])

  const handleConvert = async () => {
    if (!originalImage) return
    setStatus('processing')
    setResultImage(null)
    setErrorMsg('')
    try {
      const { allowed, remaining } = checkAndIncrementUsage(!!user)
      if (!allowed) { setStatus('limit'); return }
      const output = await processImage(originalImage, selectedStyle as StyleId)
      setResultImage(output)
      setRemainingUses(remaining)
      setStatus('done')
    } catch (e) {
      console.error(e)
      setErrorMsg('Processing failed, please try again')
      setStatus('error')
    }
  }

  const handleDownload = () => {
    if (!resultImage) return
    const a = document.createElement('a')
    a.href = resultImage
    a.download = `drawing-${selectedStyle}-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleReset = () => {
    setStatus('idle')
    setOriginalImage(null)
    setResultImage(null)
    setErrorMsg('')
  }

  const isProcessing = status === 'processing'
  const canConvert = !!originalImage && !isProcessing

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} isLoggedIn={!!user} />}

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex justify-end mb-4">
            {userLoading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-2">
                {user.picture && (
                  <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-orange-200" referrerPolicy="no-referrer" />
                )}
                <span className="text-sm text-gray-600 font-medium hidden sm:inline">{user.name}</span>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-1 rounded-full ml-1 transition-colors"
                >
                  Pro ✨
                </button>
                <a href="/auth/logout" className="text-xs text-gray-400 hover:text-gray-600 underline ml-1">Sign out</a>
              </div>
            ) : (
              <a
                href="/auth/login"
                className="flex items-center gap-2 bg-white border border-gray-200 hover:border-orange-300 hover:shadow-sm text-gray-700 text-sm font-medium px-4 py-2 rounded-full transition-all duration-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </a>
            )}
          </div>

          <h1 className="text-5xl font-bold text-gray-800 mb-3 tracking-tight">🎨 Picture to Drawing</h1>
          <p className="text-gray-500 text-xl">Upload your photo · Choose a style · Get hand-drawn art</p>
          {remainingUses !== null && (
            <div className="mt-3 inline-block bg-orange-100 text-orange-600 text-sm font-medium px-4 py-1.5 rounded-full">
              🎁 {remainingUses} free conversion{remainingUses !== 1 ? 's' : ''} remaining today
            </div>
          )}
          {!user && !userLoading && (
            <p className="mt-2 text-sm text-gray-400">
              <a href="/auth/login" className="text-orange-500 hover:underline">Sign in free</a> for 10/day ·{' '}
              <button onClick={() => setShowUpgradeModal(true)} className="text-orange-500 hover:underline">Go Pro</button> for unlimited
            </p>
          )}
        </header>

        {/* Converter Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-8 space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center justify-center">1</span>
              <h2 className="text-lg font-semibold text-gray-700">Upload Your Photo</h2>
            </div>
            <UploadZone onFileSelect={handleFileSelect} currentImage={originalImage} disabled={isProcessing} />
          </section>

          {originalImage && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center justify-center">2</span>
                <h2 className="text-lg font-semibold text-gray-700">Choose Drawing Style</h2>
              </div>
              <StyleSelector styles={STYLES} selected={selectedStyle} onChange={setSelectedStyle} disabled={isProcessing} />
            </section>
          )}

          {originalImage && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center justify-center">3</span>
                <h2 className="text-lg font-semibold text-gray-700">Convert</h2>
              </div>

              {status === 'processing' && (
                <div className="flex items-center justify-center gap-3 py-6 bg-orange-50 rounded-2xl mb-4">
                  <LoadingSpinner />
                  <div>
                    <p className="font-medium text-orange-700">Processing in your browser...</p>
                    <p className="text-sm text-orange-500">Usually just a few seconds</p>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-4">
                  <span className="text-red-500 text-xl">⚠️</span>
                  <div>
                    <p className="font-medium text-red-700">Something went wrong</p>
                    <p className="text-sm text-red-600 mt-0.5">{errorMsg}</p>
                  </div>
                </div>
              )}

              {status === 'limit' && (
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl mb-4">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl">🚫</span>
                    <div>
                      <p className="font-medium text-amber-800">Daily limit reached</p>
                      <p className="text-sm text-amber-700 mt-0.5">
                        {user
                          ? `You've used all ${DAILY_LIMIT_USER} free conversions today.`
                          : `You've used all ${DAILY_LIMIT_GUEST} guest conversions today.`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="flex-1 min-w-[140px] py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      ✨ Upgrade to Pro — Unlimited
                    </button>
                    {!user && (
                      <a href="/auth/login" className="flex-1 min-w-[140px] py-2.5 px-4 border-2 border-orange-400 text-orange-600 text-sm font-bold rounded-xl text-center hover:bg-orange-50 transition-colors">
                        Sign in Free (10/day)
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 flex-wrap">
                {(status === 'idle' || status === 'error') && (
                  <button onClick={handleConvert} disabled={!canConvert}
                    className="flex-1 min-w-[160px] bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md">
                    ✨ Start Converting
                  </button>
                )}
                {status === 'done' && (
                  <>
                    <button onClick={handleDownload} className="flex-1 min-w-[160px] bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200">
                      ⬇️ Download Drawing
                    </button>
                    <button onClick={handleConvert} className="flex-1 min-w-[160px] bg-orange-100 hover:bg-orange-200 text-orange-700 font-semibold py-3.5 px-6 rounded-xl transition-all duration-200">
                      🔄 Try Another Style
                    </button>
                  </>
                )}
                {originalImage && status !== 'processing' && (
                  <button onClick={handleReset} className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl transition-all duration-200">
                    📷 New Photo
                  </button>
                )}
              </div>
            </section>
          )}

          {(originalImage || resultImage) && (
            <section>
              <ImageCompare originalImage={originalImage} resultImage={resultImage} isLoading={isProcessing} />
            </section>
          )}
        </div>

        {/* Pricing */}
        <PricingSection onUpgrade={() => setShowUpgradeModal(true)} />

        {/* FAQ */}
        <FAQSection />

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-400 text-sm space-y-1 pb-8">
          <p>© 2026 Picture to Drawing · Powered by Browser Canvas</p>
          <p>
            <button onClick={() => setShowUpgradeModal(true)} className="hover:text-orange-500 hover:underline">Pricing</button>
            {' · '}
            <a href="#faq" className="hover:text-orange-500 hover:underline">FAQ</a>
            {' · '}
            {user
              ? <a href="/auth/logout" className="hover:text-orange-500 hover:underline">Sign out</a>
              : <a href="/auth/login" className="hover:text-orange-500 hover:underline">Sign in</a>
            }
          </p>
        </footer>
      </div>
    </main>
  )
}
