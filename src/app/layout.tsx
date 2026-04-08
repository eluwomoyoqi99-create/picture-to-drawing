import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Picture to Drawing — AI Photo to Hand-drawn Art',
  description:
    'Upload your photo and let AI convert it into beautiful hand-drawn art: pencil sketch, ink wash, or line art. Free to try, no account required.',
  keywords: ['photo to drawing', 'AI art', 'pencil sketch', 'image converter', 'hand drawn'],
  openGraph: {
    title: 'Picture to Drawing',
    description: 'Turn your photos into beautiful hand-drawn art with AI',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
