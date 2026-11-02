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
    <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-8 px-8">
        <Link href="/" className="font-heading text-xl font-extrabold text-sea">
          프레시스위치
        </Link>

        <nav className="flex gap-6">
          {DEMO_NAV.map(({ href, step, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : false}
              className={cn(
                'border-b-2 border-transparent py-1 text-sm font-bold text-muted-foreground',
                pathname === href && 'border-sea text-foreground'
              )}
            >
              <span className="mr-1.5 num text-sea">{step}</span>
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
