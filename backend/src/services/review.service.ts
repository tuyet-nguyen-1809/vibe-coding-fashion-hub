import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { buildMeta } from "../utils/response";
import type { CreateReviewInput } from "../validators/review.validator";

async function ensureProduct(productId: number) {
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!p) throw ApiError.notFound("Sản phẩm không tồn tại");
}

export async function listByProduct(productId: number, page: number, limit: number) {
  await ensureProduct(productId);
  const where = { productId };
  const [total, items, agg, dist] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { id: true, name: true } } },
    }),
    prisma.review.aggregate({ where, _avg: { rating: true } }),
    prisma.review.groupBy({ by: ["rating"], where, _count: { _all: true } }),
  ]);
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: dist.find((d) => d.rating === star)?._count._all ?? 0,
  }));
  return {
    items,
    summary: { avg: Math.round((agg._avg.rating ?? 0) * 10) / 10, count: total, distribution },
    meta: buildMeta(page, limit, total),
  };
}

/** Chỉ người đã mua và nhận hàng thành công (đơn "Đã hoàn thành") mới được đánh giá, mỗi người 1 lần/sản phẩm. */
export async function eligibility(userId: number, productId: number) {
  await ensureProduct(productId);
  const [purchased, reviewed] = await Promise.all([
    prisma.orderItem.findFirst({ where: { productId, order: { userId, status: "COMPLETED" } }, select: { id: true } }),
    prisma.review.findUnique({ where: { userId_productId: { userId, productId } }, select: { id: true } }),
  ]);
  return {
    canReview: Boolean(purchased) && !reviewed,
    hasPurchased: Boolean(purchased),
    hasReviewed: Boolean(reviewed),
  };
}

export async function create(userId: number, productId: number, input: CreateReviewInput) {
  const e = await eligibility(userId, productId);
  if (e.hasReviewed) throw ApiError.conflict("Bạn đã đánh giá sản phẩm này rồi", "ALREADY_REVIEWED");
  if (!e.hasPurchased) throw ApiError.forbidden("Chỉ khách hàng đã mua và nhận sản phẩm mới có thể đánh giá");
  return prisma.review.create({
    data: { userId, productId, rating: input.rating, comment: input.comment },
    select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { id: true, name: true } } },
  });
}
