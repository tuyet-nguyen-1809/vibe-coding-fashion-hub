import { prisma } from "../lib/prisma";
import type { Prisma } from "../generated/prisma/client";
import { ApiError } from "../utils/ApiError";
import { buildMeta } from "../utils/response";
import { effectivePrice } from "../utils/pricing";
import { slugify } from "../utils/slug";
import type {
  AdminProductListQuery,
  ProductInput,
  ProductListQuery,
} from "../validators/product.validator";

/** Ngưỡng "sắp hết hàng": tổng tồn kho từ 1 đến 10. */
export const LOW_STOCK_THRESHOLD = 10;

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  variants: { orderBy: { id: "asc" } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

async function ratingMap(productIds: number[]) {
  if (productIds.length === 0) return new Map<number, { avg: number; count: number }>();
  const rows = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(
    rows.map((r) => [r.productId, { avg: Math.round((r._avg.rating ?? 0) * 10) / 10, count: r._count._all }]),
  );
}

/** Chuẩn hóa dữ liệu sản phẩm trả về cho Frontend. */
export function formatProduct(p: ProductWithRelations, rating?: { avg: number; count: number }) {
  const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
  const unique = (arr: string[]) => [...new Set(arr)];
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    salePrice: p.salePrice,
    finalPrice: p.finalPrice,
    discountPercent: p.salePrice ? Math.round((1 - p.salePrice / p.price) * 100) : 0,
    imageUrl: p.imageUrl,
    isFeatured: p.isFeatured,
    status: p.status,
    category: p.category,
    variants: p.variants.map((v) => ({ id: v.id, size: v.size, color: v.color, stock: v.stock })),
    sizes: unique(p.variants.map((v) => v.size)),
    colors: unique(p.variants.map((v) => v.color)),
    totalStock,
    inStock: totalStock > 0,
    stockLevel: totalStock === 0 ? "out" : totalStock <= LOW_STOCK_THRESHOLD ? "low" : "in",
    rating: rating ?? { avg: 0, count: 0 },
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

async function formatMany(products: ProductWithRelations[]) {
  const ratings = await ratingMap(products.map((p) => p.id));
  return products.map((p) => formatProduct(p, ratings.get(p.id)));
}

function sortToOrderBy(sort: ProductListQuery["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ finalPrice: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ finalPrice: "desc" }, { id: "desc" }];
    case "name_asc":
      return [{ name: "asc" }];
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

// ===================== Phía khách hàng =====================

export async function listPublic(q: ProductListQuery) {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  if (q.q) {
    where.OR = [{ name: { contains: q.q } }, { sku: { contains: q.q } }, { description: { contains: q.q } }];
  }
  if (q.category) where.category = { slug: q.category };
  if (q.minPrice != null || q.maxPrice != null) {
    where.finalPrice = { ...(q.minPrice != null ? { gte: q.minPrice } : {}), ...(q.maxPrice != null ? { lte: q.maxPrice } : {}) };
  }
  if (q.featured === "true") where.isFeatured = true;
  if (q.onSale === "true") where.salePrice = { not: null };

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: sortToOrderBy(q.sort),
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);
  return { items: await formatMany(rows), meta: buildMeta(q.page, q.limit, total) };
}

export async function getPublicBySlug(slugOrId: string) {
  const asId = /^\d+$/.test(slugOrId) ? Number(slugOrId) : undefined;
  const product = await prisma.product.findFirst({
    where: { status: "ACTIVE", OR: [{ slug: slugOrId }, ...(asId ? [{ id: asId }] : [])] },
    include: productInclude,
  });
  if (!product) throw ApiError.notFound("Sản phẩm không tồn tại hoặc đã ngừng bán");

  const related = await prisma.product.findMany({
    where: { status: "ACTIVE", categoryId: product.categoryId, id: { not: product.id } },
    include: productInclude,
    orderBy: { createdAt: "desc" },
    take: 4,
  });
  const ratings = await ratingMap([product.id]);
  return { product: formatProduct(product, ratings.get(product.id)), related: await formatMany(related) };
}

// ===================== Phía quản trị =====================

async function productIdsByStock(level: "in" | "low" | "out") {
  const sums = await prisma.productVariant.groupBy({ by: ["productId"], _sum: { stock: true } });
  const stockOf = new Map(sums.map((s) => [s.productId, s._sum.stock ?? 0]));
  const all = await prisma.product.findMany({ select: { id: true } });
  return all
    .filter((p) => {
      const s = stockOf.get(p.id) ?? 0;
      if (level === "out") return s === 0;
      if (level === "low") return s > 0 && s <= LOW_STOCK_THRESHOLD;
      return s > LOW_STOCK_THRESHOLD;
    })
    .map((p) => p.id);
}

export async function listAdmin(q: AdminProductListQuery) {
  const where: Prisma.ProductWhereInput = {};
  if (q.q) where.OR = [{ name: { contains: q.q } }, { sku: { contains: q.q } }];
  if (q.categoryId) where.categoryId = q.categoryId;
  if (q.status) where.status = q.status;
  if (q.stock) where.id = { in: await productIdsByStock(q.stock) };

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);
  return { items: await formatMany(rows), meta: buildMeta(q.page, q.limit, total) };
}

export async function getAdminById(id: number) {
  const p = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!p) throw ApiError.notFound("Không tìm thấy sản phẩm");
  const ratings = await ratingMap([id]);
  return formatProduct(p, ratings.get(id));
}

async function ensureCategory(categoryId: number) {
  const c = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!c) throw ApiError.badRequest("Danh mục không tồn tại");
}

async function uniqueSlug(name: string, sku: string, excludeId?: number) {
  const base = slugify(name) || slugify(sku);
  const candidates = [base, `${base}-${slugify(sku)}`];
  for (const slug of candidates) {
    const existed = await prisma.product.findUnique({ where: { slug } });
    if (!existed || existed.id === excludeId) return slug;
  }
  return `${base}-${Date.now()}`;
}

async function ensureSkuAvailable(sku: string, excludeId?: number) {
  const existed = await prisma.product.findUnique({ where: { sku } });
  if (existed && existed.id !== excludeId) throw ApiError.conflict(`Mã sản phẩm "${sku}" đã tồn tại`, "SKU_EXISTS");
}

export async function create(input: ProductInput) {
  await ensureCategory(input.categoryId);
  await ensureSkuAvailable(input.sku);
  const slug = await uniqueSlug(input.name, input.sku);
  const salePrice = input.salePrice ?? null;

  const created = await prisma.product.create({
    data: {
      sku: input.sku,
      name: input.name,
      slug,
      description: input.description,
      price: input.price,
      salePrice,
      finalPrice: effectivePrice(input.price, salePrice),
      imageUrl: input.imageUrl,
      categoryId: input.categoryId,
      isFeatured: input.isFeatured,
      status: input.status,
      variants: { create: input.variants.map(({ size, color, stock }) => ({ size, color, stock })) },
    },
    include: productInclude,
  });
  return formatProduct(created);
}

export async function update(id: number, input: ProductInput) {
  const current = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
  if (!current) throw ApiError.notFound("Không tìm thấy sản phẩm");
  await ensureCategory(input.categoryId);
  await ensureSkuAvailable(input.sku, id);
  const slug = current.name === input.name ? current.slug : await uniqueSlug(input.name, input.sku, id);
  const salePrice = input.salePrice ?? null;

  const existingIds = new Set(current.variants.map((v) => v.id));
  for (const v of input.variants) {
    if (v.id && !existingIds.has(v.id)) throw ApiError.badRequest("Biến thể không thuộc sản phẩm này");
  }
  const keepIds = input.variants.filter((v) => v.id).map((v) => v.id as number);
  const toDelete = current.variants.filter((v) => !keepIds.includes(v.id)).map((v) => v.id);

  // Transaction: cập nhật sản phẩm + đồng bộ biến thể nguyên khối.
  await prisma.$transaction(async (tx) => {
    if (toDelete.length) await tx.productVariant.deleteMany({ where: { id: { in: toDelete } } });
    // Đổi tên tạm các biến thể giữ lại trước để tránh đụng ràng buộc unique (size, color) khi hoán đổi.
    for (const v of input.variants.filter((x) => x.id)) {
      await tx.productVariant.update({ where: { id: v.id }, data: { size: `__tmp_${v.id}`, color: `__tmp_${v.id}` } });
    }
    for (const v of input.variants) {
      if (v.id) {
        await tx.productVariant.update({ where: { id: v.id }, data: { size: v.size, color: v.color, stock: v.stock } });
      } else {
        await tx.productVariant.create({ data: { productId: id, size: v.size, color: v.color, stock: v.stock } });
      }
    }
    await tx.product.update({
      where: { id },
      data: {
        sku: input.sku,
        name: input.name,
        slug,
        description: input.description,
        price: input.price,
        salePrice,
        finalPrice: effectivePrice(input.price, salePrice),
        imageUrl: input.imageUrl,
        categoryId: input.categoryId,
        isFeatured: input.isFeatured,
        status: input.status,
      },
    });
  });
  return getAdminById(id);
}

export async function updateStatus(id: number, status: "ACTIVE" | "INACTIVE") {
  const existed = await prisma.product.findUnique({ where: { id } });
  if (!existed) throw ApiError.notFound("Không tìm thấy sản phẩm");
  await prisma.product.update({ where: { id }, data: { status } });
  return getAdminById(id);
}

/** Đặt toàn bộ biến thể về tồn kho 0 (đánh dấu hết hàng nhanh). */
export async function markOutOfStock(id: number) {
  const existed = await prisma.product.findUnique({ where: { id } });
  if (!existed) throw ApiError.notFound("Không tìm thấy sản phẩm");
  await prisma.productVariant.updateMany({ where: { productId: id }, data: { stock: 0 } });
  return getAdminById(id);
}

export async function remove(id: number) {
  const existed = await prisma.product.findUnique({ where: { id } });
  if (!existed) throw ApiError.notFound("Không tìm thấy sản phẩm");
  // Biến thể, giỏ hàng, đánh giá xóa theo (cascade). Chi tiết đơn hàng cũ vẫn giữ nhờ dữ liệu "ảnh chụp" (SetNull).
  await prisma.product.delete({ where: { id } });
}
