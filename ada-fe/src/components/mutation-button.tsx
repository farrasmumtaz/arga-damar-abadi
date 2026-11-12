'use client';

import { useFormStatus } from 'react-dom';
import type { ButtonHTMLAttributes } from 'react';

export function MutationButton({ confirmation, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { confirmation?: string }) {
  const { pending } = useFormStatus();
  return <button {...props} disabled={pending || props.disabled} onClick={event => {
    if (confirmation && !window.confirm(confirmation)) event.preventDefault();
    else props.onClick?.(event);
  }}>{pending ? 'Memproses…' : children}</button>;
}
