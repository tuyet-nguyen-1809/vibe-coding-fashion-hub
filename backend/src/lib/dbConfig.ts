import type { PoolConfig } from "mariadb";

/**
 * Chuyển DATABASE_URL (mysql://user:pass@host:port/db) thành cấu hình cho driver.
 * allowPublicKeyRetrieval giúp kết nối MySQL 8 (xác thực caching_sha2_password) khi không dùng SSL ở máy cá nhân.
 */
export function dbConfigFromUrl(url: string): PoolConfig {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: 10,
    allowPublicKeyRetrieval: true,
  };
}
