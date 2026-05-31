'use client'

import { useState } from 'react'
import { Star, Flag, AlertTriangle, Loader2, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Review {
  id: string
  rating: number
  title: string | null
  body: string | null
  status: string
  created_at: string
}

export interface ReviewableOrder {
  id: string
  amount: number
  created_at: string
}

interface Props {
  sellerId: string
  reviews: Review[]
  reviewableOrders: ReviewableOrder[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}yr ago`
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${sz} ${i <= rating ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`}
        />
      ))}
    </div>
  )
}

// ── Star picker ────────────────────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              i <= (hover || value) ? 'fill-foreground text-foreground' : 'text-muted-foreground/40'
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="text-xs text-muted-foreground ml-1">
          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][value]}
        </span>
      )}
    </div>
  )
}

// ── Write review modal ─────────────────────────────────────────────────────────

function WriteReviewModal({
  sellerId,
  orders,
  onClose,
  onSubmitted,
}: {
  sellerId: string
  orders: ReviewableOrder[]
  onClose: () => void
  onSubmitted: (review: Review) => void
}) {
  const [selectedOrder, setSelectedOrder] = useState(orders[0]?.id ?? '')
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { toast.error('Please select a star rating'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: selectedOrder, sellerId, rating, title, body }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to submit review')
      toast.success('Review submitted!')
      onSubmitted({
        id: json.id,
        rating,
        title: title.trim() || null,
        body: body.trim() || null,
        status: 'published',
        created_at: new Date().toISOString(),
      })
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md border border-border">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h2 className="text-base font-semibold">Write a Review</h2>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 pt-4 space-y-4">
          {orders.length > 1 && (
            <div>
              <label className="block text-xs font-semibold mb-1.5">Order</label>
              <select
                value={selectedOrder}
                onChange={e => setSelectedOrder(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              >
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    {new Date(o.created_at).toLocaleDateString()} - ${(o.amount / 100).toFixed(0)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-2">Rating</label>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">
              Summary <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Great coin, fast shipping"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">
              Details <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Tell others about your experience..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{body.length}/1000</p>
          </div>

          <p className="text-xs text-muted-foreground">
            Reviews are public and can be edited within 7 days of submission.
          </p>

          <Button type="submit" className="w-full" disabled={submitting || rating === 0}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Review'}
          </Button>
        </form>
      </div>
    </div>
  )
}

// ── Single review card ─────────────────────────────────────────────────────────

function ReviewCard({ review, onFlagged }: { review: Review; onFlagged: (id: string) => void }) {
  const [flagging, setFlagging] = useState(false)
  const [flagged, setFlagged] = useState(review.status === 'flagged')

  async function handleFlag() {
    if (flagged) return
    setFlagging(true)
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flag', flagReason: 'User flagged' }),
      })
      if (res.ok) {
        setFlagged(true)
        onFlagged(review.id)
        toast.success('Review flagged for moderation')
      }
    } finally {
      setFlagging(false)
    }
  }

  return (
    <div className={`rounded-xl border px-4 py-4 space-y-2 ${
      flagged ? 'border-border/50 bg-muted/20 opacity-60' : 'border-border bg-card'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <StarDisplay rating={review.rating} />
          {review.title && (
            <p className="text-sm font-semibold leading-snug">{review.title}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-muted-foreground">{relativeDate(review.created_at)}</span>
          {!flagged && (
            <button
              onClick={handleFlag}
              disabled={flagging}
              title="Flag this review"
              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              {flagging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {review.body && (
        <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>
      )}

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
        <CheckCircle2 className="h-3 w-3" />
        <span>Verified purchase</span>
        {flagged && (
          <span className="ml-2 text-amber-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Under review
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export function ReviewSection({ sellerId, reviews: initial, reviewableOrders }: Props) {
  const [reviews, setReviews] = useState<Review[]>(initial)
  const [showModal, setShowModal] = useState(false)

  function handleFlagged(id: string) {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: 'flagged' } : r))
  }

  function handleSubmitted(review: Review) {
    setReviews(prev => [review, ...prev])
  }

  const canReview = reviewableOrders.length > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">
          Reviews
          {reviews.length > 0 && (
            <span className="text-muted-foreground font-normal ml-2">({reviews.length})</span>
          )}
        </h2>
        {canReview && (
          <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
            Write a Review
          </Button>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
          <Star className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No reviews yet</p>
          {canReview && (
            <p className="text-xs text-muted-foreground mt-1">
              Be the first to leave a review.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <ReviewCard key={review.id} review={review} onFlagged={handleFlagged} />
          ))}
        </div>
      )}

      {showModal && (
        <WriteReviewModal
          sellerId={sellerId}
          orders={reviewableOrders}
          onClose={() => setShowModal(false)}
          onSubmitted={handleSubmitted}
        />
      )}
    </div>
  )
}
