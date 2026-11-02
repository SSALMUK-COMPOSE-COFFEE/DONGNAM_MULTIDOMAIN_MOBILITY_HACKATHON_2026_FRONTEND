'use client';

import { cn } from 'cn';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { IS_API_MOCKING } from '@/consts/api';
import { DEMO_NAV } from '@/consts/route';

export function DemoNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-10 px-8">
        <Link href="/" className="flex items-center gap-2 text-xl font-black text-navy">
          프레시스위치
          <span className="text-brand">≈</span>
        </Link>

        <nav className="flex gap-6">
          {DEMO_NAV.map(({ href, step, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : false}
              className={cn(
                'flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-bold text-muted-foreground',
                pathname === href && 'bg-brand-soft text-navy'
              )}
            >
              <span
                className={cn(
                  'rounded-full bg-line px-2 py-0.5 text-xs num text-navy',
                  pathname === href && 'bg-navy text-white'
                )}
              >
                {step}
              </span>
              {label}
            </Link>
          ))}
        </nav>

        {IS_API_MOCKING && (
          <Badge variant="secondary" className="ml-auto">
            목업 데이터
          </Badge>
        )}
      </div>
    </header>
  );
}
