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
      return lookupNGC(certNumber)
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
    default:
      return { success: false, error: 'Unknown grading service' }
  }
}

async function lookupPCGS(certNumber: string): Promise<CertLookupResult> {
  try {
    const res = await fetch(
      `https://api.pcgs.com/publicapi/coindetail/GetCoinDetailsByCertNo?certNo=${certNumber}`,
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

    if (!data || data.PCGSNo === 0) {
      return { success: false, error: 'PCGS cert not found' }
    }

    return {
      success: true,
      data: {
        service: 'PCGS',
        certNumber,
        verificationStatus: 'verified',
        grade: data.GradeString ?? '',
        coinName: data.Name ?? '',
        year: data.Year ?? undefined,
        mintMark: data.MintMark ?? undefined,
        denomination: data.Denomination ?? undefined,
        populationAtGrade: data.PopulationAtGrade ?? undefined,
        populationAbove: data.PopulationHigher ?? undefined,
        pcgsImageUrl: data.MobileImageUrl ?? undefined,
      },
    }
  } catch {
    return { success: false, error: 'Failed to reach PCGS API' }
  }
}

async function lookupNGC(certNumber: string): Promise<CertLookupResult> {
  try {
    const res = await fetch(
      `https://api.ngccoin.com/coin/v1/certlookup/${certNumber}/1/`,
      {
        headers: {
          'x-api-token': process.env.NGC_API_KEY ?? '',
        },
        next: { revalidate: 3600 },
      }
    )

    if (!res.ok) {
      return { success: false, error: 'NGC cert not found' }
    }

    const data = await res.json()
    const coin = data?.coins?.[0]

    if (!coin) {
      return { success: false, error: 'NGC cert not found' }
    }

    return {
      success: true,
      data: {
        service: 'NGC',
        certNumber,
        verificationStatus: 'verified',
        grade: coin.grade ?? '',
        coinName: coin.coinName ?? '',
        year: coin.year ?? undefined,
        mintMark: coin.mintMark ?? undefined,
        denomination: coin.denomination ?? undefined,
      },
    }
  } catch {
    return { success: false, error: 'Failed to reach NGC API' }
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
  return service === 'PCGS' || service === 'NGC'
}

export const GRADING_SERVICES: { value: GradingService; label: string; autoVerified: boolean }[] = [
  { value: 'PCGS', label: 'PCGS', autoVerified: true },
  { value: 'NGC', label: 'NGC', autoVerified: true },
  { value: 'ANACS', label: 'ANACS', autoVerified: false },
  { value: 'ICG', label: 'ICG', autoVerified: false },
  { value: 'SEGS', label: 'SEGS', autoVerified: false },
]
