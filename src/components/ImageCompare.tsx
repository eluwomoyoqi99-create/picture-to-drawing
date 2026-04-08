interface ImageCompareProps {
  originalImage: string | null
  resultImage: string | null
  isLoading?: boolean
}

export default function ImageCompare({ originalImage, resultImage, isLoading }: ImageCompareProps) {
  if (!originalImage && !resultImage) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-7 h-7 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center justify-center">4</span>
        <h2 className="text-lg font-semibold text-gray-700">
          {resultImage ? 'Result Comparison' : 'Preview'}
        </h2>
      </div>

      <div className={`grid gap-4 ${resultImage ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* Original */}
        {originalImage && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Original Photo</span>
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
              <img
                src={originalImage}
                alt="Original"
                className="w-full object-contain max-h-72"
              />
            </div>
          </div>
        )}

        {/* Result */}
        {resultImage && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-orange-500 uppercase tracking-wide">✨ AI Drawing</span>
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-gray-100 border border-orange-200">
              <img
                src={resultImage}
                alt="AI Drawing"
                className="w-full object-contain max-h-72"
              />
            </div>
          </div>
        )}

        {/* Loading placeholder */}
        {isLoading && !resultImage && originalImage && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-orange-400 uppercase tracking-wide">AI Drawing</span>
            <div className="flex items-center justify-center rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200 max-h-72 h-64">
              <div className="text-center">
                <div className="text-4xl mb-3 animate-pulse">🎨</div>
                <p className="text-orange-500 text-sm font-medium">Creating your drawing...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
