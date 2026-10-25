import { randomInt } from "node:crypto";
import { prisma } from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";
import type { OrderStatus } from "../generated/prisma/enums";
import { ApiError } from "../utils/ApiError";
import { buildMeta } from "../utils/response";
import { calcTotals, effectivePrice } from "../utils/pricing";
import { canTransition, customerCanCancel, ORDER_STATUS_LABEL } from "../utils/orderStatus";
import type {
  AdminOrderListQuery,
  CreateOrderInput,
  MyOrdersQuery,
} from "../validators/order.validator";

type Tx = Prisma.TransactionClient;

const orderDetailInclude = {
  items: { orderBy: { id: "asc" } },
  user: { select: { id: true, name: true, email: true, phone: true } },
} satisfies Prisma.OrderInclude;

function generateOrderCode() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 5; i++) rand += alphabet[randomInt(alphabet.length)];
  return `FH${ymd}${rand}`;
}

async function findByIdempotency(userId: number, idempotencyKey: string) {
  return prisma.order.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
    include: orderDetailInclude,
  });
}

/**
 * Tạo đơn hàng từ giỏ hàng của người dùng:
 * - Chống tạo trùng bằng idempotencyKey (unique theo user).
 * - Giá lấy lại từ DB, không tin giá từ Frontend.
 * - Trừ tồn kho có điều kiện (stock >= quantity) trong transaction để không bán âm kho.
 */
export async function createOrder(userId: number, input: CreateOrderInput) {
  const existed = await findByIdempotency(userId, input.idempotencyKey);
  if (existed) return { order: existed, duplicated: true };

  try {
    const order = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: { include: { variant: { include: { product: true } } } } },
      });
      if (!cart || cart.items.length === 0) throw ApiError.badRequest("Giỏ hàng đang trống");

      const lines = cart.items.map((item) => {
        const { variant } = item;
        const product = variant.product;
        if (product.status !== "ACTIVE") throw ApiError.conflict(`"${product.name}" đã ngừng bán, vui lòng xóa khỏi giỏ hàng`, "PRODUCT_INACTIVE");
        if (item.quantity > variant.stock) {
          throw ApiError.conflict(
            variant.stock === 0
              ? `"${product.name}" (${variant.size}/${variant.color}) đã hết hàng`
              : `"${product.name}" (${variant.size}/${variant.color}) chỉ còn ${variant.stock} sản phẩm`,
            "OUT_OF_STOCK",
          );
        }
        const unitPrice = effectivePrice(product.price, product.salePrice);
        return { item, variant, product, unitPrice, quantity: item.quantity };
      });

      // Trừ kho an toàn: chỉ cập nhật khi tồn kho còn đủ (tránh race condition khi nhiều người mua cùng lúc).
      for (const l of lines) {
        const res = await tx.productVariant.updateMany({
          where: { id: l.variant.id, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity } },
        });
        if (res.count === 0) throw ApiError.conflict(`"${l.product.name}" vừa hết hàng, vui lòng kiểm tra lại giỏ hàng`, "OUT_OF_STOCK");
      }

      const totals = calcTotals(lines);
      const created = await tx.order.create({
        data: {
          code: generateOrderCode(),
          userId,
          recipientName: input.recipientName,
          phone: input.phone,
          address: input.address,
          note: input.note || null,
          paymentMethod: input.paymentMethod,
          // Thanh toán giả lập: coi như đã thanh toán ngay (không thu thông tin thẻ thật).
          paymentStatus: input.paymentMethod === "MOCK_ONLINE" ? "PAID" : "UNPAID",
          status: "PROCESSING",
          ...totals,
          idempotencyKey: input.idempotencyKey,
          items: {
            create: lines.map((l) => ({
              productId: l.product.id,
              variantId: l.variant.id,
              productName: l.product.name,
              sku: l.product.sku,
              size: l.variant.size,
              color: l.variant.color,
              imageUrl: l.product.imageUrl,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              lineTotal: l.unitPrice * l.quantity,
            })),
          },
        },
        include: orderDetailInclude,
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });
    return { order, duplicated: false };
  } catch (err) {
    // Hai yêu cầu cùng idempotencyKey chạy song song: yêu cầu sau dính unique -> trả về đơn đã tạo.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await findByIdempotency(userId, input.idempotencyKey);
      if (again) return { order: again, duplicated: true };
    }
    throw err;
  }
}

export async function listMine(userId: number, q: MyOrdersQuery) {
  const where: Prisma.OrderWhereInput = { userId, ...(q.status ? { status: q.status } : {}) };
  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { items: { select: { id: true, productName: true, imageUrl: true, quantity: true }, take: 3 }, _count: { select: { items: true } } },
    }),
  ]);
  return { items, meta: buildMeta(q.page, q.limit, total) };
}

export async function getMine(userId: number, id: number) {
  // Lọc theo cả userId: người khác truy cập sẽ nhận 404, không lộ sự tồn tại của đơn.
  const order = await prisma.order.findFirst({ where: { id, userId }, include: orderDetailInclude });
  if (!order) throw ApiError.notFound("Không tìm thấy đơn hàng");
  return order;
}

/** Hoàn lại tồn kho cho các dòng của đơn (bỏ qua biến thể đã bị xóa). */
async function restock(tx: Tx, orderId: number) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const it of items) {
    if (it.variantId == null) continue;
    await tx.productVariant.updateMany({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
  }
}

/** Chuyển trạng thái có điều kiện (where status = trạng thái cũ) để tránh xử lý trùng khi 2 thao tác cùng lúc. */
async function transition(orderId: number, from: OrderStatus, to: OrderStatus, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const now = new Date();
    const data: Prisma.OrderUpdateManyMutationInput = { status: to };
    if (to === "COMPLETED") {
      data.completedAt = now;
      data.paymentStatus = "PAID"; // COD: đã thu tiền khi giao thành công
    }
    if (to === "CANCELLED") {
      data.cancelledAt = now;
      data.cancelReason = reason || null;
      if (order.paymentStatus === "PAID") data.paymentStatus = "REFUNDED";
    }
    const res = await tx.order.updateMany({ where: { id: orderId, status: from }, data });
    if (res.count === 0) throw ApiError.conflict("Trạng thái đơn hàng vừa được thay đổi, vui lòng tải lại", "STATUS_CHANGED");
    if (to === "CANCELLED") await restock(tx, orderId);
    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderDetailInclude });
  });
}

export async function cancelMine(userId: number, id: number, reason?: string) {
  const order = await getMine(userId, id);
  if (!customerCanCancel(order.status)) {
    throw ApiError.badRequest(`Không thể hủy đơn ở trạng thái "${ORDER_STATUS_LABEL[order.status]}". Chỉ hủy được khi đơn đang xử lý.`);
  }
  return transition(order.id, order.status, "CANCELLED", reason || "Khách hàng hủy đơn");
}

// ===================== Quản trị =====================

export async function listAdmin(q: AdminOrderListQuery) {
  const where: Prisma.OrderWhereInput = {};
  if (q.status) where.status = q.status;
  if (q.q) where.OR = [{ code: { contains: q.q } }, { recipientName: { contains: q.q } }, { phone: { contains: q.q } }];
  if (q.from || q.to) {
    where.createdAt = {
      ...(q.from ? { gte: new Date(`${q.from}T00:00:00+07:00`) } : {}),
      ...(q.to ? { lte: new Date(`${q.to}T23:59:59.999+07:00`) } : {}),
    };
  }
  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { user: { select: { id: true, name: true, email: true } }, _count: { select: { items: true } } },
    }),
  ]);
  return { items, meta: buildMeta(q.page, q.limit, total) };
}

export async function getAdmin(id: number) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderDetailInclude });
  if (!order) throw ApiError.notFound("Không tìm thấy đơn hàng");
  return order;
}

export async function updateStatusAdmin(id: number, to: OrderStatus, reason?: string) {
  const order = await getAdmin(id);
  if (order.status === to) throw ApiError.badRequest(`Đơn hàng đã ở trạng thái "${ORDER_STATUS_LABEL[to]}"`);
  if (!canTransition(order.status, to)) {
    throw ApiError.badRequest(
      `Không thể chuyển từ "${ORDER_STATUS_LABEL[order.status]}" sang "${ORDER_STATUS_LABEL[to]}"`,
    );
  }
  return transition(id, order.status, to, reason || (to === "CANCELLED" ? "Cửa hàng hủy đơn" : undefined));
}
