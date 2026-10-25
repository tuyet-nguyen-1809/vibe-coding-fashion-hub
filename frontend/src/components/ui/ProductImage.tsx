import { useState } from "react";
import { Shirt } from "lucide-react";
import clsx from "clsx";

/** Ảnh sản phẩm có ảnh dự phòng: không bao giờ hiện icon ảnh vỡ nếu link ảnh lỗi. */
export function ProductImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (failed || !src) {
    return (
      <div className={clsx("flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-400", className)}>
        <Shirt className="size-10" strokeWidth={1.25} />
        <span className="line-clamp-2 px-4 text-center text-xs font-medium text-neutral-500">{alt}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={clsx("object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0", className)}
    />
  );
}
