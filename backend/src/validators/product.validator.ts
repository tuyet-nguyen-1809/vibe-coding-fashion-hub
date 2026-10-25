import { z } from "zod";
import { money, paginationQuery } from "./common";

export const productSortValues = ["newest", "price_asc", "price_desc", "name_asc"] as const;

export const productListQuery = z
  .object({
    ...paginationQuery,
    q: z.string().trim().max(100).optional(),
    category: z.string().trim().max(120).optional(), // slug danh mục
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    sort: z.enum(productSortValues).default("newest"),
    featured: z.enum(["true", "false"]).optional(),
    onSale: z.enum(["true", "false"]).optional(),
  })
  .refine((d) => d.minPrice == null || d.maxPrice == null || d.minPrice <= d.maxPrice, {
    message: "Giá tối thiểu phải nhỏ hơn hoặc bằng giá tối đa",
    path: ["minPrice"],
  });

export const adminProductListQuery = z.object({
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  stock: z.enum(["in", "low", "out"]).optional(),
});

const variantInput = z.object({
  id: z.number().int().positive().optional(),
  size: z.string().trim().min(1, "Vui lòng nhập kích cỡ").max(20),
  color: z.string().trim().min(1, "Vui lòng nhập màu sắc").max(50),
  stock: z.coerce.number().int("Tồn kho phải là số nguyên").min(0, "Tồn kho không được âm").max(100000),
});

export const productInput = z
  .object({
    sku: z.string().trim().min(2, "Mã sản phẩm phải có ít nhất 2 ký tự").max(50).toUpperCase(),
    name: z.string().trim().min(2, "Tên sản phẩm phải có ít nhất 2 ký tự").max(200),
    description: z.string().trim().min(10, "Mô tả phải có ít nhất 10 ký tự").max(5000),
    price: money.min(1000, "Giá bán tối thiểu 1.000đ"),
    salePrice: money.nullable().optional(),
    imageUrl: z.url("Đường dẫn ảnh không hợp lệ").max(500),
    categoryId: z.coerce.number().int().positive("Vui lòng chọn danh mục"),
    isFeatured: z.boolean().default(false),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
    variants: z.array(variantInput).min(1, "Sản phẩm cần ít nhất 1 biến thể (kích cỡ/màu)").max(60),
  })
  .refine((d) => d.salePrice == null || d.salePrice < d.price, {
    message: "Giá khuyến mãi phải nhỏ hơn giá gốc",
    path: ["salePrice"],
  })
  .refine(
    (d) => new Set(d.variants.map((v) => `${v.size.toLowerCase()}|${v.color.toLowerCase()}`)).size === d.variants.length,
    { message: "Có biến thể bị trùng kích cỡ và màu sắc", path: ["variants"] },
  );

export const productStatusInput = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type ProductListQuery = z.infer<typeof productListQuery>;
export type AdminProductListQuery = z.infer<typeof adminProductListQuery>;
export type ProductInput = z.infer<typeof productInput>;
