import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { MainLayout } from "./layouts/MainLayout";
import { RequireAdmin, RequireAuth } from "./components/RouteGuards";
import { PageLoader } from "./components/ui/Spinner";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import { OrderDetailPage, OrdersPage } from "./pages/OrdersPage";
import AccountPage from "./pages/AccountPage";
import NotFoundPage from "./pages/NotFoundPage";

// Trang quản trị tải riêng (code-splitting) để trang khách hàng nhẹ hơn.
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const AdminProductsPage = lazy(() => import("./pages/admin/ProductsPage"));
const ProductFormPage = lazy(() => import("./pages/admin/ProductFormPage"));
const AdminCategoriesPage = lazy(() => import("./pages/admin/CategoriesPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/OrdersPage"));
const AdminOrderDetailPage = lazy(() => import("./pages/admin/OrderDetailPage"));
const AdminCustomersPage = lazy(() => import("./pages/admin/CustomersPage"));
const AdminCustomerDetailPage = lazy(() => import("./pages/admin/CustomerDetailPage"));

const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/products", element: <ProductsPage /> },
      { path: "/products/:slug", element: <ProductDetailPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/cart", element: <CartPage /> },
      { path: "/checkout", element: <RequireAuth><CheckoutPage /></RequireAuth> },
      { path: "/orders", element: <RequireAuth><OrdersPage /></RequireAuth> },
      { path: "/orders/:id", element: <RequireAuth><OrderDetailPage /></RequireAuth> },
      { path: "/account", element: <RequireAuth><AccountPage /></RequireAuth> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "/admin",
    element: (
      <RequireAdmin>
        <Suspense fallback={<PageLoader />}>
          <AdminLayout />
        </Suspense>
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "products", element: <AdminProductsPage /> },
      { path: "products/new", element: <ProductFormPage /> },
      { path: "products/:id/edit", element: <ProductFormPage /> },
      { path: "categories", element: <AdminCategoriesPage /> },
      { path: "orders", element: <AdminOrdersPage /> },
      { path: "orders/:id", element: <AdminOrderDetailPage /> },
      { path: "customers", element: <AdminCustomersPage /> },
      { path: "customers/:id", element: <AdminCustomerDetailPage /> },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: "var(--font-sans)" } }} />
      </CartProvider>
    </AuthProvider>
  );
}
