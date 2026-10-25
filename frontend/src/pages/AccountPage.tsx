import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services";
import { getErrorMessage, getFieldErrors } from "../services/api";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { Field } from "../components/ui/Field";
import { formatDate } from "../utils/format";

export default function AccountPage() {
  useDocumentTitle("Tài khoản");
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name ?? "", phone: user?.phone ?? "" });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<"profile" | "password" | null>(null);

  if (!user) return null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving("profile");
    setErrors({});
    try {
      setUser(await authApi.updateProfile({ name: profile.name.trim(), phone: profile.phone.trim() || undefined }));
      toast.success("Đã cập nhật thông tin");
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirmPassword) {
      setErrors({ confirmPassword: "Mật khẩu xác nhận không khớp" });
      return;
    }
    setSaving("password");
    setErrors({});
    try {
      await authApi.changePassword(pw);
      toast.success("Đổi mật khẩu thành công");
      setPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Tài khoản của tôi</h1>
      <p className="mt-2 text-sm text-muted">{user.email} · Thành viên từ {formatDate(user.createdAt, false)}</p>

      <form onSubmit={saveProfile} className="card mt-8 space-y-4 p-6">
        <h2 className="text-lg font-semibold">Thông tin cá nhân</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ và tên" error={errors.name}><input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
          <Field label="Số điện thoại" error={errors.phone}><input className="input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
        </div>
        <button type="submit" className="btn-primary" disabled={saving === "profile"}>{saving === "profile" ? "Đang lưu..." : "Lưu thay đổi"}</button>
      </form>

      <form onSubmit={savePassword} className="card mt-6 space-y-4 p-6">
        <h2 className="text-lg font-semibold">Đổi mật khẩu</h2>
        <Field label="Mật khẩu hiện tại" error={errors.currentPassword}><input type="password" className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mật khẩu mới" error={errors.newPassword} hint="Tối thiểu 6 ký tự, gồm chữ và số"><input type="password" className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" /></Field>
          <Field label="Xác nhận mật khẩu mới" error={errors.confirmPassword}><input type="password" className="input" value={pw.confirmPassword} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} autoComplete="new-password" /></Field>
        </div>
        <button type="submit" className="btn-primary" disabled={saving === "password" || !pw.currentPassword || !pw.newPassword}>{saving === "password" ? "Đang lưu..." : "Đổi mật khẩu"}</button>
      </form>
    </div>
  );
}
