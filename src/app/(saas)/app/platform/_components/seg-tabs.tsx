'use client';

import { cn } from 'cn';

type SegTabsPropsT<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
};

export function SegTabs<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegTabsPropsT<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex flex-wrap gap-1 rounded-[12px] bg-[rgba(15,27,51,0.05)] p-1',
        className
      )}
    >
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-8 rounded-[9px] px-3 text-[12.5px] font-semibold text-m2-ink-2 transition-[background,box-shadow] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none',
            option.value === value
              ? 'bg-white text-m2-ink shadow-[0_1px_2px_rgba(15,27,51,0.08)]'
              : 'hover:bg-white/55'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
