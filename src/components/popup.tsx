'use client';
import { useRef } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
export function Popup({
  title,
  label,
  children,
}: {
  title: string;
  label: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button className="text-link" onClick={() => ref.current?.showModal()}>
        {label}
        <ArrowUpRight size={16} />
      </button>
      <dialog
        ref={ref}
        className="league-dialog"
        aria-label={title}
        onClick={(e) => {
          if (e.target === ref.current) ref.current.close();
        }}
      >
        <div className="dialog-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Cerrar" onClick={() => ref.current?.close()}>
            <X />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </dialog>
    </>
  );
}
