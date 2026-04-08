export default function LoadingSpinner() {
  return (
    <div className="relative w-8 h-8">
      <div className="absolute inset-0 rounded-full border-4 border-orange-200" />
      <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
    </div>
  )
}
