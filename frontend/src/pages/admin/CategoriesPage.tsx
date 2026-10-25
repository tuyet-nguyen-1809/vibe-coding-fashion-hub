import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import { adminApi } from "../../services";
import { getErrorMessage, getFieldErrors } from "../../services/api";
import { useAsync } from "../../hooks/useAsync";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { PageHeader, Panel, Table, td, th } from "../../components/admin/AdminUI";
import { ProductImage } from "../../components/ui/ProductImage";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState, ErrorState } from "../../components/ui/States";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import type { Category } from "../../types";

export default function CategoriesPage() {
  useDocumentTitle("Quản lý danh mục");
  const { data, loading, error, reload } = useAsync(() => adminApi.categories(), []);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [form, setForm] = useState({ name: "", description: "", imageUrl: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const open = (c: Category | "new") => {
    setEditing(c);
    setErrors({});
    setForm(c === "new" ? { name: "", description: "", imageUrl: "" } : { name: c.name, description: c.description ?? "", imageUrl: c.imageUrl ?? "" });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setErrors({ name: "Tên danh mục phải có ít nhất 2 ký tự" });
    if (form.imageUrl && !/^https?:\/\//i.test(form.imageUrl)) return setErrors({ imageUrl: "Đường dẫn ảnh phải bắt đầu bằng http(s)://" });
    setSaving(true);
    try {
      const body = { name: form.name.trim(), description: form.description.trim() || undefined, imageUrl: form.imageUrl.trim() || undefined };
      const res = editing === "new" ? await adminApi.createCategory(body) : await adminApi.updateCategory((editing as Category).id, body);
      toast.success(res.message);
      setEditing(null);
      await reload();
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      toast.success((await adminApi.deleteCategory(deleting.id)).message);
      setDeleting(null);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Danh mục" description="Danh mục đang có sản phẩm sẽ không thể xóa." actions={<button type="button" className="btn-primary" onClick={() => open("new")}><Plus className="size-4" /> Thêm danh mục</button>} />
      <Panel bodyClass="">
        {error ? <div className="p-5"><ErrorState message={error} onRetry={reload} /></div> : loading ? <PageLoader /> : data?.length === 0 ? (
          <div className="p-5"><EmptyState title="Chưa có danh mục nào" /></div>
        ) : (
          <Table head={<><th className={th}>Danh mục</th><th className={th}>Đường dẫn</th><th className={th}>Số sản phẩm</th><th className={clsx(th, "text-right")}>Thao tác</th></>}>
            {data?.map((c) => (
              <tr key={c.id} className="hover:bg-neutral-50">
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <ProductImage src={c.imageUrl ?? ""} alt={c.name} className="size-11 shrink-0 rounded-lg bg-paper" />
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="line-clamp-1 text-xs text-muted">{c.description}</p>
                    </div>
                  </div>
                </td>
                <td className={clsx(td, "font-mono text-xs text-muted")}>/{c.slug}</td>
                <td className={td}><Link to={`/admin/products?categoryId=${c.id}`} className="hover:underline">{c.productCount} sản phẩm</Link></td>
                <td className={clsx(td, "text-right whitespace-nowrap")}>
                  <button type="button" onClick={() => open(c)} className="inline-grid size-8 place-items-center rounded-lg hover:bg-neutral-100" aria-label={`Sửa ${c.name}`}><Pencil className="size-4" /></button>
                  <button type="button" onClick={() => setDeleting(c)} className="inline-grid size-8 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label={`Xóa ${c.name}`}><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Modal
        open={editing !== null}
        onClose={() => !saving && setEditing(null)}
        title={editing === "new" ? "Thêm danh mục" : "Sửa danh mục"}
        footer={<><button type="button" className="btn-outline" onClick={() => setEditing(null)} disabled={saving}>Hủy</button><button type="submit" form="category-form" className="btn-primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</button></>}
      >
        <form id="category-form" onSubmit={save} className="space-y-4" noValidate>
          <Field label="Tên danh mục *" error={errors.name}><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <Field label="Mô tả" error={errors.description}><textarea className="input min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} /></Field>
          <Field label="Ảnh đại diện (URL)" error={errors.imageUrl}><input className="input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." /></Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa danh mục?"
        message={deleting && deleting.productCount > 0 ? <>Danh mục <b>{deleting.name}</b> đang có <b>{deleting.productCount} sản phẩm</b> nên hệ thống sẽ từ chối xóa. Hãy chuyển các sản phẩm sang danh mục khác trước.</> : <>Xóa danh mục <b>{deleting?.name}</b>? Thao tác không thể hoàn tác.</>}
        confirmText="Xóa danh mục"
        danger
        loading={deletingBusy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
