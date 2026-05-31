import Navbar from '@/components/layout/Navbar'
import { InactivityGuard } from '@/components/layout/inactivity-guard'
import { SWRProvider } from '@/components/providers/swr-provider'
import { PageDataPrefetcher } from '@/components/layout/page-data-prefetcher'
import { NavProvider } from '@/components/layout/nav-context'
import { ChatWidget } from '@/components/chat/chat-widget'
import { KeyInitializer } from '@/components/layout/key-initializer'
import { PlanSelectionGate } from '@/components/layout/plan-selection-gate'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavProvider>
    <SWRProvider>
      <PageDataPrefetcher />
      <KeyInitializer />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">{children}</main>
        <ChatWidget />
        <InactivityGuard />
        <PlanSelectionGate />
      </div>
    </SWRProvider>
    </NavProvider>
  )
}
