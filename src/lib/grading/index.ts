import { type CoinGrade, type GradingService, type VerificationStatus } from '@/types'

export interface CertLookupResult {
  success: boolean
  data?: Partial<CoinGrade>
  error?: string
}

export async function lookupCert(
  service: GradingService,
  certNumber: string
): Promise<CertLookupResult> {
  switch (service) {
    case 'PCGS':
      return lookupPCGS(certNumber)
    case 'NGC':
      return Promise.resolve(lookupNGC(certNumber))
    case 'ANACS':
    case 'ICG':
    case 'SEGS':
      return {
        success: true,
        data: {
          service,
          certNumber,
          verificationStatus: 'unverified' as VerificationStatus,
        },
      }
    case 'Ungraded':
      return { success: false, error: 'Not applicable for ungraded coins' }
    default:
      return { success: false, error: 'Unknown grading service' }
  }
}

async function lookupPCGS(certNumber: string): Promise<CertLookupResult> {
  try {
    const res = await fetch(
      `https://api.pcgs.com/publicapi/coindetail/GetCoinFactsByCertNo/${certNumber}`,
      {
        headers: {
          Authorization: `bearer ${process.env.PCGS_API_KEY}`,
        },
        next: { revalidate: 3600 },
      }
    )

    if (!res.ok) {
      return { success: false, error: 'PCGS cert not found' }
    }

    const data = await res.json()

    if (!data?.IsValidRequest || data.ServerMessage !== 'Request successful') {
      return { success: false, error: 'PCGS cert not found' }
    }

    return {
      success: true,
      data: {
        service: 'PCGS',
        certNumber,
        verificationStatus: 'verified',
        grade: data.Grade ?? '',
        coinName: data.Name ?? '',
        year: data.Year > 0 ? data.Year : undefined,
        mintMark: data.MintMark ?? undefined,
        denomination: data.Denomination ?? undefined,
        populationAtGrade: data.Population ?? undefined,
        populationAbove: data.PopHigher ?? undefined,
        pcgsImageUrl: data.Images?.length > 0 ? data.Images[0] : undefined,
      },
    }
  } catch {
    return { success: false, error: 'Failed to reach PCGS API' }
  }
}

// NGC does not expose a public API and their site is behind Cloudflare bot protection.
// We accept NGC cert numbers on trust and show a buyer-facing "Verify on NGC" link.
// Sellers still must enter a cert number; listings display as "Unverified (NGC)" with
// a direct link to ngccoin.com/certlookup so buyers can confirm before purchasing.
function lookupNGC(certNumber: string): CertLookupResult {
  return {
    success: true,
    data: {
      service: 'NGC',
      certNumber,
      verificationStatus: 'unverified',
    },
  }
}

/**
 * Returns a buyer-facing URL to verify a cert on the grading service's own site.
 * Returns null for PCGS (auto-verified via API) and SEGS (no functional lookup).
 */
export function getVerifyUrl(service: GradingService, certNumber: string): string | null {
  switch (service) {
    case 'NGC':   return ngcVerifyUrl(certNumber)
    case 'ANACS': return anacsVerifyUrl(certNumber)
    case 'ICG':   return icgVerifyUrl(certNumber)
    case 'Ungraded': return null
    default:      return null
  }
}

export function getVerificationBadgeLabel(status: VerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'Verified'
    case 'unverified':
      return 'Unverified Listing'
    case 'pending':
      return 'Pending Verification'
  }
}

export function isAutoVerified(service: GradingService): boolean {
  return service === 'PCGS'
}

/** Returns a direct link buyers can use to verify an NGC cert on ngccoin.com */
export function ngcVerifyUrl(certNumber: string): string {
  return `https://www.ngccoin.com/certlookup/${encodeURIComponent(certNumber)}/All/`
}

/** Returns a direct link buyers can use to verify an ANACS cert on anacs.com */
export function anacsVerifyUrl(certNumber: string): string {
  return `https://anacs.com/verify/?cert=${encodeURIComponent(certNumber)}`
}

/** Returns a direct link buyers can use to verify an ICG cert on icgcoin.com */
export function icgVerifyUrl(certNumber: string): string {
  return `https://www.icgcoin.com/verification/?searchsn=${encodeURIComponent(certNumber)}`
}

export const GRADING_SERVICES: { value: GradingService; label: string; autoVerified: boolean }[] = [
  { value: 'PCGS', label: 'PCGS', autoVerified: true },
  { value: 'NGC', label: 'NGC', autoVerified: false },
  { value: 'ANACS', label: 'ANACS', autoVerified: false },
  { value: 'ICG', label: 'ICG', autoVerified: false },
  { value: 'SEGS', label: 'SEGS', autoVerified: false },
  { value: 'Ungraded', label: 'Ungraded', autoVerified: false },
]
