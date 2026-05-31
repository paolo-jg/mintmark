// Auth pages use Supabase client at render time - disable static prerendering
export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
