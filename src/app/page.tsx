'use client'

import { useState, useCallback, useEffect } from 'react'
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

  if (record.date !== today) {
    record = { date: today, count: 0 }
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  record.count += 1
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {}

  return { allowed: true, remaining: limit - record.count }
}

type Status = 'idle' | 'processing' | 'done' | 'error' | 'limit'

export default function Home() {
  const [status, setStatus] = useState<Status>('idle')
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].id)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [remainingUses, setRemainingUses] = useState<number | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [userLoading, setUserLoading] = useState(true)

  // Fetch current login state on mount
  useEffect(() => {
    fetch('/auth/me')
      .then(r => r.json())
      .then(data => {
        setUser(data.user || null)
      })
      .catch(() => setUser(null))
      .finally(() => setUserLoading(false))
  }, [])

  // Handle ?auth=success / ?auth=cancelled in URL after OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authResult = params.get('auth')
    if (authResult) {
      // Clean up URL
      const clean = window.location.pathname
      window.history.replaceState({}, '', clean)
    }
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
      if (!allowed) {
        setStatus('limit')
        return
      }

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
      <div className="max-w-4xl mx-auto px-4 py-10">
        <header className="text-center mb-12">
          {/* Top-right login/user area */}
          <div className="flex justify-end mb-4">
            {userLoading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-2">
                {user.picture && (
                  <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-orange-200" referrerPolicy="no-referrer" />
                )}
                <span className="text-sm text-gray-600 font-medium hidden sm:inline">{user.name}</span>
                <a
                  href="/auth/logout"
                  className="text-xs text-gray-400 hover:text-gray-600 underline ml-1"
                >
                  Sign out
                </a>
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

          <h1 className="text-5xl font-bold text-gray-800 mb-3 tracking-tight">
            🎨 Picture to Drawing
          </h1>
          <p className="text-gray-500 text-xl">
            Upload your photo · Choose a style · Get hand-drawn art
          </p>
          {remainingUses !== null && (
            <div className="mt-3 inline-block bg-orange-100 text-orange-600 text-sm font-medium px-4 py-1.5 rounded-full">
              🎁 {remainingUses} free conversion{remainingUses !== 1 ? 's' : ''} remaining today
            </div>
          )}
          {!user && !userLoading && (
            <p className="mt-2 text-sm text-gray-400">
              <a href="/auth/login" className="text-orange-500 hover:underline">Sign in</a> to get 10 conversions/day instead of 3
            </p>
          )}
        </header>

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
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-4">
                  <span className="text-2xl">🚫</span>
                  <div>
                    <p className="font-medium text-amber-800">Daily free limit reached</p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      {user
                        ? `You've used all ${DAILY_LIMIT_USER} conversions today. Come back tomorrow!`
                        : <>You&apos;ve used all {DAILY_LIMIT_GUEST} free conversions today.{' '}
                          <a href="/auth/login" className="text-orange-600 underline font-medium">Sign in</a> for 10/day, or come back tomorrow!</>
                      }
                    </p>
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
                    <button onClick={handleDownload}
                      className="flex-1 min-w-[160px] bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200">
                      ⬇️ Download Drawing
                    </button>
                    <button onClick={handleConvert}
                      className="flex-1 min-w-[160px] bg-orange-100 hover:bg-orange-200 text-orange-700 font-semibold py-3.5 px-6 rounded-xl transition-all duration-200">
                      🔄 Try Another Style
                    </button>
                  </>
                )}
                {originalImage && status !== 'processing' && (
                  <button onClick={handleReset}
                    className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl transition-all duration-200">
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

        <footer className="text-center mt-10 text-gray-400 text-sm space-y-1">
          <p>© 2026 Picture to Drawing · Powered by Browser Canvas</p>
          <p>
            {user
              ? `Signed in as ${user.email} · 10 conversions/day · 100% in-browser processing`
              : '3 free conversions/day · Sign in for 10/day · 100% in-browser processing'
            }
          </p>
        </footer>
      </div>
    </main>
  )
}
