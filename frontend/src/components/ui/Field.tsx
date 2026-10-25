import type { ReactNode } from "react";

export function Field({ label, error, children, hint, htmlFor }: { label: string; error?: string; children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
