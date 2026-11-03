import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';

type FormFieldPropsT = {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
};

export function FormField({ id, label, hint, children }: FormFieldPropsT) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
