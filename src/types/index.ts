export type GradingService = 'PCGS' | 'NGC' | 'ANACS' | 'ICG' | 'SEGS'

export type VerificationStatus = 'verified' | 'unverified' | 'pending'

export type ListingStatus = 'active' | 'sold' | 'expired' | 'draft'

export type ListingType = 'fixed' | 'auction'

export type UserRole = 'buyer' | 'seller' | 'dealer'

export interface CoinGrade {
  service: GradingService
  certNumber: string
  grade: string // e.g. "MS-65", "PR-70"
  verificationStatus: VerificationStatus
  cacDesignation: boolean
  // Populated from API for PCGS/NGC
  coinName?: string
  year?: number
  mintMark?: string
  denomination?: string
  composition?: string
  diameter?: number
  weight?: number
  populationAtGrade?: number
  populationAbove?: number
  pcgsImageUrl?: string
}

export interface Listing {
  id: string
  sellerId: string
  title: string
  description: string
  price: number // in cents
  images: string[]
  coinGrade: CoinGrade
  listingType: ListingType
  status: ListingStatus
  createdAt: string
  updatedAt: string
  // Auction fields
  auctionId?: string
}

export interface Auction {
  id: string
  listingId: string
  startPrice: number // in cents
  currentBid: number // in cents
  reservePrice?: number // in cents
  startTime: string
  endTime: string
  bidCount: number
  highBidderId?: string
}

export interface Bid {
  id: string
  auctionId: string
  bidderId: string
  amount: number // in cents
  createdAt: string
}

export interface Profile {
  id: string
  email: string
  username: string
  role: UserRole
  avatarUrl?: string
  bio?: string
  dealerVerified: boolean
  createdAt: string
  // Stats
  totalSales?: number
  totalPurchases?: number
  rating?: number
}

export interface WantListItem {
  id: string
  userId: string
  coinName: string
  year?: number
  mintMark?: string
  gradingService?: GradingService
  minGrade?: string
  maxPrice?: number
  notes?: string
  createdAt: string
}

export interface Transaction {
  id: string
  listingId: string
  buyerId: string
  sellerId: string
  amount: number // in cents
  stripePaymentIntentId: string
  status: 'pending' | 'held' | 'released' | 'refunded'
  createdAt: string
}
