import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage, getFieldErrors } from "../services/api";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { Field } from "../components/ui/Field";
import { ProductImage } from "../components/ui/ProductImage";
import { Logo } from "../components/layout/Header";

const SIDE = "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-6.5rem)] lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <ProductImage src={SIDE} alt="Fashion Hub" className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <p className="absolute bottom-10 left-10 max-w-sm font-display text-3xl font-semibold text-white">Phong cách bắt đầu từ những điều giản dị.</p>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden"><Logo /></div>
          <h1 className="mt-6 font-display text-3xl font-semibold lg:mt-0">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} className="input pr-11" autoComplete={autoComplete} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-ink" aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginPage() {
  useDocumentTitle("Đăng nhập");
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={from || (user.role === "ADMIN" ? "/admin" : "/")} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) errs.email = "Email không hợp lệ";
    if (!password) errs.password = "Vui lòng nhập mật khẩu";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      toast.success(`Chào mừng ${u.name} quay trở lại!`);
      navigate(from || (u.role === "ADMIN" ? "/admin" : "/"), { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Đăng nhập" subtitle={<>Chưa có tài khoản? <Link to="/register" state={{ from }} className="font-medium text-ink underline">Đăng ký ngay</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={errors.email} htmlFor="email">
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" placeholder="ban@example.com" />
        </Field>
        <Field label="Mật khẩu" error={errors.password} htmlFor="password">
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  useDocumentTitle("Đăng ký");
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={from || "/"} replace />;
  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(({ [k]: _removed, ...rest }) => rest);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Họ tên phải có ít nhất 2 ký tự";
    if (!EMAIL_RE.test(form.email.trim())) e.email = "Email không hợp lệ";
    if (form.phone && !/^(0|\+84)\d{9,10}$/.test(form.phone.trim())) e.phone = "Số điện thoại không hợp lệ (VD: 0912345678)";
    if (form.password.length < 6) e.password = "Mật khẩu phải có ít nhất 6 ký tự";
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = "Mật khẩu phải gồm cả chữ và số";
    if (form.confirmPassword !== form.password) e.confirmPassword = "Mật khẩu xác nhận không khớp";
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined });
      toast.success("Đăng ký thành công! Chào mừng bạn đến với Fashion Hub.");
      navigate(from || "/", { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Tạo tài khoản" subtitle={<>Đã có tài khoản? <Link to="/login" state={{ from }} className="font-medium text-ink underline">Đăng nhập</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Họ và tên" error={errors.name} htmlFor="name">
          <input id="name" value={form.name} onChange={(e) => set("name")(e.target.value)} className="input" autoComplete="name" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" error={errors.email} htmlFor="email">
            <input id="email" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} className="input" autoComplete="email" />
          </Field>
          <Field label="Số điện thoại (tùy chọn)" error={errors.phone} htmlFor="phone">
            <input id="phone" type="tel" value={form.phone} onChange={(e) => set("phone")(e.target.value)} className="input" autoComplete="tel" />
          </Field>
        </div>
        <Field label="Mật khẩu" error={errors.password} hint="Tối thiểu 6 ký tự, gồm cả chữ và số" htmlFor="password">
          <PasswordInput id="password" value={form.password} onChange={set("password")} autoComplete="new-password" />
        </Field>
        <Field label="Xác nhận mật khẩu" error={errors.confirmPassword} htmlFor="confirmPassword">
          <PasswordInput id="confirmPassword" value={form.confirmPassword} onChange={set("confirmPassword")} autoComplete="new-password" />
        </Field>
        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>{loading ? "Đang tạo tài khoản..." : "Đăng ký"}</button>
      </form>
    </AuthShell>
  );
}
