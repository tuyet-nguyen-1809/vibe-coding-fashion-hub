import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../middlewares/auth";
import { ApiError } from "../utils/ApiError";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "../validators/auth.validator";

const BCRYPT_ROUNDS = 10;

// Chỉ trả về các trường an toàn, không bao giờ trả passwordHash.
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
} as const;

export async function register(input: RegisterInput) {
  const existed = await prisma.user.findUnique({ where: { email: input.email } });
  if (existed) throw ApiError.conflict("Email này đã được sử dụng", "EMAIL_EXISTS");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  // Luôn tạo tài khoản CUSTOMER, không nhận trường role từ client.
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, phone: input.phone ?? null, passwordHash, role: "CUSTOMER" },
    select: publicUserSelect,
  });
  return { user, token: signToken(user) };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Thông báo chung chung để không lộ email nào đã tồn tại.
  const ok = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !ok) throw new ApiError(401, "Email hoặc mật khẩu không đúng", "INVALID_CREDENTIALS");

  const { passwordHash: _omit, updatedAt: _u, ...safe } = user;
  return { user: safe, token: signToken(user) };
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) throw ApiError.notFound("Không tìm thấy tài khoản");
  return user;
}

export async function updateProfile(userId: number, input: UpdateProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data: { name: input.name, phone: input.phone ?? null },
    select: publicUserSelect,
  });
}

export async function changePassword(userId: number, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("Không tìm thấy tài khoản");
  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!ok) throw ApiError.badRequest("Mật khẩu hiện tại không đúng");
  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
