import clsx from "clsx";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Đang tải"
      className={clsx("inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}

export function PageLoader({ label = "Đang tải dữ liệu..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner className="size-7 text-ink" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
