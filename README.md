# Picture to Drawing

AI-powered photo to drawing converter — upload a photo, get a hand-drawn style image.

## Tech Stack

- **Frontend**: Next.js (React) → Cloudflare Pages
- **Backend**: Cloudflare Workers
- **AI**: Replicate API (flux-kontext-max)
- **Rate Limiting**: Cloudflare KV

## Features (MVP)

- Upload JPG/PNG photos (up to 10MB)
- Choose drawing style: Pencil Sketch / Ink Wash / Line Art
- AI conversion powered by Replicate
- Side-by-side comparison (original vs drawing)
- Download result image
- Free 3 conversions per day per IP

## Getting Started

```bash
npm install
npm run dev
```

## Deployment

Deploy frontend to Cloudflare Pages, backend Worker to Cloudflare Workers.

Set environment variables:
- `REPLICATE_API_TOKEN` — your Replicate API key
