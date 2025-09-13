'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, Table } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/explorer', icon: Table, label: 'Data Explorer' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-16 bg-gray-800 text-white flex flex-col items-center py-4">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={cn(
                'my-4 p-2 rounded-lg cursor-pointer',
                pathname === item.href ? 'bg-gray-700' : 'hover:bg-gray-700'
              )}
              title={item.label}
            >
              <item.icon size={24} />
            </div>
          </Link>
        ))}
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
