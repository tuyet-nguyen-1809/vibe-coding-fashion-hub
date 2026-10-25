import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

function pages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("...");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("...");
  out.push(total);
  return out;
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Phân trang">
      <button type="button" className="grid size-9 place-items-center rounded-full border border-line hover:border-ink disabled:opacity-40" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Trang trước">
        <ChevronLeft className="size-4" />
      </button>
      {pages(page, totalPages).map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="px-1 text-muted">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={clsx("grid size-9 place-items-center rounded-full text-sm", p === page ? "bg-ink text-white" : "hover:bg-neutral-100")}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className="grid size-9 place-items-center rounded-full border border-line hover:border-ink disabled:opacity-40" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Trang sau">
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
