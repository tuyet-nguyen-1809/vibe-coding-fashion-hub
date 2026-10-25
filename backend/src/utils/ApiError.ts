// Lỗi nghiệp vụ có mã HTTP, được middleware xử lý lỗi chuyển thành phản hồi JSON.
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, "BAD_REQUEST", details);
  }
  static unauthorized(message = "Vui lòng đăng nhập để tiếp tục") {
    return new ApiError(401, message, "UNAUTHORIZED");
  }
  static forbidden(message = "Bạn không có quyền thực hiện thao tác này") {
    return new ApiError(403, message, "FORBIDDEN");
  }
  static notFound(message = "Không tìm thấy dữ liệu") {
    return new ApiError(404, message, "NOT_FOUND");
  }
  static conflict(message: string, code = "CONFLICT") {
    return new ApiError(409, message, code);
  }
}
