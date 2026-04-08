'use client'

import { useState, useRef } from 'react'

const STYLES = [
  { id: 'pencil', label: 'Pencil Sketch', emoji: '✏️', prompt: 'convert to detailed pencil sketch drawing, black and white, hand-drawn style' },
  { id: 'inkwash', label: 'Ink Wash', emoji: '🖌️', prompt: 'convert to ink wash painting style, artistic brush strokes, monochrome' },
  { id: 'lineart', label: 'Line Art', emoji: '🖊️', prompt: 'convert to clean line art illustration, minimal lines, outline style' },
]

type Status = 'idle' | 'uploading' | 'processing' | 'done' | 'error' | 'limit'

export default function Home() {
  const [status, setStatus] = useState<Status>('idle')
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].id)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [remainingUses, setRemainingUses] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setOriginalImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleConvert = async () => {
    if (!originalImage) return
    setStatus('processing')
    setResultImage(null)

    try {
      const style = STYLES.find(s => s.id === selectedStyle)!
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: originalImage, prompt: style.prompt }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setStatus('limit')
        return
      }
      if (!res.ok) {
        setErrorMsg(data.error || 'Conversion failed')
        setStatus('error')
        return
      }

      setResultImage(data.output)
      setRemainingUses(data.remaining)
      setStatus('done')
    } catch {
      setErrorMsg('Network error, please try again')
      setStatus('error')
    }
  }

  const handleDownload = () => {
    if (!resultImage) return
    const a = document.createElement('a')
    a.href = resultImage
    a.download = 'drawing.png'
    a.click()
  }

  const handleReset = () => {
    setStatus('idle')
    setOriginalImage(null)
    setResultImage(null)
    setErrorMsg('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎨 Picture to Drawing</h1>
          <p className="text-gray-500 text-lg">Upload your photo, AI turns it into hand-drawn art</p>
          {remainingUses !== null && (
            <p className="text-sm text-orange-500 mt-1">
              {remainingUses} free conversions remaining today
            </p>
          )}
        </div>

        {/* Upload Area */}
        {!originalImage ? (
          <div
            className="border-2 border-dashed border-orange-300 rounded-2xl p-16 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-5xl mb-4">📷</div>
            <p className="text-gray-600 text-lg">Click or drag to upload a photo</p>
            <p className="text-gray-400 text-sm mt-2">JPG / PNG, up to 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Style Selector */}
            <div>
              <p className="text-gray-700 font-medium mb-3">Choose drawing style:</p>
              <div className="grid grid-cols-3 gap-3">
                {STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      selectedStyle === style.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="text-3xl mb-1">{style.emoji}</div>
                    <div className="text-sm font-medium text-gray-700">{style.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Preview / Result */}
            <div className={`grid gap-4 ${resultImage ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <p className="text-xs text-gray-400 mb-1 text-center">Original</p>
                <img src={originalImage} alt="original" className="w-full rounded-xl object-contain max-h-72" />
              </div>
              {resultImage && (
                <div>
                  <p className="text-xs text-gray-400 mb-1 text-center">Drawing</p>
                  <img src={resultImage} alt="result" className="w-full rounded-xl object-contain max-h-72" />
                </div>
              )}
            </div>

            {/* Status Messages */}
            {status === 'processing' && (
              <div className="text-center py-4">
                <div className="text-2xl animate-spin inline-block">⚙️</div>
                <p className="text-gray-600 mt-2">AI is drawing... please wait 15-40 seconds</p>
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-red-600">{errorMsg}</p>
              </div>
            )}
            {status === 'limit' && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                <p className="text-orange-600">🚫 Daily free limit reached. Come back tomorrow!</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {(status === 'idle' || status === 'error') && (
                <button
                  onClick={handleConvert}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-all"
                >
                  ✨ Start Converting
                </button>
              )}
              {status === 'done' && (
                <>
                  <button
                    onClick={handleDownload}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-all"
                  >
                    ⬇️ Download Drawing
                  </button>
                  <button
                    onClick={handleConvert}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-all"
                  >
                    🔄 Try Again
                  </button>
                </>
              )}
              <button
                onClick={handleReset}
                className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold py-3 rounded-xl transition-all"
              >
                New Photo
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-400 text-sm">
          <p>© 2026 Picture to Drawing · 3 free conversions per day</p>
        </div>
      </div>
    </main>
  )
}
