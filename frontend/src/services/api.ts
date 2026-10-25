import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "fh_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Gắn JWT vào mọi yêu cầu nếu đã đăng nhập.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token hết hạn/không hợp lệ -> phát sự kiện để AuthContext đăng xuất.
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event("fh:unauthorized"));
    }
    return Promise.reject(error);
  },
);

interface ErrorBody {
  message?: string;
  code?: string;
  errors?: { field: string; message: string }[];
}

/** Lấy thông báo lỗi tiếng Việt dễ hiểu từ lỗi API. */
export function getErrorMessage(error: unknown, fallback = "Đã có lỗi xảy ra, vui lòng thử lại"): string {
  if (axios.isAxiosError<ErrorBody>(error)) {
    if (!error.response) return "Không kết nối được máy chủ. Hãy kiểm tra Backend đã chạy chưa.";
    return error.response.data?.message || fallback;
  }
  return fallback;
}

export function getErrorCode(error: unknown): string | undefined {
  return axios.isAxiosError<ErrorBody>(error) ? error.response?.data?.code : undefined;
}

/** Lỗi theo từng trường của form (từ Zod ở Backend). */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError<ErrorBody>(error)) return {};
  const map: Record<string, string> = {};
  for (const e of error.response?.data?.errors ?? []) if (e.field && !map[e.field]) map[e.field] = e.message;
  return map;
}
