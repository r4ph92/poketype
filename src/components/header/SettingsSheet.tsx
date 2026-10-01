'use client';

import { useRef, type ReactNode } from 'react';

export function SettingsSheet({ title, closeLabel, children }: { title: string; closeLabel: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className="settings-trigger pixel-frame-thin" aria-label={title} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6v4l3 2 3-1 2 5-3 2v3l-4 3-2-2h-4l-2 2-4-3v-3l-3-2 2-5 3 1 3-2z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M9 9h6v6H9z" fill="currentColor" /></svg>
    </button>
    <dialog ref={dialog} aria-labelledby="settings-title" className="settings-sheet pixel-frame" onClick={(event) => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.current?.close(); } }}>
      <div className="settings-sheet-heading"><h2 id="settings-title" className="font-pixel text-xl font-bold">{title}</h2><button type="button" className="settings-trigger pixel-frame-thin" aria-label={closeLabel} onClick={() => dialog.current?.close()}><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="m4 4 12 12M16 4 4 16" stroke="currentColor" strokeWidth="2" /></svg></button></div>
      {children}
    </dialog>
  </>;
}
