export type GradingService = 'PCGS' | 'NGC' | 'ANACS' | 'ICG' | 'SEGS' | 'Ungraded'

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

export interface Address {
  id: string
  userId: string
  name: string
  street1: string
  street2?: string
  city: string
  state: string
  zip: string
  country: string
  isDefault: boolean
  createdAt: string
}

export type OrderStatus =
  | 'awaiting_shipment'
  | 'label_purchased'
  | 'shipped'
  | 'delivered'
  | 'disputed'
  | 'complete'
  | 'cancelled'

export type TrackingStatus =
  | 'pre_transit'
  | 'transit'
  | 'delivered'
  | 'returned'
  | 'failure'
  | 'unknown'

export interface Order {
  id: string
  transactionId: string
  listingId: string
  buyerId: string
  sellerId: string
  amount: number // cents
  shipToName: string
  shipToStreet1: string
  shipToStreet2?: string
  shipToCity: string
  shipToState: string
  shipToZip: string
  shipToCountry: string
  status: OrderStatus
  autoConfirmAt?: string
  createdAt: string
  updatedAt: string
  // Joined
  listing?: Partial<Listing>
  shipment?: Partial<Shipment>
}

export interface Shipment {
  id: string
  orderId: string
  carrier: string
  serviceLevel: string
  trackingNumber?: string
  trackingUrl?: string
  trackingStatus: TrackingStatus
  labelPurchasedAt?: string
  insured: boolean
  insuredValue?: number // cents
  weightOz?: number
  lengthIn?: number
  widthIn?: number
  heightIn?: number
  rateAmount?: number // cents
  estimatedDeliveryDate?: string
  shippedAt?: string
  deliveredAt?: string
  createdAt: string
  updatedAt: string
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
