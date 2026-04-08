'use client'

import { useRef, useState, useCallback } from 'react'

interface UploadZoneProps {
  onFileSelect: (dataUrl: string) => void
  currentImage: string | null
  disabled?: boolean
}

const MAX_SIZE_MB = 10

export default function UploadZone({ onFileSelect, currentImage, disabled }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')

  const processFile = useCallback((file: File) => {
    setError('')
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Only JPG and PNG files are supported')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB}MB`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => onFileSelect(reader.result as string)
    reader.readAsDataURL(file)
  }, [onFileSelect])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [disabled, processFile])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click()
  }

  if (currentImage) {
    return (
      <div className="relative group">
        <img
          src={currentImage}
          alt="Uploaded photo"
          className="w-full max-h-64 object-contain rounded-2xl border-2 border-orange-200 bg-gray-50"
        />
        {!disabled && (
          <button
            onClick={handleClick}
            className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium text-sm"
          >
            📷 Change Photo
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    )
  }

  return (
    <div>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all duration-200
          ${isDragging
            ? 'border-orange-500 bg-orange-50 scale-[1.01]'
            : 'border-orange-300 hover:border-orange-400 hover:bg-orange-50/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="text-5xl mb-4 select-none">{isDragging ? '📥' : '📷'}</div>
        <p className="text-gray-600 font-medium text-lg mb-1">
          {isDragging ? 'Drop your photo here' : 'Click or drag photo here'}
        </p>
        <p className="text-gray-400 text-sm">JPG or PNG · Up to {MAX_SIZE_MB}MB</p>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
    </div>
  )
}
