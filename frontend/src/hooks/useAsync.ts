import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../services/api";

/**
 * Gọi API và quản lý 3 trạng thái: đang tải / lỗi / có dữ liệu.
 * `deps` thay đổi -> tự gọi lại. Bỏ qua kết quả cũ nếu có yêu cầu mới hơn.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const reload = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await run();
      if (id === reqId.current) setData(result);
    } catch (e) {
      if (id === reqId.current) setError(getErrorMessage(e));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}
