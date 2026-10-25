import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LayoutDashboard, LogOut, Menu, Package, Search, ShoppingBag, User as UserIcon, X } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { categoryApi } from "../../services";
import type { Category } from "../../types";

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className={clsx("font-display text-2xl font-bold tracking-tight", light ? "text-white" : "text-ink")}>
      Fashion<span className="text-accent">.</span>Hub
    </Link>
  );
}

export function Header() {
  const { user, isAdmin, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => setCategories([]));
  }, []);

  // Đóng menu khi chuyển trang
  useEffect(() => {
    setMobileOpen(false);
    setUserOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    clsx("text-sm whitespace-nowrap transition hover:text-ink", isActive ? "font-semibold text-ink" : "text-neutral-600");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="bg-ink py-2 text-center text-xs text-white/90">
        Miễn phí vận chuyển cho đơn từ 500.000₫<span className="hidden sm:inline"> · Đổi trả trong 7 ngày</span>
      </div>
      <div className="container-page flex h-16 items-center gap-4">
        <button type="button" className="-ml-2 rounded-full p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Mở menu">
          <Menu className="size-5" />
        </button>
        <Logo />
        <nav className="ml-4 hidden items-center gap-5 lg:flex xl:ml-6 xl:gap-6" aria-label="Điều hướng chính">
          <NavLink to="/" end className={navClass}>Trang chủ</NavLink>
          <NavLink to="/products" end className={navClass}>Sản phẩm</NavLink>
          {categories.slice(0, 3).map((c) => (
            <Link key={c.id} to={`/products?category=${c.slug}`} className={clsx("hidden text-sm whitespace-nowrap text-neutral-600 hover:text-ink xl:inline", location.search.includes(`category=${c.slug}`) && "font-semibold text-ink")}>
              {c.name}
            </Link>
          ))}
          <Link to="/products?onSale=true" className="text-sm font-medium whitespace-nowrap text-accent hover:text-accent-dark">Khuyến mãi</Link>
        </nav>

        <form onSubmit={submitSearch} className="relative ml-auto hidden w-full max-w-xs md:block" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400" />
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="input rounded-full bg-paper pl-10" placeholder="Tìm sản phẩm..." aria-label="Tìm kiếm sản phẩm" />
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <Link to="/products" className="rounded-full p-2 md:hidden" aria-label="Tìm kiếm"><Search className="size-5" /></Link>
          {user ? (
            <div className="relative" ref={userRef}>
              <button type="button" onClick={() => setUserOpen((v) => !v)} className="flex items-center gap-1.5 rounded-full p-2 text-sm hover:bg-neutral-100" aria-expanded={userOpen}>
                <span className="grid size-7 place-items-center rounded-full bg-ink text-xs font-semibold text-white">{user.name.charAt(0).toUpperCase()}</span>
                <span className="hidden max-w-28 truncate sm:inline">{user.name}</span>
                <ChevronDown className="hidden size-3.5 sm:inline" />
              </button>
              {userOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-white py-1.5 shadow-xl">
                  <div className="border-b border-line px-4 py-2.5">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  {isAdmin && (
                    <Link to="/admin" className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-paper"><LayoutDashboard className="size-4" /> Trang quản trị</Link>
                  )}
                  <Link to="/orders" className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-paper"><Package className="size-4" /> Đơn hàng của tôi</Link>
                  <Link to="/account" className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-paper"><UserIcon className="size-4" /> Tài khoản</Link>
                  <button type="button" onClick={() => { logout(); navigate("/"); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="size-4" /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" state={{ from: location.pathname + location.search }} className="rounded-full p-2 hover:bg-neutral-100 sm:px-3 sm:text-sm" aria-label="Đăng nhập">
              <UserIcon className="size-5 sm:hidden" />
              <span className="hidden sm:inline">Đăng nhập</span>
            </Link>
          )}
          <Link to="/cart" className="relative rounded-full p-2 hover:bg-neutral-100" aria-label={`Giỏ hàng (${cart.totalQuantity} sản phẩm)`}>
            <ShoppingBag className="size-5" />
            {cart.totalQuantity > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {cart.totalQuantity > 99 ? "99+" : cart.totalQuantity}
              </span>
            )}
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Logo />
              <button type="button" onClick={() => setMobileOpen(false)} className="rounded-full p-2" aria-label="Đóng menu"><X className="size-5" /></button>
            </div>
            <form onSubmit={submitSearch} className="relative p-4" role="search">
              <Search className="pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 text-neutral-400" />
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="input rounded-full pl-10" placeholder="Tìm sản phẩm..." />
            </form>
            <nav className="flex flex-col overflow-y-auto px-2 pb-6">
              <Link to="/" className="rounded-xl px-3 py-2.5 text-sm hover:bg-paper">Trang chủ</Link>
              <Link to="/products" className="rounded-xl px-3 py-2.5 text-sm hover:bg-paper">Tất cả sản phẩm</Link>
              <Link to="/products?onSale=true" className="rounded-xl px-3 py-2.5 text-sm font-medium text-accent hover:bg-paper">Khuyến mãi</Link>
              <p className="mt-4 px-3 pb-1 text-xs font-semibold tracking-wider text-muted uppercase">Danh mục</p>
              {categories.map((c) => (
                <Link key={c.id} to={`/products?category=${c.slug}`} className="flex justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-paper">
                  {c.name} <span className="text-muted">{c.productCount}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
