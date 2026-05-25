import Navbar from '@/components/layout/Navbar'
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Pedigree Coins. All professionally graded coins only.
          </div>
        </footer>
      </div>
    </SWRProvider>
  )
}
