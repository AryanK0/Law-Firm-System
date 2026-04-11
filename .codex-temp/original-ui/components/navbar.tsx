'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Cases', href: '/cases' },
    { label: 'Clients', href: '/clients' },
    { label: 'Documents', href: '/documents' },
    { label: 'Tickets', href: '/tickets' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ backgroundColor: 'rgba(11, 17, 32, 0.8)', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold text-foreground tracking-tight">
          Law Firm
        </Link>

        <div className="flex items-center gap-12">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium smooth-transition relative ${
                pathname === item.href
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
              {pathname === item.href && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full"></span>
              )}
            </Link>
          ))}
        </div>

        <button className="px-4 py-2 text-sm font-medium text-primary border border-primary smooth-transition rounded-lg hover:bg-primary hover:text-primary-foreground">
          Sign In
        </button>
      </div>
    </nav>
  );
}
