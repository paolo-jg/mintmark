import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { InactivityGuard } from '@/components/layout/inactivity-guard'
import { SWRProvider } from '@/components/providers/swr-provider'
import { PageDataPrefetcher } from '@/components/layout/page-data-prefetcher'
import { NavProvider } from '@/components/layout/nav-context'
import { ChatWidget } from '@/components/chat/chat-widget'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavProvider>
    <SWRProvider>
      <PageDataPrefetcher />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">{children}</main>
        <ChatWidget />
        <footer className="border-t border-border py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-sm text-muted-foreground">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p>© {new Date().getFullYear()} Pedigree Coins. All professionally rare coins only.</p>
              <div className="flex items-center gap-4">
                <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
                <span aria-hidden>·</span>
                <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              </div>
            </div>
          </div>
        </footer>
        <InactivityGuard />
      </div>
    </SWRProvider>
    </NavProvider>
  )
}
