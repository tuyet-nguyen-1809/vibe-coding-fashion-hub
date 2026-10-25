import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import type { ChatInput } from "../validators/chat.validator";

const TIMEOUT_MS = 25_000;
const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export function chatStatus() {
  const provider = env.AI_PROVIDER;
  const key = provider === "openai" ? env.OPENAI_API_KEY : env.GEMINI_API_KEY;
  return { enabled: Boolean(key), provider, model: provider === "openai" ? env.OPENAI_MODEL : env.GEMINI_MODEL };
}

/** Lấy danh sách sản phẩm đang bán từ DB làm ngữ cảnh cho AI. */
async function buildProductContext() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: { category: { select: { name: true } }, variants: true },
    orderBy: { id: "asc" },
    take: 80,
  });
  const lines = products.map((p) => {
    const inStock = p.variants.filter((v) => v.stock > 0);
    const total = inStock.reduce((s, v) => s + v.stock, 0);
    const sizes = [...new Set(inStock.map((v) => v.size))].join(", ") || "-";
    const colors = [...new Set(inStock.map((v) => v.color))].join(", ") || "-";
    const price = p.salePrice ? `${vnd(p.salePrice)} (giảm từ ${vnd(p.price)})` : vnd(p.price);
    return `- [${p.sku}] ${p.name} | Danh mục: ${p.category.name} | Giá: ${price} | ${total > 0 ? `Còn ${total} sp, size: ${sizes}, màu: ${colors}` : "HẾT HÀNG"} | Link: /products/${p.slug}`;
  });
  return { products, text: lines.join("\n") };
}

function systemPrompt(catalog: string) {
  return [
    "Bạn là nhân viên tư vấn bán hàng của cửa hàng thời trang trực tuyến Fashion Hub.",
    "Luôn trả lời bằng tiếng Việt, lịch sự, thân thiện, ngắn gọn (tối đa khoảng 150 từ), có thể dùng gạch đầu dòng.",
    "CHỈ giới thiệu sản phẩm có trong danh sách dưới đây; không bịa sản phẩm, giá hay khuyến mãi. Nêu đúng tên sản phẩm như trong danh sách.",
    "Nếu sản phẩm hết hàng thì nói rõ và gợi ý sản phẩm tương tự còn hàng.",
    "Có thể tư vấn phối đồ, chọn size theo chiều cao/cân nặng ở mức tham khảo.",
    "Chính sách: miễn phí vận chuyển cho đơn từ 500.000đ (dưới mức này phí 30.000đ); thanh toán COD hoặc thanh toán trực tuyến giả lập; khách có thể tự hủy đơn khi đơn còn 'Đang xử lý'.",
    "Nếu câu hỏi không liên quan đến mua sắm thời trang, hãy lịch sự từ chối và hướng khách về sản phẩm.",
    "",
    "DANH SÁCH SẢN PHẨM HIỆN CÓ:",
    catalog,
  ].join("\n");
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(504, "Trợ lý AI phản hồi quá lâu, vui lòng thử lại", "AI_TIMEOUT");
    }
    throw new ApiError(502, "Không kết nối được tới dịch vụ AI, vui lòng thử lại sau", "AI_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
  }
}

function handleProviderError(status: number) {
  if (status === 429) throw new ApiError(429, "Dịch vụ AI đã hết hạn mức sử dụng, vui lòng thử lại sau", "AI_QUOTA");
  if (status === 401 || status === 403) throw new ApiError(503, "API key của dịch vụ AI không hợp lệ hoặc đã hết hạn", "AI_KEY_INVALID");
  throw new ApiError(502, "Dịch vụ AI đang gặp sự cố, vui lòng thử lại sau", "AI_ERROR");
}

async function callGemini(system: string, messages: ChatInput["messages"]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { temperature: 0.6, maxOutputTokens: 800 },
    }),
  });
  if (!res.ok) handleProviderError(res.status);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
}

async function callOpenAI(system: string, messages: ChatInput["messages"]) {
  const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      temperature: 0.6,
      max_tokens: 800,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) handleProviderError(res.status);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function chat(input: ChatInput) {
  const status = chatStatus();
  if (!status.enabled) {
    // Không giả vờ gọi AI khi chưa có key.
    throw new ApiError(
      503,
      "Chatbot chưa được cấu hình. Quản trị viên cần thêm GEMINI_API_KEY hoặc OPENAI_API_KEY vào file backend/.env.",
      "AI_NOT_CONFIGURED",
    );
  }
  const { products, text } = await buildProductContext();
  const system = systemPrompt(text);
  const reply = status.provider === "openai" ? await callOpenAI(system, input.messages) : await callGemini(system, input.messages);
  if (!reply) throw new ApiError(502, "Trợ lý AI không trả lời được câu hỏi này, bạn thử hỏi cách khác nhé", "AI_EMPTY");

  // Gợi ý sản phẩm: các sản phẩm được nhắc tên trong câu trả lời.
  const lower = reply.toLowerCase();
  const suggestions = products
    .filter((p) => lower.includes(p.name.toLowerCase()))
    .slice(0, 4)
    .map((p) => ({ id: p.id, name: p.name, slug: p.slug, imageUrl: p.imageUrl, price: p.price, salePrice: p.salePrice }));

  return { reply, suggestions, provider: status.provider };
}
