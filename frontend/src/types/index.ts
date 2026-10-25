// Kiểu dữ liệu dùng chung, khớp với phản hồi của Backend.

export type Role = "CUSTOMER" | "ADMIN";
export type OrderStatus = "PROCESSING" | "SHIPPING" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "COD" | "MOCK_ONLINE";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";
export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

export interface Variant {
  id: number;
  size: string;
  color: string;
  stock: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice: number | null;
  finalPrice: number;
  discountPercent: number;
  imageUrl: string;
  isFeatured: boolean;
  status: ProductStatus;
  category: { id: number; name: string; slug: string };
  variants: Variant[];
  sizes: string[];
  colors: string[];
  totalStock: number;
  inStock: boolean;
  stockLevel: "in" | "low" | "out";
  rating: { avg: number; count: number };
  createdAt: string;
  updatedAt: string;
}

export interface CartLine {
  variantId: number;
  productId: number;
  name: string;
  slug: string;
  sku: string;
  imageUrl: string;
  size: string;
  color: string;
  price: number;
  unitPrice: number;
  quantity: number;
  stock: number;
  lineTotal: number;
  issue: string | null;
}

export interface Cart {
  items: CartLine[];
  totalQuantity: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  hasIssues: boolean;
  removedVariantIds?: number[];
}

export interface OrderItem {
  id: number;
  productId: number | null;
  variantId: number | null;
  productName: string;
  sku: string;
  size: string;
  color: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  code: string;
  userId: number;
  recipientName: string;
  phone: string;
  address: string;
  note: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  subtotal: number;
  shippingFee: number;
  total: number;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  user?: { id: number; name: string; email: string; phone?: string | null };
  _count?: { items: number };
}

export interface Review {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  user: { id: number; name: string };
}

export interface ReviewSummary {
  avg: number;
  count: number;
  distribution: { star: number; count: number }[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestions?: ChatSuggestion[];
  error?: boolean;
}

export interface ChatSuggestion {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  salePrice: number | null;
}
