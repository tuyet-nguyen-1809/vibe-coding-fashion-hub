import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "../config/env";
import { dbConfigFromUrl } from "./dbConfig";

// Prisma 7 kết nối MySQL thông qua driver adapter (mariadb driver tương thích MySQL).
const adapter = new PrismaMariaDb(dbConfigFromUrl(env.DATABASE_URL));

export const prisma = new PrismaClient({ adapter });
