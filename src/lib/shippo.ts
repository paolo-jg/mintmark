import { Shippo } from 'shippo'

const shippo = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY! })

export type ShippoAddress = {
  name: string
  street1: string
  street2?: string | null
  city: string
  state: string
  zip: string
  country: string
}

export type ParcelDimensions = {
  weightOz: number
  lengthIn: number
  widthIn: number
  heightIn: number
}

export type ShippoRate = {
  objectId: string
  carrier: string
  serviceLevel: string
  amountCents: number
  currency: string
  estimatedDays: number | null
}

export const INSURANCE_THRESHOLD_CENTS = 10000 // $100

export function requiresInsurance(amountCents: number): boolean {
  return amountCents >= INSURANCE_THRESHOLD_CENTS
}

export async function getRates({
  fromAddress,
  toAddress,
  parcel,
  insuredValueCents,
}: {
  fromAddress: ShippoAddress
  toAddress: ShippoAddress
  parcel: ParcelDimensions
  insuredValueCents: number
}): Promise<{ shippoShipmentId: string; rates: ShippoRate[] }> {
  const shipment = await shippo.shipments.create({
    addressFrom: {
      name: fromAddress.name,
      street1: fromAddress.street1,
      street2: fromAddress.street2 ?? '',
      city: fromAddress.city,
      state: fromAddress.state,
      zip: fromAddress.zip,
      country: fromAddress.country,
    },
    addressTo: {
      name: toAddress.name,
      street1: toAddress.street1,
      street2: toAddress.street2 ?? '',
      city: toAddress.city,
      state: toAddress.state,
      zip: toAddress.zip,
      country: toAddress.country,
    },
    parcels: [{
      massUnit: 'oz',
      weight: String(parcel.weightOz),
      distanceUnit: 'in',
      length: String(parcel.lengthIn),
      width: String(parcel.widthIn),
      height: String(parcel.heightIn),
    }],
    extra: insuredValueCents > 0 ? {
      insurance: {
        amount: String((insuredValueCents / 100).toFixed(2)),
        currency: 'USD',
        content: 'Graded Coin',
      },
    } : undefined,
    async: false,
  })

  const rates: ShippoRate[] = (shipment.rates ?? []).map(rate => ({
    objectId: rate.objectId ?? '',
    carrier: rate.provider ?? '',
    serviceLevel: rate.servicelevel?.name ?? '',
    amountCents: Math.round(parseFloat(rate.amount ?? '0') * 100),
    currency: rate.currency ?? 'USD',
    estimatedDays: rate.estimatedDays ?? null,
  }))

  return { shippoShipmentId: shipment.objectId ?? '', rates }
}

export async function purchaseLabel({
  rateObjectId,
  insuredValueCents: _insuredValueCents,
}: {
  rateObjectId: string
  insuredValueCents: number
}): Promise<{
  shippoTransactionId: string
  trackingNumber: string
  trackingUrlProvider: string
  labelUrl: string
}> {
  const transaction = await shippo.transactions.create({
    rate: rateObjectId,
    labelFileType: 'PDF',
    async: false,
  })

  if (transaction.status !== 'SUCCESS') {
    const messages = (transaction.messages ?? []).map(m => m.text).join(', ')
    throw new Error(messages || 'Label purchase failed')
  }

  return {
    shippoTransactionId: transaction.objectId ?? '',
    trackingNumber: transaction.trackingNumber ?? '',
    trackingUrlProvider: transaction.trackingUrlProvider ?? '',
    labelUrl: transaction.labelUrl ?? '',
  }
}
