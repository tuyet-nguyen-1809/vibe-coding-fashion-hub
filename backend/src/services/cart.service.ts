import { prisma } from "../lib/prisma";
import type { Prisma } from "../generated/prisma/client";
import { ApiError } from "../utils/ApiError";
import { calcTotals, effectivePrice } from "../utils/pricing";
import type { MergeCartInput } from "../validators/cart.validator";

const variantInclude = {
  product: { select: { id: true, name: true, slug: true, sku: true, imageUrl: true, price: true, salePrice: true, status: true } },
} satisfies Prisma.ProductVariantInclude;

type VariantWithProduct = Prisma.ProductVariantGetPayload<{ include: typeof variantInclude }>;

/** Dựng 1 dòng giỏ hàng với giá & tồn kho hiện tại lấy từ DB. */
function buildLine(variant: VariantWithProduct, quantity: number) {
  const p = variant.product;
  const unitPrice = effectivePrice(p.price, p.salePrice);
  let issue: string | null = null;
  if (p.status !== "ACTIVE") issue = "Sản phẩm đã ngừng bán";
  else if (variant.stock === 0) issue = "Sản phẩm đã hết hàng";
  else if (quantity > variant.stock) issue = `Chỉ còn ${variant.stock} sản phẩm`;
  return {
    variantId: variant.id,
    productId: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    imageUrl: p.imageUrl,
    size: variant.size,
    color: variant.color,
    price: p.price,
    unitPrice,
    quantity,
    stock: variant.stock,
    lineTotal: unitPrice * quantity,
    issue,
  };
}

function summarize(lines: ReturnType<typeof buildLine>[]) {
  const valid = lines.filter((l) => !l.issue);
  const totals = calcTotals(valid);
  return {
    items: lines,
    totalQuantity: lines.reduce((s, l) => s + l.quantity, 0),
    ...totals,
    hasIssues: lines.some((l) => l.issue),
  };
}

async function getOrCreateCart(userId: number) {
  return prisma.cart.upsert({ where: { userId }, create: { userId }, update: {} });
}

async function loadVariant(variantId: number) {
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, include: variantInclude });
  if (!variant) throw ApiError.notFound("Sản phẩm không còn tồn tại");
  if (variant.product.status !== "ACTIVE") throw ApiError.badRequest("Sản phẩm đã ngừng bán");
  return variant;
}

export async function getCart(userId: number) {
  const cart = await getOrCreateCart(userId);
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { variant: { include: variantInclude } },
    orderBy: { createdAt: "asc" },
  });
  return summarize(items.map((i) => buildLine(i.variant, i.quantity)));
}

export async function addItem(userId: number, variantId: number, quantity: number) {
  const variant = await loadVariant(variantId);
  const cart = await getOrCreateCart(userId);
  const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const newQty = (existing?.quantity ?? 0) + quantity;

  if (variant.stock === 0) throw ApiError.badRequest("Sản phẩm đã hết hàng");
  if (newQty > variant.stock) {
    throw ApiError.badRequest(
      existing
        ? `Chỉ còn ${variant.stock} sản phẩm, giỏ hàng của bạn đã có ${existing.quantity}`
        : `Chỉ còn ${variant.stock} sản phẩm trong kho`,
    );
  }

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity: newQty },
    update: { quantity: newQty },
  });
  return getCart(userId);
}

export async function updateItem(userId: number, variantId: number, quantity: number) {
  const cart = await getOrCreateCart(userId);
  const item = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  if (!item) throw ApiError.notFound("Sản phẩm không có trong giỏ hàng");
  const variant = await loadVariant(variantId);
  if (quantity > variant.stock) throw ApiError.badRequest(`Chỉ còn ${variant.stock} sản phẩm trong kho`);
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  return getCart(userId);
}

export async function removeItem(userId: number, variantId: number) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
  return getCart(userId);
}

export async function clear(userId: number) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return getCart(userId);
}

/** Gộp giỏ hàng khách vãng lai (localStorage) vào giỏ hàng tài khoản sau khi đăng nhập. */
export async function merge(userId: number, input: MergeCartInput) {
  const cart = await getOrCreateCart(userId);
  for (const it of input.items) {
    const variant = await prisma.productVariant.findUnique({ where: { id: it.variantId }, include: variantInclude });
    if (!variant || variant.product.status !== "ACTIVE" || variant.stock === 0) continue;
    const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId: it.variantId } } });
    const qty = Math.min((existing?.quantity ?? 0) + it.quantity, variant.stock);
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: it.variantId } },
      create: { cartId: cart.id, variantId: it.variantId, quantity: qty },
      update: { quantity: qty },
    });
  }
  return getCart(userId);
}

/** Tính giỏ hàng khách vãng lai với giá/tồn kho thật từ DB (không tin dữ liệu giá ở trình duyệt). */
export async function previewGuest(input: MergeCartInput) {
  const ids = input.items.map((i) => i.variantId);
  const variants = await prisma.productVariant.findMany({ where: { id: { in: ids } }, include: variantInclude });
  const byId = new Map(variants.map((v) => [v.id, v]));
  const lines = input.items.filter((i) => byId.has(i.variantId)).map((i) => buildLine(byId.get(i.variantId)!, i.quantity));
  return { ...summarize(lines), removedVariantIds: ids.filter((id) => !byId.has(id)) };
}
