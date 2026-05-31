import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

// Converts a Supabase storage URL to the render/image endpoint for on-the-fly resizing.
// Non-Supabase URLs (e.g. PCGS CDN) are returned unchanged.
export function imgUrl(src: string, width = 600): string {
  if (!src) return src
  const match = src.match(/^(https:\/\/[^/]+\.supabase\.co)\/storage\/v1\/object\/public\/(.+)$/)
  if (!match) return src
  return `${match[1]}/storage/v1/render/image/public/${match[2]}?width=${width}&quality=80`
}

// Tiny light-gray blurDataURL for placeholder="blur" on Next.js Image components.
export const BLUR_PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
