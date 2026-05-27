'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  AlertTriangle,
  Tag,
  Settings2,
  ChevronRight,
  Banknote,
  BarChart3,
  ScrollText,
} from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/finance', label: 'Finance', icon: BarChart3 },
  { href: '/admin/payouts', label: 'Payouts', icon: Banknote },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
  { href: '/admin/listings', label: 'Listings', icon: Tag },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
  { href: '/admin/platform', label: 'Platform', icon: Settings2 },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
      <div className="px-5 py-5 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/admin" className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="" className="h-7 w-7" />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Admin</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3 w-3 opacity-50" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800">
        <Link
          href="/"
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          Back to site
        </Link>
      </div>
    </aside>
  )
}
