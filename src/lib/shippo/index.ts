import { Shippo } from 'shippo'

export const INSURANCE_THRESHOLD_CENTS = 50_000 // $500 — require insurance above this

let _client: Shippo | null = null

function getClient(): Shippo {
  if (!_client) {
    if (!process.env.SHIPPO_API_KEY) throw new Error('SHIPPO_API_KEY is not set')
    _client = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY })
  }
  return _client
}

export interface ShippoAddress {
  name: string
  street1: string
  street2?: string
  city: string
  state: string
  zip: string
  country: string
}

export interface ParcelDimensions {
  weightOz: number
  lengthIn: number
  widthIn: number
  heightIn: number
}

export async function getRates(params: {
  fromAddress: ShippoAddress
  toAddress: ShippoAddress
  parcel: ParcelDimensions
  insuredValueCents: number
}) {
  const shippo = getClient()

  const shipment = await shippo.shipments.create({
    addressFrom: {
        name: params.fromAddress.name,
        street1: params.fromAddress.street1,
        street2: params.fromAddress.street2 ?? '',
        city: params.fromAddress.city,
        state: params.fromAddress.state,
        zip: params.fromAddress.zip,
        country: params.fromAddress.country,
      },
      addressTo: {
        name: params.toAddress.name,
        street1: params.toAddress.street1,
        street2: params.toAddress.street2 ?? '',
        city: params.toAddress.city,
        state: params.toAddress.state,
        zip: params.toAddress.zip,
        country: params.toAddress.country,
      },
      parcels: [
        {
          length: String(params.parcel.lengthIn),
          width: String(params.parcel.widthIn),
          height: String(params.parcel.heightIn),
          distanceUnit: 'in' as const,
          weight: String((params.parcel.weightOz / 16).toFixed(4)),
          massUnit: 'lb' as const,
        },
      ],
      ...(params.insuredValueCents > 0 && {
        extra: {
          insurance: {
            amount: String((params.insuredValueCents / 100).toFixed(2)),
            currency: 'USD',
            content: 'Professionally graded coin',
          },
        },
      }),
      async: false,
  })

  return {
    shippoShipmentId: shipment.objectId ?? '',
    rates: shipment.rates ?? [],
  }
}

export async function purchaseLabel(params: {
  rateObjectId: string
  insuredValueCents: number
}) {
  const shippo = getClient()

  const transaction = await shippo.transactions.create({
    rate: params.rateObjectId,
    labelFileType: 'PDF' as const,
    async: false,
  })

  if (transaction.status !== 'SUCCESS') {
    const msgs = (transaction.messages ?? []).map((m: { text?: string }) => m.text).join(', ')
    throw new Error(msgs || 'Label purchase failed')
  }

  return {
    shippoTransactionId: transaction.objectId ?? '',
    trackingNumber: transaction.trackingNumber ?? '',
    trackingUrlProvider: transaction.trackingUrlProvider ?? '',
    labelUrl: transaction.labelUrl ?? '',
  }
}

export function requiresInsurance(amountCents: number): boolean {
  return amountCents >= INSURANCE_THRESHOLD_CENTS
}
