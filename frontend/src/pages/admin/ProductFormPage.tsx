import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { adminApi, type ProductPayload } from "../../services";
import { getErrorMessage, getFieldErrors } from "../../services/api";
import { useAsync } from "../../hooks/useAsync";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { PageHeader, Panel } from "../../components/admin/AdminUI";
import { Field } from "../../components/ui/Field";
import { ProductImage } from "../../components/ui/ProductImage";
import { PageLoader } from "../../components/ui/Spinner";
import { ErrorState } from "../../components/ui/States";
import { formatVND } from "../../utils/format";

type VariantRow = { key: string; id?: number; size: string; color: string; stock: string };
type FormState = {
  sku: string;
  name: string;
  description: string;
  price: string;
  salePrice: string;
  imageUrl: string;
  categoryId: string;
  isFeatured: boolean;
  status: "ACTIVE" | "INACTIVE";
  variants: VariantRow[];
};

let rowSeq = 0;
const newRow = (v: Partial<VariantRow> = {}): VariantRow => ({ key: `r${++rowSeq}`, size: "", color: "", stock: "0", ...v });

const EMPTY: FormState = {
  sku: "",
  name: "",
  description: "",
  price: "",
  salePrice: "",
  imageUrl: "",
  categoryId: "",
  isFeatured: false,
  status: "ACTIVE",
  variants: [newRow({ size: "M", color: "Đen", stock: "10" })],
};

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  useDocumentTitle(isEdit ? "Sửa sản phẩm" : "Thêm sản phẩm");
  const navigate = useNavigate();
  const categories = useAsync(() => adminApi.categories(), []);
  const existing = useAsync(async () => (id ? adminApi.product(Number(id)) : null), [id]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [gen, setGen] = useState({ sizes: "S, M, L, XL", colors: "Đen, Trắng", stock: "10" });

  useEffect(() => {
    const p = existing.data;
    if (!p) return;
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description,
      price: String(p.price),
      salePrice: p.salePrice ? String(p.salePrice) : "",
      imageUrl: p.imageUrl,
      categoryId: String(p.category.id),
      isFeatured: p.isFeatured,
      status: p.status,
      variants: p.variants.map((v) => newRow({ id: v.id, size: v.size, color: v.color, stock: String(v.stock) })),
    });
  }, [existing.data]);

  if ((isEdit && existing.loading) || categories.loading) return <PageLoader />;
  if (existing.error) return <ErrorState message={existing.error} onRetry={existing.reload} />;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    // Người dùng sửa trường nào thì ẩn lỗi của trường đó
    if (errors[k]) setErrors(({ [k]: _removed, ...rest }) => rest);
  };
  const setVariant = (key: string, patch: Partial<VariantRow>) => set("variants", form.variants.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const generate = () => {
    const sizes = gen.sizes.split(",").map((s) => s.trim()).filter(Boolean);
    const colors = gen.colors.split(",").map((s) => s.trim()).filter(Boolean);
    if (!sizes.length || !colors.length) return toast.error("Nhập ít nhất 1 kích cỡ và 1 màu");
    const existingKeys = new Set(form.variants.map((v) => `${v.size.toLowerCase()}|${v.color.toLowerCase()}`));
    const added = sizes.flatMap((size) => colors.map((color) => ({ size, color }))).filter((v) => !existingKeys.has(`${v.size.toLowerCase()}|${v.color.toLowerCase()}`));
    set("variants", [...form.variants.filter((v) => v.size || v.color), ...added.map((v) => newRow({ ...v, stock: gen.stock || "0" }))]);
    toast.success(`Đã thêm ${added.length} biến thể`);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.sku.trim().length < 2) e.sku = "Mã sản phẩm phải có ít nhất 2 ký tự";
    if (form.name.trim().length < 2) e.name = "Tên sản phẩm phải có ít nhất 2 ký tự";
    if (form.description.trim().length < 10) e.description = "Mô tả phải có ít nhất 10 ký tự";
    const price = Number(form.price);
    if (!Number.isInteger(price) || price < 1000) e.price = "Giá bán phải là số nguyên ≥ 1.000đ";
    if (form.salePrice) {
      const sale = Number(form.salePrice);
      if (!Number.isInteger(sale) || sale < 0) e.salePrice = "Giá khuyến mãi không hợp lệ";
      else if (sale >= price) e.salePrice = "Giá khuyến mãi phải nhỏ hơn giá gốc";
    }
    if (!/^https?:\/\/.+/i.test(form.imageUrl.trim())) e.imageUrl = "Vui lòng nhập đường dẫn ảnh bắt đầu bằng http(s)://";
    if (!form.categoryId) e.categoryId = "Vui lòng chọn danh mục";
    if (form.variants.length === 0) e.variants = "Cần ít nhất 1 biến thể";
    const seen = new Set<string>();
    for (const v of form.variants) {
      if (!v.size.trim() || !v.color.trim()) e.variants = "Mỗi biến thể cần có kích cỡ và màu sắc";
      else if (!Number.isInteger(Number(v.stock)) || Number(v.stock) < 0) e.variants = "Tồn kho phải là số nguyên ≥ 0";
      const k = `${v.size.trim().toLowerCase()}|${v.color.trim().toLowerCase()}`;
      if (seen.has(k)) e.variants = `Biến thể ${v.size}/${v.color} bị trùng`;
      seen.add(k);
    }
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return toast.error("Vui lòng kiểm tra lại các trường được đánh dấu");

    const payload: ProductPayload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      salePrice: form.salePrice ? Number(form.salePrice) : null,
      imageUrl: form.imageUrl.trim(),
      categoryId: Number(form.categoryId),
      isFeatured: form.isFeatured,
      status: form.status,
      variants: form.variants.map((v) => ({ ...(v.id ? { id: v.id } : {}), size: v.size.trim(), color: v.color.trim(), stock: Number(v.stock) })),
    };
    setSaving(true);
    try {
      const res = isEdit ? await adminApi.updateProduct(Number(id), payload) : await adminApi.createProduct(payload);
      toast.success(res.message ?? "Đã lưu sản phẩm");
      navigate("/admin/products");
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const totalStock = form.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title={isEdit ? `Sửa: ${existing.data?.name ?? ""}` : "Thêm sản phẩm mới"}
        actions={
          <>
            <Link to="/admin/products" className="btn-outline">Hủy</Link>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo sản phẩm"}</button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Thông tin cơ bản">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên sản phẩm *" error={errors.name}><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Mã sản phẩm (SKU) *" error={errors.sku} hint="Tự động viết hoa, không trùng"><input className="input uppercase" value={form.sku} onChange={(e) => set("sku", e.target.value)} /></Field>
              <div className="sm:col-span-2">
                <Field label="Mô tả *" error={errors.description}><textarea className="input min-h-32" value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
              </div>
            </div>
          </Panel>

          <Panel title={`Biến thể & tồn kho · Tổng ${totalStock} sp`}>
            <div className="mb-4 grid gap-2 rounded-xl bg-paper p-3 sm:grid-cols-[1fr_1fr_90px_auto]">
              <input className="input" value={gen.sizes} onChange={(e) => setGen({ ...gen, sizes: e.target.value })} placeholder="Kích cỡ: S, M, L" aria-label="Danh sách kích cỡ" />
              <input className="input" value={gen.colors} onChange={(e) => setGen({ ...gen, colors: e.target.value })} placeholder="Màu: Đen, Trắng" aria-label="Danh sách màu" />
              <input className="input" type="number" min={0} value={gen.stock} onChange={(e) => setGen({ ...gen, stock: e.target.value })} aria-label="Tồn kho mặc định" />
              <button type="button" className="btn-outline" onClick={generate}><Wand2 className="size-4" /> Tạo nhanh</button>
            </div>
            {errors.variants && <p className="mb-3 text-xs text-red-600">{errors.variants}</p>}
            <div className="space-y-2">
              <div className="hidden grid-cols-[1fr_1fr_120px_40px] gap-2 px-1 text-xs font-medium text-muted sm:grid"><span>Kích cỡ</span><span>Màu sắc</span><span>Tồn kho</span><span /></div>
              {form.variants.map((v) => (
                <div key={v.key} className="grid grid-cols-[1fr_1fr_90px_40px] gap-2 sm:grid-cols-[1fr_1fr_120px_40px]">
                  <input className="input" value={v.size} onChange={(e) => setVariant(v.key, { size: e.target.value })} placeholder="M" aria-label="Kích cỡ" />
                  <input className="input" value={v.color} onChange={(e) => setVariant(v.key, { color: e.target.value })} placeholder="Đen" aria-label="Màu sắc" />
                  <input className="input" type="number" min={0} value={v.stock} onChange={(e) => setVariant(v.key, { stock: e.target.value })} aria-label="Tồn kho" />
                  <button type="button" onClick={() => set("variants", form.variants.filter((r) => r.key !== v.key))} className="grid place-items-center rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-30" disabled={form.variants.length === 1} aria-label="Xóa biến thể"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-ghost btn-sm mt-3" onClick={() => set("variants", [...form.variants, newRow()])}><Plus className="size-4" /> Thêm biến thể</button>
            {isEdit && <p className="mt-3 text-xs text-muted">Xóa biến thể sẽ gỡ biến thể đó khỏi giỏ hàng của khách; lịch sử đơn hàng cũ không bị ảnh hưởng.</p>}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Giá bán">
            <div className="space-y-4">
              <Field label="Giá gốc (VND) *" error={errors.price}><input className="input" type="number" min={0} step={1000} value={form.price} onChange={(e) => set("price", e.target.value)} /></Field>
              <Field label="Giá khuyến mãi (VND)" error={errors.salePrice} hint="Để trống nếu không giảm giá"><input className="input" type="number" min={0} step={1000} value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} /></Field>
              {Number(form.price) > 0 && <p className="text-sm text-muted">Giá bán thực tế: <b className="text-ink">{formatVND(form.salePrice && Number(form.salePrice) < Number(form.price) ? Number(form.salePrice) : Number(form.price))}</b></p>}
            </div>
          </Panel>

          <Panel title="Phân loại & hiển thị">
            <div className="space-y-4">
              <Field label="Danh mục *" error={errors.categoryId}>
                <select className="input" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  <option value="">-- Chọn danh mục --</option>
                  {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Trạng thái">
                <select className="input" value={form.status} onChange={(e) => set("status", e.target.value as FormState["status"])}>
                  <option value="ACTIVE">Đang bán</option>
                  <option value="INACTIVE">Ngừng bán (ẩn khỏi cửa hàng)</option>
                </select>
              </Field>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" className="size-4 accent-ink" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} /> Hiển thị ở mục “Sản phẩm nổi bật”
              </label>
            </div>
          </Panel>

          <Panel title="Hình ảnh">
            <Field label="Đường dẫn ảnh (URL) *" error={errors.imageUrl}><input className="input" value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://..." /></Field>
            <div className="mt-4 aspect-[3/4] overflow-hidden rounded-xl bg-paper">
              {form.imageUrl ? <ProductImage key={form.imageUrl} src={form.imageUrl} alt={form.name || "Xem trước"} className="size-full" /> : <div className="grid size-full place-items-center text-sm text-muted">Xem trước ảnh</div>}
            </div>
          </Panel>
        </div>
      </div>
    </form>
  );
}
