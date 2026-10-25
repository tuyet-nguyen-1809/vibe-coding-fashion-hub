import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { slugify } from "../utils/slug";
import type { CategoryInput } from "../validators/category.validator";

export async function list(onlyActiveProducts = true) {
  const rows = await prisma.category.findMany({
    orderBy: { id: "asc" },
    include: {
      _count: { select: { products: onlyActiveProducts ? { where: { status: "ACTIVE" } } : true } },
    },
  });
  return rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products }));
}

async function ensureUniqueName(name: string, excludeId?: number) {
  const slug = slugify(name);
  const existed = await prisma.category.findFirst({ where: { OR: [{ name }, { slug }] } });
  if (existed && existed.id !== excludeId) throw ApiError.conflict(`Danh mục "${name}" đã tồn tại`, "CATEGORY_EXISTS");
  return slug;
}

export async function create(input: CategoryInput) {
  const slug = await ensureUniqueName(input.name);
  return prisma.category.create({
    data: { name: input.name, slug, description: input.description ?? null, imageUrl: input.imageUrl ?? null },
  });
}

export async function update(id: number, input: CategoryInput) {
  const existed = await prisma.category.findUnique({ where: { id } });
  if (!existed) throw ApiError.notFound("Không tìm thấy danh mục");
  const slug = await ensureUniqueName(input.name, id);
  return prisma.category.update({
    where: { id },
    data: { name: input.name, slug, description: input.description ?? null, imageUrl: input.imageUrl ?? null },
  });
}

export async function remove(id: number) {
  const existed = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!existed) throw ApiError.notFound("Không tìm thấy danh mục");
  if (existed._count.products > 0) {
    throw ApiError.conflict(
      `Không thể xóa: danh mục đang có ${existed._count.products} sản phẩm. Hãy chuyển hoặc xóa các sản phẩm này trước.`,
      "CATEGORY_IN_USE",
    );
  }
  await prisma.category.delete({ where: { id } });
}
