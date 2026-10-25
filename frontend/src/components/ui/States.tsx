import type { ReactNode } from "react";
import { AlertTriangle, PackageOpen } from "lucide-react";

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-paper text-muted">{icon ?? <PackageOpen className="size-7" />}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50/50 px-6 py-12 text-center">
      <AlertTriangle className="mb-3 size-8 text-red-500" />
      <p className="max-w-md text-sm text-red-700">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-outline btn-sm mt-4">
          Thử lại
        </button>
      )}
    </div>
  );
}
