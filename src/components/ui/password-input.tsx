'use client';

import { Eye, EyeOff } from 'lucide-react';
import { type ComponentProps, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function PasswordInput({
  className,
  style,
  id,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative flex w-full min-w-0">
      <Input
        {...props}
        id={id}
        disabled={disabled}
        className={className}
        style={{ ...style, paddingInlineEnd: 48 }}
        type={visible ? 'text' : 'password'}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-1/2 right-0 size-11! -translate-y-1/2 cursor-pointer text-muted-foreground"
        disabled={disabled}
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
        aria-pressed={visible}
        aria-controls={id}
        onPointerDown={event => {
          const input = event.currentTarget.parentElement?.querySelector('input');
          if (input === document.activeElement) event.preventDefault();
        }}
        onClick={event => {
          const input = event.currentTarget.parentElement?.querySelector('input');
          const wasFocused = input === document.activeElement;
          const start = input?.selectionStart ?? null;
          const end = input?.selectionEnd ?? null;
          const direction = input?.selectionDirection ?? 'none';
          setVisible(previous => !previous);
          if (input && wasFocused) {
            requestAnimationFrame(() => {
              if (!input.isConnected) return;
              input.focus({ preventScroll: true });
              if (start !== null && end !== null) input.setSelectionRange(start, end, direction);
            });
          }
        }}
      >
        {visible ? (
          <EyeOff aria-hidden className="size-4" />
        ) : (
          <Eye aria-hidden className="size-4" />
        )}
      </Button>
    </div>
  );
}
