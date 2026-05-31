import Sidebar from '@/components/layout/Sidebar'
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
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
          {/* spacer for mobile top bar */}
          <div className="md:hidden h-14 shrink-0" />
          <main className="flex-1">{children}</main>
          <ChatWidget />
          <InactivityGuard />
          <PlanSelectionGate />
        </div>
      </div>
    </SWRProvider>
    </NavProvider>
  )
}
