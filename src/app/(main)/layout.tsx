import Navbar from '@/components/layout/Navbar'

// Prevent static prerendering — pages require auth state from Supabase at runtime
export const dynamic = 'force-dynamic'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} Pedigree Coins. All professionally graded coins only.
        </div>
      </footer>
    </div>
  )
}
