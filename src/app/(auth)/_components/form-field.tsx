import type { ReactNode } from 'react';

type FormFieldPropsT = {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
};

export function FormField({ id, label, hint, children }: FormFieldPropsT) {
  return (
    <div className="m2-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="m2-sub mt-0 text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
