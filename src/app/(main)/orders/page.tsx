export const dynamic = 'force-dynamic'

import { MyOrdersClient } from './_components/my-orders-client'

export const metadata = { title: 'My Orders' }

export default function MyOrdersPage() {
  return <MyOrdersClient />
}
