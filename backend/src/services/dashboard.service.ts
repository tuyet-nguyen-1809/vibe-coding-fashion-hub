import { prisma } from "../lib/prisma";
import { REVENUE_STATUSES } from "../utils/orderStatus";
import { LOW_STOCK_THRESHOLD } from "./product.service";

const TZ = "Asia/Ho_Chi_Minh";
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD

/**
 * Cách tính doanh thu:
 * - Doanh thu thực tế = tổng `total` của đơn "Đã hoàn thành" (COMPLETED), theo ngày hoàn thành.
 * - Doanh thu dự kiến = tổng `total` của đơn "Đang xử lý" + "Đang giao" (chưa ghi nhận).
 * - Đơn "Đã hủy" không được tính.
 */
export async function getOverview(days: number) {
  const now = new Date();
  const start = new Date(now.getTime() - (days - 1) * 86_400_000);
  start.setHours(0, 0, 0, 0);

  const [revenueAgg, pendingAgg, totalOrders, totalCustomers, totalProducts, statusGroups, latestOrders, completedInRange, ordersInRange, variantSums, topItems] =
    await Promise.all([
      prisma.order.aggregate({ where: { status: { in: REVENUE_STATUSES } }, _sum: { total: true }, _count: { _all: true } }),
      prisma.order.aggregate({ where: { status: { in: ["PROCESSING", "SHIPPING"] } }, _sum: { total: true } }),
      prisma.order.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.product.count(),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true }, _sum: { total: true } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, code: true, recipientName: true, total: true, status: true, createdAt: true, user: { select: { name: true } } },
      }),
      prisma.order.findMany({
        where: { status: { in: REVENUE_STATUSES }, completedAt: { gte: start } },
        select: { total: true, completedAt: true },
      }),
      prisma.order.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
      prisma.productVariant.groupBy({ by: ["productId"], _sum: { stock: true } }),
      prisma.orderItem.groupBy({
        by: ["productId", "productName"],
        where: { order: { status: { in: REVENUE_STATUSES } } },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
    ]);

  // Chuỗi doanh thu theo ngày (đủ mọi ngày, ngày không có đơn = 0)
  const series = new Map<string, { date: string; revenue: number; completedOrders: number; newOrders: number }>();
  for (let i = 0; i < days; i++) {
    const k = dayKey(new Date(start.getTime() + i * 86_400_000));
    series.set(k, { date: k, revenue: 0, completedOrders: 0, newOrders: 0 });
  }
  for (const o of completedInRange) {
    const row = o.completedAt && series.get(dayKey(o.completedAt));
    if (row) {
      row.revenue += o.total;
      row.completedOrders += 1;
    }
  }
  for (const o of ordersInRange) {
    const row = series.get(dayKey(o.createdAt));
    if (row) row.newOrders += 1;
  }

  // Tồn kho
  const stockByProduct = new Map(variantSums.map((v) => [v.productId, v._sum.stock ?? 0]));
  const products = await prisma.product.findMany({ select: { id: true, name: true, sku: true, imageUrl: true } });
  const withStock = products.map((p) => ({ ...p, totalStock: stockByProduct.get(p.id) ?? 0 }));
  const lowStock = withStock.filter((p) => p.totalStock > 0 && p.totalStock <= LOW_STOCK_THRESHOLD);
  const outOfStock = withStock.filter((p) => p.totalStock === 0);

  const statuses = ["PROCESSING", "SHIPPING", "COMPLETED", "CANCELLED"] as const;
  const statusBreakdown = statuses.map((s) => {
    const g = statusGroups.find((x) => x.status === s);
    return { status: s, count: g?._count._all ?? 0, total: g?._sum.total ?? 0 };
  });

  return {
    revenueRule: "Doanh thu thực tế chỉ tính đơn hàng có trạng thái Đã hoàn thành; không tính đơn Đã hủy.",
    stats: {
      totalRevenue: revenueAgg._sum.total ?? 0,
      completedOrders: revenueAgg._count._all,
      pendingRevenue: pendingAgg._sum.total ?? 0,
      totalOrders,
      totalCustomers,
      totalProducts,
      processingOrders: statusBreakdown.find((s) => s.status === "PROCESSING")?.count ?? 0,
      lowStockProducts: lowStock.length,
      outOfStockProducts: outOfStock.length,
      revenueInRange: completedInRange.reduce((s, o) => s + o.total, 0),
    },
    revenueSeries: [...series.values()],
    statusBreakdown,
    latestOrders,
    topProducts: topItems.map((t) => ({
      productId: t.productId,
      name: t.productName,
      quantity: t._sum.quantity ?? 0,
      revenue: t._sum.lineTotal ?? 0,
    })),
    lowStockList: [...outOfStock, ...lowStock].sort((a, b) => a.totalStock - b.totalStock).slice(0, 6),
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    days,
  };
}
