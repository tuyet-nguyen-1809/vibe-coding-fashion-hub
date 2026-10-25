import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cartApi } from "../services";
import { useAuth } from "./AuthContext";
import type { Cart } from "../types";

const GUEST_KEY = "fh_guest_cart";
type GuestItem = { variantId: number; quantity: number };

const EMPTY: Cart = { items: [], totalQuantity: 0, subtotal: 0, shippingFee: 0, total: 0, hasIssues: false };

function readGuest(): GuestItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((i) => Number.isInteger(i?.variantId) && Number.isInteger(i?.quantity)) : [];
  } catch {
    return [];
  }
}
const writeGuest = (items: GuestItem[]) => localStorage.setItem(GUEST_KEY, JSON.stringify(items));

interface CartState {
  cart: Cart;
  loading: boolean;
  /** Thêm sản phẩm; ném lỗi API nếu vượt tồn kho */
  add: (variantId: number, quantity: number, stock: number) => Promise<void>;
  update: (variantId: number, quantity: number) => Promise<void>;
  remove: (variantId: number) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartState | null>(null);

/**
 * Giỏ hàng:
 * - Đã đăng nhập: lưu trên Backend (bảng Cart/CartItem), đồng bộ mọi thiết bị.
 * - Khách vãng lai: lưu [variantId, quantity] trong localStorage; giá & tồn kho luôn lấy từ API /cart/preview.
 * - Khi đăng nhập: gộp giỏ vãng lai vào giỏ tài khoản.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart>(EMPTY);
  const [loading, setLoading] = useState(true);
  const lastUserId = useRef<number | null>(null);

  const loadGuest = useCallback(async () => {
    const items = readGuest();
    if (items.length === 0) return setCart(EMPTY);
    const preview = await cartApi.preview(items);
    // Bỏ các biến thể không còn tồn tại
    if (preview.removedVariantIds?.length) writeGuest(items.filter((i) => !preview.removedVariantIds!.includes(i.variantId)));
    setCart(preview);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (user) setCart(await cartApi.get());
      else await loadGuest();
    } catch {
      setCart(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [user, loadGuest]);

  useEffect(() => {
    if (authLoading) return;
    const run = async () => {
      if (user && lastUserId.current !== user.id) {
        lastUserId.current = user.id;
        const guest = readGuest();
        if (guest.length) {
          try {
            setCart(await cartApi.merge(guest));
            localStorage.removeItem(GUEST_KEY);
            setLoading(false);
            return;
          } catch {
            /* gộp thất bại thì vẫn tải giỏ tài khoản */
          }
        }
      }
      if (!user) lastUserId.current = null;
      await refresh();
    };
    void run();
  }, [user, authLoading, refresh]);

  const add = useCallback(
    async (variantId: number, quantity: number, stock: number) => {
      if (user) {
        setCart(await cartApi.add(variantId, quantity));
        return;
      }
      const items = readGuest();
      const existing = items.find((i) => i.variantId === variantId);
      const newQty = (existing?.quantity ?? 0) + quantity;
      if (newQty > stock) {
        throw new Error(existing ? `Chỉ còn ${stock} sản phẩm, giỏ hàng của bạn đã có ${existing.quantity}` : `Chỉ còn ${stock} sản phẩm trong kho`);
      }
      if (existing) existing.quantity = newQty;
      else items.push({ variantId, quantity });
      writeGuest(items);
      await loadGuest();
    },
    [user, loadGuest],
  );

  const update = useCallback(
    async (variantId: number, quantity: number) => {
      if (user) {
        setCart(await cartApi.update(variantId, quantity));
        return;
      }
      const line = cart.items.find((i) => i.variantId === variantId);
      if (line && quantity > line.stock) throw new Error(`Chỉ còn ${line.stock} sản phẩm trong kho`);
      writeGuest(readGuest().map((i) => (i.variantId === variantId ? { ...i, quantity } : i)));
      await loadGuest();
    },
    [user, cart.items, loadGuest],
  );

  const remove = useCallback(
    async (variantId: number) => {
      if (user) {
        setCart(await cartApi.remove(variantId));
        return;
      }
      writeGuest(readGuest().filter((i) => i.variantId !== variantId));
      await loadGuest();
    },
    [user, loadGuest],
  );

  const clear = useCallback(async () => {
    if (user) setCart(await cartApi.clear());
    else {
      localStorage.removeItem(GUEST_KEY);
      setCart(EMPTY);
    }
  }, [user]);

  const value = useMemo(() => ({ cart, loading, add, update, remove, clear, refresh }), [cart, loading, add, update, remove, clear, refresh]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart phải dùng bên trong CartProvider");
  return ctx;
}
