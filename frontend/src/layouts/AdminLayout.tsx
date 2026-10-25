import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FolderTree, LayoutDashboard, LogOut, Menu, Package, ShoppingCart, Store, Users, X } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/admin", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Sản phẩm", icon: Package },
  { to: "/admin/categories", label: "Danh mục", icon: FolderTree },
  { to: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart },
  { to: "/admin/customers", label: "Khách hàng", icon: Users },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link to="/admin" className="font-display text-xl font-bold text-white">
          Fashion<span className="text-orange-400">.</span>Hub <span className="ml-1 align-middle font-sans text-[10px] font-medium tracking-widest text-neutral-400 uppercase">Admin</span>
        </Link>
        <button type="button" className="rounded-full p-1.5 text-neutral-400 lg:hidden" onClick={() => setOpen(false)} aria-label="Đóng menu"><X className="size-5" /></button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Menu quản trị">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => clsx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", isActive ? "bg-white text-ink" : "text-neutral-400 hover:bg-white/5 hover:text-white")}>
            <Icon className="size-[18px]" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-400 hover:bg-white/5 hover:text-white"><Store className="size-[18px]" /> Xem cửa hàng</Link>
        <button type="button" onClick={() => { logout(); navigate("/login"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-400 hover:bg-white/5 hover:text-white">
          <LogOut className="size-[18px]" /> Đăng xuất
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f5f3]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-ink lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-ink">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
          <button type="button" className="-ml-1 rounded-full p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Mở menu"><Menu className="size-5" /></button>
          <p className="text-sm text-muted">Trang quản trị</p>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted">{user?.email}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-ink text-sm font-semibold text-white">{user?.name.charAt(0)}</span>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
