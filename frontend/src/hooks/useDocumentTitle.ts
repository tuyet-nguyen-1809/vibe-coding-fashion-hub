import { useEffect } from "react";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | Fashion Hub` : "Fashion Hub – Thời trang trực tuyến";
  }, [title]);
}
