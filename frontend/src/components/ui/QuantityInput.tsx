import { Minus, Plus } from "lucide-react";

export function QuantityInput({ value, min = 1, max, onChange, disabled }: { value: number; min?: number; max: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex items-center rounded-full border border-line">
      <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-neutral-100 disabled:opacity-40" onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="Giảm số lượng">
        <Minus className="size-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-medium tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-neutral-100 disabled:opacity-40" onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Tăng số lượng">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
