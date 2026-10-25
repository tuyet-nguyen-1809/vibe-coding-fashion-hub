import clsx from "clsx";
import { Star } from "lucide-react";
import type { OrderStatus } from "../../types";
import { formatVND, ORDER_STATUS } from "../../utils/format";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap", s.className)}>{s.label}</span>;
}

export function Price({ price, salePrice, size = "md" }: { price: number; salePrice: number | null; size?: "sm" | "md" | "lg" }) {
  const onSale = salePrice != null && salePrice < price;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className={clsx("font-semibold", onSale && "text-accent", size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base")}>
        {formatVND(onSale ? salePrice! : price)}
      </span>
      {onSale && <span className={clsx("text-muted line-through", size === "lg" ? "text-base" : "text-xs")}>{formatVND(price)}</span>}
    </div>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} width={size} height={size} className={i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200"} />
      ))}
    </span>
  );
}
