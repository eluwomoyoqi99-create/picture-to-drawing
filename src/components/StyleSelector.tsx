interface Style {
  id: string
  label: string
  labelCn: string
  emoji: string
  prompt: string
}

interface StyleSelectorProps {
  styles: Style[]
  selected: string
  onChange: (id: string) => void
  disabled?: boolean
}

export default function StyleSelector({ styles, selected, onChange, disabled }: StyleSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {styles.map((style) => (
        <button
          key={style.id}
          onClick={() => !disabled && onChange(style.id)}
          disabled={disabled}
          className={`
            relative p-5 rounded-2xl border-2 text-center transition-all duration-200
            ${selected === style.id
              ? 'border-orange-500 bg-orange-50 shadow-sm shadow-orange-200'
              : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'
            }
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {/* Selected indicator */}
          {selected === style.id && (
            <span className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
          <div className="text-4xl mb-2 select-none">{style.emoji}</div>
          <div className={`font-semibold text-sm ${selected === style.id ? 'text-orange-700' : 'text-gray-700'}`}>
            {style.labelCn}
          </div>
          <div className={`text-xs mt-0.5 ${selected === style.id ? 'text-orange-500' : 'text-gray-400'}`}>
            {style.label}
          </div>
        </button>
      ))}
    </div>
  )
}
