'use client';

import { useId, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';

export function MobileNavigation({ children, label = 'Menu' }: { children: React.ReactNode; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  function close() { dialog.current?.close(); }
  return <div className="mobile-menu">
    <button type="button" className="mobile-menu-trigger" aria-label={`Buka ${label}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => { dialog.current?.showModal(); setOpen(true); }}><Menu size={21} /></button>
    <dialog ref={dialog} id={id} className="mobile-drawer" aria-labelledby={`${id}-title`} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="drawer-heading"><strong id={`${id}-title`}>{label}</strong><button type="button" autoFocus aria-label={`Tutup ${label}`} onClick={close}><X size={20} /></button></div>
      <div className="drawer-links" onClick={event => { if ((event.target as HTMLElement).closest('a')) close(); }}>{children}</div>
    </dialog>
  </div>;
}
