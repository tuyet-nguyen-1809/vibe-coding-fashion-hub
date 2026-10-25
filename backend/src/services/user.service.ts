import { prisma } from "../lib/prisma";
import type { Prisma } from "../generated/prisma/client";
import { ApiError } from "../utils/ApiError";
import { buildMeta } from "../utils/response";
import type { UserListQuery } from "../validators/admin.validator";

// Không bao giờ chọn passwordHash.
const safeSelect = { id: true, name: true, email: true, phone: true, role: true, createdAt: true } as const;

export async function listCustomers(q: UserListQuery) {
  const where: Prisma.UserWhereInput = { role: "CUSTOMER" };
  if (q.q) where.OR = [{ name: { contains: q.q } }, { email: { contains: q.q } }, { phone: { contains: q.q } }];

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { ...safeSelect, _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);

  const spent = await prisma.order.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) }, status: "COMPLETED" },
    _sum: { total: true },
  });
  const spentMap = new Map(spent.map((s) => [s.userId, s._sum.total ?? 0]));

  return {
    items: users.map(({ _count, ...u }) => ({ ...u, orderCount: _count.orders, totalSpent: spentMap.get(u.id) ?? 0 })),
    meta: buildMeta(q.page, q.limit, total),
  };
}

export async function getCustomer(id: number) {
  const user = await prisma.user.findUnique({ where: { id }, select: safeSelect });
  if (!user || user.role !== "CUSTOMER") throw ApiError.notFound("Không tìm thấy khách hàng");
  const [orders, spent] = await Promise.all([
    prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, code: true, total: true, status: true, paymentMethod: true, createdAt: true, _count: { select: { items: true } } },
    }),
    prisma.order.aggregate({ where: { userId: id, status: "COMPLETED" }, _sum: { total: true } }),
  ]);
  return { ...user, orders, orderCount: orders.length, totalSpent: spent._sum.total ?? 0 };
}
