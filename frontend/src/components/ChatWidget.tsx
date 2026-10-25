import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import clsx from "clsx";
import { chatApi } from "../services";
import { getErrorMessage } from "../services/api";
import type { ChatMessage } from "../types";
import { formatVND } from "../utils/format";
import { ProductImage } from "./ui/ProductImage";

const QUICK = ["Gợi ý áo thun dưới 200k", "Đi tiệc nên mặc gì?", "Có giày nào đang giảm giá?", "Phí vận chuyển thế nào?"];

const WELCOME: ChatMessage = {
  role: "assistant",
  content: "Xin chào! Mình là trợ lý tư vấn của Fashion Hub. Bạn đang tìm trang phục cho dịp nào, hoặc cần gợi ý sản phẩm theo ngân sách?",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || enabled !== null) return;
    chatApi
      .status()
      .then((s) => setEnabled(s.enabled))
      .catch(() => setEnabled(false));
  }, [open, enabled]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    const history = [...messages.filter((m) => m !== WELCOME && !m.error), { role: "user" as const, content }];
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setSending(true);
    try {
      const res = await chatApi.send(history.slice(-12).map(({ role, content }) => ({ role, content })));
      setMessages((m) => [...m, { role: "assistant", content: res.reply, suggestions: res.suggestions }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: getErrorMessage(e, "Trợ lý đang bận, bạn thử lại sau nhé."), error: true }]);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed right-4 bottom-4 z-50 grid size-14 place-items-center rounded-full bg-ink text-white shadow-xl transition hover:scale-105 sm:right-6 sm:bottom-6"
        aria-label={open ? "Đóng trợ lý tư vấn" : "Mở trợ lý tư vấn"}
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>

      {open && (
        <div className="fixed inset-x-2 bottom-20 z-50 flex h-[min(70vh,560px)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-96">
          <div className="flex items-center gap-3 bg-ink px-4 py-3 text-white">
            <div className="grid size-9 place-items-center rounded-full bg-white/10"><Sparkles className="size-4" /></div>
            <div>
              <p className="text-sm font-semibold">Trợ lý tư vấn AI</p>
              <p className="text-xs text-white/60">{enabled === false ? "Chưa được cấu hình" : "Tư vấn sản phẩm Fashion Hub"}</p>
            </div>
          </div>

          <div ref={listRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto bg-paper px-3 py-4">
            {enabled === false && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                Chatbot cần API key (Gemini hoặc OpenAI) để hoạt động. Quản trị viên hãy thêm <code className="font-mono">GEMINI_API_KEY</code> hoặc <code className="font-mono">OPENAI_API_KEY</code> vào file <code className="font-mono">backend/.env</code> rồi khởi động lại Backend.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={clsx("flex gap-2", m.role === "user" && "justify-end")}>
                {m.role === "assistant" && <div className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-white ring-1 ring-line"><Bot className="size-4" /></div>}
                <div className="max-w-[80%] space-y-2">
                  <div
                    className={clsx(
                      "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line",
                      m.role === "user" ? "rounded-br-sm bg-ink text-white" : m.error ? "rounded-bl-sm bg-red-50 text-red-700 ring-1 ring-red-100" : "rounded-bl-sm bg-white ring-1 ring-line",
                    )}
                  >
                    {m.content}
                  </div>
                  {m.suggestions?.map((s) => (
                    <Link key={s.id} to={`/products/${s.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl bg-white p-2 ring-1 ring-line hover:ring-ink">
                      <ProductImage src={s.imageUrl} alt={s.name} className="size-11 shrink-0 rounded-lg" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{s.name}</p>
                        <p className="text-xs text-accent">{formatVND(s.salePrice ?? s.price)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-2">
                <div className="grid size-7 place-items-center rounded-full bg-white ring-1 ring-line"><Bot className="size-4" /></div>
                <div className="flex items-center gap-1 rounded-2xl bg-white px-4 py-3 ring-1 ring-line">
                  {[0, 1, 2].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${d * 0.15}s` }} />)}
                </div>
              </div>
            )}
          </div>

          {messages.length === 1 && enabled !== false && (
            <div className="scroll-thin flex gap-2 overflow-x-auto border-t border-line bg-white px-3 py-2">
              {QUICK.map((q) => (
                <button key={q} type="button" onClick={() => send(q)} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs hover:border-ink">{q}</button>
              ))}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-line bg-white p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              className="input rounded-full"
              placeholder={enabled === false ? "Chatbot chưa được cấu hình" : "Nhập câu hỏi..."}
              disabled={sending || enabled === false}
              aria-label="Nội dung tin nhắn"
            />
            <button type="submit" className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-white disabled:opacity-40" disabled={sending || !input.trim() || enabled === false} aria-label="Gửi">
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
