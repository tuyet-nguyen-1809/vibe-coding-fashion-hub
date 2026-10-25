import { api } from "./api";
import type {
  ApiResponse,
  Cart,
  Category,
  ChatSuggestion,
  Order,
  OrderStatus,
  Paginated,
  Product,
  Review,
  ReviewSummary,
  User,
} from "../types";

type Params = Record<string, string | number | boolean | undefined | null>;

const clean = (p: Params = {}) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ""));

async function getPaged<T>(url: string, params?: Params): Promise<Paginated<T>> {
  const { data } = await api.get<ApiResponse<T[]>>(url, { params: clean(params) });
  return { items: data.data, meta: data.meta! };
}

// ---------- Auth ----------
export const authApi = {
  login: (body: { email: string; password: string }) =>
    api.post<ApiResponse<{ user: User; token: string }>>("/auth/login", body).then((r) => r.data.data),
  register: (body: { name: string; email: string; phone?: string; password: string; confirmPassword: string }) =>
    api.post<ApiResponse<{ user: User; token: string }>>("/auth/register", body).then((r) => r.data.data),
  me: () => api.get<ApiResponse<User>>("/auth/me").then((r) => r.data.data),
  updateProfile: (body: { name: string; phone?: string }) => api.put<ApiResponse<User>>("/auth/me", body).then((r) => r.data.data),
  changePassword: (body: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api.put<ApiResponse<null>>("/auth/change-password", body).then((r) => r.data),
};

// ---------- Sản phẩm & danh mục ----------
export interface ProductQuery extends Params {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  featured?: string;
  onSale?: string;
}

export const productApi = {
  list: (params: ProductQuery) => getPaged<Product>("/products", params),
  detail: (slug: string) =>
    api.get<ApiResponse<{ product: Product; related: Product[] }>>(`/products/${encodeURIComponent(slug)}`).then((r) => r.data.data),
  reviews: (id: number, page = 1) =>
    api
      .get<ApiResponse<Review[]> & { summary: ReviewSummary }>(`/products/${id}/reviews`, { params: { page } })
      .then((r) => ({ items: r.data.data, summary: r.data.summary, meta: r.data.meta! })),
  eligibility: (id: number) =>
    api.get<ApiResponse<{ canReview: boolean; hasPurchased: boolean; hasReviewed: boolean }>>(`/products/${id}/reviews/eligibility`).then((r) => r.data.data),
  createReview: (id: number, body: { rating: number; comment: string }) =>
    api.post<ApiResponse<Review>>(`/products/${id}/reviews`, body).then((r) => r.data.data),
};

export const categoryApi = {
  list: () => api.get<ApiResponse<Category[]>>("/categories").then((r) => r.data.data),
};

// ---------- Giỏ hàng ----------
export const cartApi = {
  get: () => api.get<ApiResponse<Cart>>("/cart").then((r) => r.data.data),
  add: (variantId: number, quantity: number) => api.post<ApiResponse<Cart>>("/cart/items", { variantId, quantity }).then((r) => r.data.data),
  update: (variantId: number, quantity: number) =>
    api.patch<ApiResponse<Cart>>(`/cart/items/${variantId}`, { quantity }).then((r) => r.data.data),
  remove: (variantId: number) => api.delete<ApiResponse<Cart>>(`/cart/items/${variantId}`).then((r) => r.data.data),
  clear: () => api.delete<ApiResponse<Cart>>("/cart").then((r) => r.data.data),
  merge: (items: { variantId: number; quantity: number }[]) => api.post<ApiResponse<Cart>>("/cart/merge", { items }).then((r) => r.data.data),
  preview: (items: { variantId: number; quantity: number }[]) =>
    api.post<ApiResponse<Cart>>("/cart/preview", { items }).then((r) => r.data.data),
};

// ---------- Đơn hàng ----------
export interface CreateOrderBody {
  recipientName: string;
  phone: string;
  address: string;
  note?: string;
  paymentMethod: "COD" | "MOCK_ONLINE";
  idempotencyKey: string;
}

export const orderApi = {
  create: (body: CreateOrderBody) => api.post<ApiResponse<Order>>("/orders", body).then((r) => r.data.data),
  listMine: (params: Params) => getPaged<Order>("/orders", params),
  getMine: (id: number) => api.get<ApiResponse<Order>>(`/orders/${id}`).then((r) => r.data.data),
  cancel: (id: number, reason?: string) => api.patch<ApiResponse<Order>>(`/orders/${id}/cancel`, { reason }).then((r) => r.data.data),
};

// ---------- Chatbot ----------
export const chatApi = {
  status: () => api.get<ApiResponse<{ enabled: boolean; provider: string; model: string }>>("/chat/status").then((r) => r.data.data),
  send: (messages: { role: "user" | "assistant"; content: string }[]) =>
    api.post<ApiResponse<{ reply: string; suggestions: ChatSuggestion[] }>>("/chat", { messages }).then((r) => r.data.data),
};

// ---------- Quản trị ----------
export interface DashboardData {
  revenueRule: string;
  stats: {
    totalRevenue: number;
    completedOrders: number;
    pendingRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    processingOrders: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    revenueInRange: number;
  };
  revenueSeries: { date: string; revenue: number; completedOrders: number; newOrders: number }[];
  statusBreakdown: { status: OrderStatus; count: number; total: number }[];
  latestOrders: { id: number; code: string; recipientName: string; total: number; status: OrderStatus; createdAt: string; user: { name: string } }[];
  topProducts: { productId: number | null; name: string; quantity: number; revenue: number }[];
  lowStockList: { id: number; name: string; sku: string; imageUrl: string; totalStock: number }[];
  lowStockThreshold: number;
  days: number;
}

export interface ProductPayload {
  sku: string;
  name: string;
  description: string;
  price: number;
  salePrice: number | null;
  imageUrl: string;
  categoryId: number;
  isFeatured: boolean;
  status: "ACTIVE" | "INACTIVE";
  variants: { id?: number; size: string; color: string; stock: number }[];
}

export interface AdminCustomer extends User {
  orderCount: number;
  totalSpent: number;
}

export interface AdminCustomerDetail extends AdminCustomer {
  orders: { id: number; code: string; total: number; status: OrderStatus; paymentMethod: string; createdAt: string; _count: { items: number } }[];
}

export const adminApi = {
  dashboard: (days: number) => api.get<ApiResponse<DashboardData>>("/admin/dashboard", { params: { days } }).then((r) => r.data.data),

  products: (params: Params) => getPaged<Product>("/admin/products", params),
  product: (id: number) => api.get<ApiResponse<Product>>(`/admin/products/${id}`).then((r) => r.data.data),
  createProduct: (body: ProductPayload) => api.post<ApiResponse<Product>>("/admin/products", body).then((r) => r.data),
  updateProduct: (id: number, body: ProductPayload) => api.put<ApiResponse<Product>>(`/admin/products/${id}`, body).then((r) => r.data),
  setProductStatus: (id: number, status: "ACTIVE" | "INACTIVE") =>
    api.patch<ApiResponse<Product>>(`/admin/products/${id}/status`, { status }).then((r) => r.data),
  markOutOfStock: (id: number) => api.patch<ApiResponse<Product>>(`/admin/products/${id}/out-of-stock`).then((r) => r.data),
  deleteProduct: (id: number) => api.delete<ApiResponse<null>>(`/admin/products/${id}`).then((r) => r.data),

  categories: () => api.get<ApiResponse<Category[]>>("/admin/categories").then((r) => r.data.data),
  createCategory: (body: { name: string; description?: string; imageUrl?: string }) =>
    api.post<ApiResponse<Category>>("/admin/categories", body).then((r) => r.data),
  updateCategory: (id: number, body: { name: string; description?: string; imageUrl?: string }) =>
    api.put<ApiResponse<Category>>(`/admin/categories/${id}`, body).then((r) => r.data),
  deleteCategory: (id: number) => api.delete<ApiResponse<null>>(`/admin/categories/${id}`).then((r) => r.data),

  orders: (params: Params) => getPaged<Order>("/admin/orders", params),
  order: (id: number) => api.get<ApiResponse<Order>>(`/admin/orders/${id}`).then((r) => r.data.data),
  updateOrderStatus: (id: number, status: OrderStatus, reason?: string) =>
    api.patch<ApiResponse<Order>>(`/admin/orders/${id}/status`, { status, reason }).then((r) => r.data),

  users: (params: Params) => getPaged<AdminCustomer>("/admin/users", params),
  user: (id: number) => api.get<ApiResponse<AdminCustomerDetail>>(`/admin/users/${id}`).then((r) => r.data.data),
};
