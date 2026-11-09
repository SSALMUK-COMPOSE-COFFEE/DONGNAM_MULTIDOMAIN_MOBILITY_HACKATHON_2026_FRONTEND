'use client';

import { cn } from 'cn';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { DemoResetButton } from '@/components/demo-reset-button';
import { Badge } from '@/components/ui/badge';
import { IS_API_MOCKING } from '@/consts/api';
import { DEMO_APPENDIX_NAV, DEMO_NAV } from '@/consts/route';

export function DemoNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-8">
        <div className="flex h-full items-center gap-12">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-2xl font-black tracking-tight text-navy"
          >
            프레시스위치
            <span className="text-brand">≈</span>
          </Link>

          <nav aria-label="시연 단계 및 부록" className="flex h-full items-center gap-8">
            <div className="flex h-full items-stretch">
              {DEMO_NAV.map(({ href, step, label }, index) => {
                const isActive = pathname === href;
                return (
                  <div key={href} className="flex h-full items-center">
                    {index > 0 && (
                      <span
                        aria-hidden="true"
                        className="px-2 text-lg font-light text-line select-none"
                      >
                        /
                      </span>
                    )}
                    <Link
                      href={href}
                      aria-current={isActive ? 'page' : false}
                      className={cn(
                        'relative flex h-full items-center gap-3 px-4 text-lg transition-colors',
                        'after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t-full after:transition-all',
                        isActive
                          ? 'font-black text-navy after:bg-brand'
                          : 'font-semibold text-muted-foreground after:bg-transparent hover:text-navy hover:after:bg-line'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-black num tracking-wider transition-colors',
                          isActive ? 'bg-navy text-white' : 'bg-brand-soft text-brand'
                        )}
                      >
                        {step}
                      </span>
                      <span className="tracking-tight">{label}</span>
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center rounded-xl border border-line bg-brand-soft/60 p-1.5">
              <span className="px-3 text-xs font-black tracking-widest text-brand">부록</span>
              <div className="flex items-center gap-1 border-l border-line pl-1.5">
                {DEMO_APPENDIX_NAV.map(({ href, label }) => {
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={isActive ? 'page' : false}
                      className={cn(
                        'rounded-lg px-3.5 py-2 text-sm tracking-tight transition-all',
                        isActive
                          ? 'bg-navy font-black text-white shadow-xs'
                          : 'font-bold text-muted-foreground hover:bg-white hover:text-navy'
                      )}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {IS_API_MOCKING && <Badge variant="secondary">목업 데이터</Badge>}
          <DemoResetButton />
        </div>
      </div>
    </header>
  );
}
