import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { CookieBanner } from '@/components/layout/cookie-banner'
import { SWRProvider } from '@/components/providers/swr-provider'
import { PageDataPrefetcher } from '@/components/layout/page-data-prefetcher'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SWRProvider>
      <PageDataPrefetcher />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-sm text-muted-foreground">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p>© {new Date().getFullYear()} Pedigree Coins. All professionally graded coins only.</p>
              <div className="flex items-center gap-4">
                <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                <span aria-hidden>·</span>
                <button
                  id="cookie-settings-btn"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('pc_cookie_consent')
                      window.location.reload()
                    }
                  }}
                  className="hover:text-foreground transition-colors cursor-pointer"
                >
                  Cookie Settings
                </button>
                <span aria-hidden>·</span>
                <Link href="/privacy#section-10" className="hover:text-foreground transition-colors">
                  Do Not Sell or Share My Personal Information
                </Link>
              </div>
            </div>
          </div>
        </footer>
        <CookieBanner />
      </div>
    </SWRProvider>
  )
}
