'use client'

import { useState, useRef, useCallback } from 'react'
import UploadZone from '@/components/UploadZone'
import StyleSelector from '@/components/StyleSelector'
import ImageCompare from '@/components/ImageCompare'
import LoadingSpinner from '@/components/LoadingSpinner'

export const STYLES = [
  {
    id: 'pencil',
    label: 'Pencil Sketch',
    labelCn: '铅笔素描',
    emoji: '✏️',
    prompt: 'Convert this photo to a detailed pencil sketch drawing, black and white, hand-drawn artistic style, fine line details',
  },
  {
    id: 'inkwash',
    label: 'Ink Wash',
    labelCn: '水墨画',
    emoji: '🖌️',
    prompt: 'Convert this photo to an ink wash painting style, artistic brush strokes, monochrome, traditional painting aesthetic',
  },
  {
    id: 'lineart',
    label: 'Line Art',
    labelCn: '线稿',
    emoji: '🖊️',
    prompt: 'Convert this photo to clean line art illustration, minimal crisp lines, outline drawing style, vector art look',
  },
]

type Status = 'idle' | 'processing' | 'done' | 'error' | 'limit'

export default function Home() {
  const [status, setStatus] = useState<Status>('idle')
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].id)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [remainingUses, setRemainingUses] = useState<number | null>(null)

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
      const style = STYLES.find((s) => s.id === selectedStyle)!

      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: originalImage,
          prompt: style.prompt,
          style: style.id,
        }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setStatus('limit')
        return
      }
      if (!res.ok) {
        setErrorMsg(data.error || 'Conversion failed, please try again')
        setStatus('error')
        return
      }

      setResultImage(data.output)
      setRemainingUses(data.remaining)
      setStatus('done')
    } catch {
      setErrorMsg('Network error, please check your connection and try again')
      setStatus('error')
    }
  }

  const handleDownload = async () => {
    if (!resultImage) return
    try {
      const response = await fetch(resultImage)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `drawing-${selectedStyle}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in new tab
      window.open(resultImage, '_blank')
    }
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

        {/* Header */}
        <header className="text-center mb-12">
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
        </header>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-8 space-y-8">

          {/* Step 1: Upload */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center justify-center">1</span>
              <h2 className="text-lg font-semibold text-gray-700">Upload Your Photo</h2>
            </div>
            <UploadZone
              onFileSelect={handleFileSelect}
              currentImage={originalImage}
              disabled={isProcessing}
            />
          </section>

          {/* Step 2: Style (shown after upload) */}
          {originalImage && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center justify-center">2</span>
                <h2 className="text-lg font-semibold text-gray-700">Choose Drawing Style</h2>
              </div>
              <StyleSelector
                styles={STYLES}
                selected={selectedStyle}
                onChange={setSelectedStyle}
                disabled={isProcessing}
              />
            </section>
          )}

          {/* Step 3: Convert Button */}
          {originalImage && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center justify-center">3</span>
                <h2 className="text-lg font-semibold text-gray-700">Convert</h2>
              </div>

              {/* Status Messages */}
              {status === 'processing' && (
                <div className="flex items-center justify-center gap-3 py-6 bg-orange-50 rounded-2xl mb-4">
                  <LoadingSpinner />
                  <div>
                    <p className="font-medium text-orange-700">AI is drawing your image...</p>
                    <p className="text-sm text-orange-500">This usually takes 15–40 seconds</p>
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
                    <p className="text-sm text-amber-700 mt-0.5">You&apos;ve used all 3 free conversions today. Come back tomorrow!</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                {(status === 'idle' || status === 'error') && (
                  <button
                    onClick={handleConvert}
                    disabled={!canConvert}
                    className="flex-1 min-w-[160px] bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    ✨ Start Converting
                  </button>
                )}

                {status === 'done' && (
                  <>
                    <button
                      onClick={handleDownload}
                      className="flex-1 min-w-[160px] bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      ⬇️ Download Drawing
                    </button>
                    <button
                      onClick={handleConvert}
                      className="flex-1 min-w-[160px] bg-orange-100 hover:bg-orange-200 text-orange-700 font-semibold py-3.5 px-6 rounded-xl transition-all duration-200"
                    >
                      🔄 Try Another Style
                    </button>
                  </>
                )}

                {originalImage && status !== 'processing' && (
                  <button
                    onClick={handleReset}
                    className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl transition-all duration-200"
                  >
                    📷 New Photo
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Result */}
          {(originalImage || resultImage) && (
            <section>
              <ImageCompare
                originalImage={originalImage}
                resultImage={resultImage}
                isLoading={isProcessing}
              />
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-10 text-gray-400 text-sm space-y-1">
          <p>© 2026 Picture to Drawing · Powered by Replicate AI</p>
          <p>3 free conversions per day · No account required</p>
        </footer>
      </div>
    </main>
  )
}
