import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Picture to Drawing - AI Photo to Hand-drawn Art',
  description: 'Upload your photo and let AI convert it into beautiful hand-drawn art: pencil sketch, ink wash, or line art.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
