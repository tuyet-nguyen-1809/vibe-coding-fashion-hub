/**
 * Seed dữ liệu mẫu cho Fashion Hub.
 * Chạy: npm run db:seed  (XÓA toàn bộ dữ liệu cũ rồi tạo lại).
 * Mật khẩu tài khoản mẫu đọc từ .env (SEED_ADMIN_PASSWORD, SEED_CUSTOMER_PASSWORD), không ghi cứng trong mã.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import type { OrderStatus, PaymentMethod } from "../src/generated/prisma/enums";
import { calcTotals, effectivePrice } from "../src/utils/pricing";
import { slugify } from "../src/utils/slug";
import { dbConfigFromUrl } from "../src/lib/dbConfig";

const { DATABASE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_CUSTOMER_PASSWORD } = process.env;
if (!DATABASE_URL) throw new Error("Thiếu DATABASE_URL trong .env");
if (!SEED_ADMIN_PASSWORD || !SEED_CUSTOMER_PASSWORD) {
  throw new Error("Thiếu SEED_ADMIN_PASSWORD hoặc SEED_CUSTOMER_PASSWORD trong .env (xem .env.example)");
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(dbConfigFromUrl(DATABASE_URL)) });

// Bộ sinh số giả ngẫu nhiên có seed cố định -> mỗi lần seed cho ra cùng một bộ dữ liệu.
let state = 20261025;
const rand = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const img = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const categories = [
  { name: "Áo thun", description: "Áo thun, áo polo năng động cho mọi ngày", image: "1521572163474-6864f9cf17ab" },
  { name: "Áo sơ mi", description: "Sơ mi công sở và dạo phố thanh lịch", image: "1596755094514-f87e34085b2c" },
  { name: "Áo khoác", description: "Áo khoác, hoodie, blazer giữ ấm và cá tính", image: "1551028719-00167b16eac5" },
  { name: "Quần", description: "Quần jeans, kaki, short đủ phong cách", image: "1542272604-787c3835535d" },
  { name: "Váy & Đầm", description: "Váy, đầm nữ tính cho mọi dịp", image: "1572804013309-59a88b7e92f1" },
  { name: "Giày dép", description: "Sneaker, boots và giày thời trang", image: "1549298916-b41d501d3772" },
  { name: "Phụ kiện", description: "Túi xách, mũ, kính, đồng hồ hoàn thiện outfit", image: "1584917865442-de89df76afd3" },
];

const SIZE_TOP = ["S", "M", "L", "XL"];
const SIZE_PANTS = ["29", "30", "31", "32"];
const SIZE_SHOES = ["39", "40", "41", "42"];
const FREE = ["Free size"];

type Seed = {
  sku: string;
  name: string;
  category: string;
  price: number;
  sale?: number;
  image: string;
  sizes: string[];
  colors: string[];
  featured?: boolean;
  stock?: "normal" | "low" | "out";
  description: string;
};

const products: Seed[] = [
  { sku: "AT001", name: "Áo thun cotton basic", category: "Áo thun", price: 199000, sale: 159000, image: "1521572163474-6864f9cf17ab", sizes: SIZE_TOP, colors: ["Trắng", "Đen"], featured: true, description: "Áo thun cổ tròn chất liệu 100% cotton 2 chiều, thấm hút mồ hôi tốt, form regular dễ phối. Đường may chắc chắn, không xù lông sau nhiều lần giặt." },
  { sku: "AT002", name: "Áo thun oversize Street", category: "Áo thun", price: 249000, image: "1583743814966-8936f5b7be1a", sizes: SIZE_TOP, colors: ["Đen", "Xám"], description: "Áo thun dáng rộng phong cách đường phố, vai rơi, vải cotton dày dặn 250gsm đứng form. Phù hợp phối cùng quần jeans hoặc short." },
  { sku: "AT003", name: "Áo thun in họa tiết Graphic", category: "Áo thun", price: 229000, sale: 179000, image: "1503341504253-dff4815485f1", sizes: SIZE_TOP, colors: ["Trắng", "Be"], description: "Áo thun in họa tiết graphic công nghệ in lụa bền màu, chất cotton mềm mịn, phù hợp đi chơi, dạo phố cuối tuần." },
  { sku: "AT004", name: "Áo thun cổ tim Minimal", category: "Áo thun", price: 189000, image: "1576566588028-4147f3842f27", sizes: SIZE_TOP, colors: ["Trắng", "Xanh navy"], stock: "low", description: "Áo thun cổ tim tối giản, vải cotton pha spandex co giãn nhẹ, ôm vừa phải tôn dáng. Món đồ cơ bản không thể thiếu." },
  { sku: "SM001", name: "Sơ mi Oxford trắng", category: "Áo sơ mi", price: 389000, image: "1596755094514-f87e34085b2c", sizes: SIZE_TOP, colors: ["Trắng", "Xanh nhạt"], featured: true, description: "Sơ mi vải Oxford dệt nổi cao cấp, cổ button-down, form slim fit. Lịch sự khi đi làm, trẻ trung khi xắn tay đi chơi." },
  { sku: "SM002", name: "Sơ mi kẻ sọc công sở", category: "Áo sơ mi", price: 359000, sale: 299000, image: "1598033129183-c4f50c736f10", sizes: SIZE_TOP, colors: ["Xanh sọc", "Hồng sọc"], description: "Sơ mi kẻ sọc nhỏ thanh lịch, vải bamboo chống nhăn, thoáng mát cả ngày dài nơi công sở." },
  { sku: "SM003", name: "Sơ mi linen tay ngắn", category: "Áo sơ mi", price: 329000, image: "1594633312681-425c7b97ccd1", sizes: SIZE_TOP, colors: ["Be", "Xanh rêu"], description: "Sơ mi linen tự nhiên thoáng khí, cổ Cuban phóng khoáng, lý tưởng cho mùa hè và những chuyến du lịch biển." },
  { sku: "AK001", name: "Áo khoác da Biker", category: "Áo khoác", price: 1290000, sale: 990000, image: "1551028719-00167b16eac5", sizes: SIZE_TOP, colors: ["Đen", "Nâu"], featured: true, description: "Áo khoác da PU cao cấp phong cách biker, khóa kéo lệch kim loại, lót trong mềm mại. Điểm nhấn cá tính cho mọi outfit." },
  { sku: "AK002", name: "Áo khoác denim cổ điển", category: "Áo khoác", price: 590000, image: "1576871337622-98d48d1cf531", sizes: SIZE_TOP, colors: ["Xanh đậm", "Xanh nhạt"], description: "Áo khoác jean wash cổ điển, chất denim dày dặn bền bỉ, túi ngực nắp gài, dễ phối với áo thun và váy." },
  { sku: "AK003", name: "Hoodie nỉ bông Essential", category: "Áo khoác", price: 449000, sale: 379000, image: "1556821840-3a63f95609a7", sizes: SIZE_TOP, colors: ["Xám", "Đen"], description: "Hoodie nỉ bông mềm ấm, mũ trùm hai lớp, túi kangaroo tiện lợi. Lựa chọn hoàn hảo cho ngày se lạnh." },
  { sku: "AK004", name: "Blazer dáng suông Modern", category: "Áo khoác", price: 890000, image: "1594938298603-c8148c4dae35", sizes: SIZE_TOP, colors: ["Đen", "Be"], description: "Blazer dáng suông hiện đại, vai đệm nhẹ, vải tuyết mưa ít nhăn. Mặc đi làm hay dạo phố đều sang trọng." },
  { sku: "QU001", name: "Quần jeans slim fit", category: "Quần", price: 499000, image: "1542272604-787c3835535d", sizes: SIZE_PANTS, colors: ["Xanh đậm", "Đen"], featured: true, description: "Quần jeans slim fit co giãn 4 chiều, ôm vừa vặn, thoải mái vận động. Chất denim cao cấp giữ màu lâu." },
  { sku: "QU002", name: "Quần jeans ống rộng", category: "Quần", price: 529000, sale: 449000, image: "1541099649105-f69ad21f3246", sizes: SIZE_PANTS, colors: ["Xanh nhạt", "Xanh đậm"], description: "Quần jeans ống rộng lưng cao hack dáng, phong cách vintage, phối cùng áo croptop hoặc sơ mi đều đẹp." },
  { sku: "QU003", name: "Quần kaki chinos", category: "Quần", price: 429000, image: "1624378439575-d8705ad7ae80", sizes: SIZE_PANTS, colors: ["Be", "Xanh rêu"], description: "Quần kaki chinos dáng straight thanh lịch, vải cotton twill mềm mại, phù hợp đi làm và đi chơi." },
  { sku: "QU004", name: "Quần short kaki", category: "Quần", price: 279000, image: "1591195853828-11db59a44f6b", sizes: SIZE_PANTS, colors: ["Be", "Đen"], stock: "low", description: "Quần short kaki dài trên gối, lưng thun phối dây rút tiện lợi, mát mẻ cho ngày hè năng động." },
  { sku: "VD001", name: "Đầm hoa maxi Summer", category: "Váy & Đầm", price: 690000, sale: 549000, image: "1572804013309-59a88b7e92f1", sizes: SIZE_TOP, colors: ["Vàng hoa", "Trắng hoa"], featured: true, description: "Đầm maxi họa tiết hoa nhí, vải voan lụa bay bổng hai lớp, cổ V nữ tính. Hoàn hảo cho những chuyến du lịch mùa hè." },
  { sku: "VD002", name: "Đầm suông đen thanh lịch", category: "Váy & Đầm", price: 590000, image: "1595777457583-95e059d581b8", sizes: SIZE_TOP, colors: ["Đen"], description: "Đầm suông màu đen tối giản, dài qua gối, vải tuyết mưa đứng dáng. Item kinh điển cho công sở và tiệc nhẹ." },
  { sku: "VD003", name: "Chân váy midi xếp ly", category: "Váy & Đầm", price: 399000, image: "1583496661160-fb5886a0aaaa", sizes: ["S", "M", "L"], colors: ["Be", "Đen"], description: "Chân váy midi xếp ly mềm mại, lưng cao có khóa kéo ẩn, chuyển động uyển chuyển theo từng bước đi." },
  { sku: "VD004", name: "Đầm lụa hai dây Evening", category: "Váy & Đầm", price: 790000, sale: 650000, image: "1515372039744-b8f02a3ae446", sizes: ["S", "M", "L"], colors: ["Đỏ rượu", "Đen"], description: "Đầm lụa satin hai dây dáng suông, dây vai điều chỉnh được, sang trọng cho các buổi tiệc tối." },
  { sku: "GD001", name: "Sneaker trắng Classic", category: "Giày dép", price: 790000, image: "1549298916-b41d501d3772", sizes: SIZE_SHOES, colors: ["Trắng"], featured: true, description: "Giày sneaker trắng tối giản, da tổng hợp dễ vệ sinh, đế cao su chống trơn trượt, êm chân cả ngày." },
  { sku: "GD002", name: "Giày chạy bộ Runner", category: "Giày dép", price: 990000, sale: 790000, image: "1542291026-7eec264c27ff", sizes: SIZE_SHOES, colors: ["Đỏ", "Đen"], description: "Giày chạy bộ thân lưới thoáng khí, đế EVA đàn hồi giảm chấn, nhẹ và bám đường tốt." },
  { sku: "GD003", name: "Boots da cổ ngắn", category: "Giày dép", price: 1190000, image: "1608256246200-53e635b5b65f", sizes: SIZE_SHOES, colors: ["Nâu", "Đen"], stock: "low", description: "Boots da bò thật cổ ngắn, khóa kéo bên hông tiện lợi, đế cao su bền bỉ. Phối cùng jeans cực chất." },
  { sku: "PK001", name: "Túi xách da Elegant", category: "Phụ kiện", price: 890000, sale: 690000, image: "1584917865442-de89df76afd3", sizes: FREE, colors: ["Đen", "Nâu"], featured: true, description: "Túi xách da PU cao cấp form cứng cáp, ngăn chính rộng đựng vừa iPad mini, kèm dây đeo chéo tháo rời." },
  { sku: "PK002", name: "Túi tote canvas", category: "Phụ kiện", price: 259000, image: "1548036328-c9fa89d128fa", sizes: FREE, colors: ["Be", "Đen"], description: "Túi tote vải canvas dày dặn, quai đeo vai chắc chắn, có ngăn nhỏ bên trong. Đi học, đi làm đều tiện." },
  { sku: "PK003", name: "Mũ lưỡi trai Basic", category: "Phụ kiện", price: 159000, image: "1588850561407-ed78c282e89b", sizes: FREE, colors: ["Đen", "Trắng"], description: "Mũ lưỡi trai cotton thêu logo nhỏ, khóa điều chỉnh phía sau phù hợp mọi vòng đầu." },
  { sku: "PK004", name: "Kính râm Aviator", category: "Phụ kiện", price: 390000, sale: 319000, image: "1511499767150-a48a237f0083", sizes: FREE, colors: ["Đen", "Nâu"], description: "Kính râm gọng kim loại dáng aviator, tròng phân cực chống tia UV400, kèm hộp đựng và khăn lau." },
  { sku: "PK005", name: "Đồng hồ dây da Vintage", category: "Phụ kiện", price: 1490000, image: "1523275335684-37898b6baf30", sizes: FREE, colors: ["Nâu"], stock: "out", description: "Đồng hồ mặt tròn tối giản, máy quartz Nhật Bản, dây da thật, chống nước 3ATM. (Sản phẩm mẫu đang hết hàng.)" },
];

const customerNames = [
  ["Nguyễn Văn An", "khach@fashionhub.vn", "0912345678"],
  ["Trần Thị Bình", "binh.tran@example.com", "0987654321"],
  ["Lê Hoàng Cường", "cuong.le@example.com", "0901234567"],
  ["Phạm Thu Dung", "dung.pham@example.com", "0934567890"],
  ["Hoàng Minh Đức", "duc.hoang@example.com", "0976543210"],
  ["Vũ Ngọc Hà", "ha.vu@example.com", "0945678901"],
  ["Đặng Quốc Huy", "huy.dang@example.com", "0923456789"],
  ["Bùi Thanh Lan", "lan.bui@example.com", "0967890123"],
] as const;

const addresses = [
  "Số 12 Trần Duy Hưng, Trung Hòa, Cầu Giấy, Hà Nội",
  "45 Nguyễn Trãi, Thanh Xuân Trung, Thanh Xuân, Hà Nội",
  "89 Lê Lợi, Bến Nghé, Quận 1, TP. Hồ Chí Minh",
  "23 Phan Chu Trinh, Hải Châu 1, Hải Châu, Đà Nẵng",
  "156 Hoàng Quốc Việt, Nghĩa Tân, Cầu Giấy, Hà Nội",
  "7 Võ Văn Tần, Phường 6, Quận 3, TP. Hồ Chí Minh",
];

const reviewTexts: Record<number, string[]> = {
  5: ["Chất lượng tuyệt vời, đúng như mô tả. Sẽ ủng hộ shop dài dài!", "Vải đẹp, mặc rất thoải mái, giao hàng nhanh.", "Form chuẩn, màu đẹp hơn ảnh. Rất hài lòng!"],
  4: ["Sản phẩm đẹp, đóng gói cẩn thận. Size hơi rộng một chút.", "Chất lượng ổn so với giá tiền, sẽ mua thêm màu khác.", "Hàng đẹp, giao hơi chậm nhưng shop hỗ trợ nhiệt tình."],
  3: ["Tạm ổn, màu thực tế hơi khác ảnh một chút.", "Chất liệu được nhưng đường may chưa thật sự tỉ mỉ."],
};

async function reset() {
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("🧹 Xóa dữ liệu cũ...");
  await reset();

  console.log("👤 Tạo tài khoản...");
  const adminHash = await bcrypt.hash(SEED_ADMIN_PASSWORD!, 10);
  const customerHash = await bcrypt.hash(SEED_CUSTOMER_PASSWORD!, 10);
  await prisma.user.create({
    data: { name: "Quản trị viên", email: (SEED_ADMIN_EMAIL || "admin@fashionhub.vn").toLowerCase(), phone: "0900000000", passwordHash: adminHash, role: "ADMIN" },
  });
  const customers = [];
  for (let i = 0; i < customerNames.length; i++) {
    const [name, email, phone] = customerNames[i];
    customers.push(
      await prisma.user.create({
        data: { name, email, phone, passwordHash: customerHash, role: "CUSTOMER", createdAt: new Date(Date.now() - (90 - i * 8) * 86_400_000) },
      }),
    );
  }

  console.log("🗂️  Tạo danh mục...");
  const catMap = new Map<string, number>();
  for (const c of categories) {
    const created = await prisma.category.create({
      data: { name: c.name, slug: slugify(c.name), description: c.description, imageUrl: img(c.image, 600) },
    });
    catMap.set(c.name, created.id);
  }

  console.log("👕 Tạo sản phẩm và biến thể...");
  const createdProducts = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const variants = p.sizes.flatMap((size) =>
      p.colors.map((color) => {
        let stock = between(8, 40);
        if (p.stock === "low") stock = between(0, 2);
        if (p.stock === "out") stock = 0;
        return { size, color, stock };
      }),
    );
    // Bảo đảm sản phẩm "sắp hết" vẫn còn ít nhất 1 sp
    if (p.stock === "low" && variants.every((v) => v.stock === 0)) variants[0].stock = 2;
    const created = await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        slug: slugify(p.name),
        description: p.description,
        price: p.price,
        salePrice: p.sale ?? null,
        finalPrice: effectivePrice(p.price, p.sale),
        imageUrl: img(p.image),
        categoryId: catMap.get(p.category)!,
        isFeatured: Boolean(p.featured),
        status: "ACTIVE",
        // Sản phẩm thêm sau có createdAt mới hơn -> dùng cho mục "Sản phẩm mới"
        createdAt: new Date(Date.now() - (products.length - i) * 2 * 86_400_000),
        variants: { create: variants },
      },
      include: { variants: true },
    });
    createdProducts.push(created);
  }

  console.log("🧾 Tạo đơn hàng mẫu...");
  const statusPool: OrderStatus[] = ["COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "SHIPPING", "PROCESSING", "PROCESSING", "CANCELLED"];
  const reviewCandidates: { userId: number; productId: number; at: Date }[] = [];
  const now = Date.now();

  for (let n = 0; n < 42; n++) {
    const user = pick(customers);
    const daysAgo = between(0, 58);
    const createdAt = new Date(now - daysAgo * 86_400_000 - between(1, 10) * 3_600_000);
    let status = pick(statusPool);
    // Đơn quá gần hiện tại thì chưa thể hoàn thành
    if (daysAgo < 2 && status === "COMPLETED") status = "SHIPPING";
    if (daysAgo > 10 && (status === "PROCESSING" || status === "SHIPPING")) status = "COMPLETED";

    const chosen = new Set<number>();
    const lineCount = between(1, 3);
    const lines = [];
    while (lines.length < lineCount) {
      const product = pick(createdProducts.filter((p) => p.sku !== "PK005"));
      const variant = pick(product.variants);
      if (chosen.has(variant.id)) continue;
      chosen.add(variant.id);
      const unitPrice = product.finalPrice;
      const quantity = between(1, 2);
      lines.push({
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        sku: product.sku,
        size: variant.size,
        color: variant.color,
        imageUrl: product.imageUrl,
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
      });
    }
    const totals = calcTotals(lines);
    const paymentMethod: PaymentMethod = rand() < 0.7 ? "COD" : "MOCK_ONLINE";
    const completedAt = status === "COMPLETED" ? new Date(Math.min(createdAt.getTime() + between(2, 4) * 86_400_000, now - 3_600_000)) : null;
    const cancelledAt = status === "CANCELLED" ? new Date(createdAt.getTime() + 6 * 3_600_000) : null;
    const d = createdAt;
    const code = `FH${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}S${String(n + 1).padStart(3, "0")}`;

    await prisma.order.create({
      data: {
        code,
        userId: user.id,
        recipientName: user.name,
        phone: user.phone ?? "0900000000",
        address: pick(addresses),
        paymentMethod,
        paymentStatus:
          status === "COMPLETED" ? "PAID" : status === "CANCELLED" ? (paymentMethod === "MOCK_ONLINE" ? "REFUNDED" : "UNPAID") : paymentMethod === "MOCK_ONLINE" ? "PAID" : "UNPAID",
        status,
        ...totals,
        idempotencyKey: `seed-${n + 1}`,
        completedAt,
        cancelledAt,
        cancelReason: status === "CANCELLED" ? "Khách hàng đổi ý" : null,
        createdAt,
        updatedAt: completedAt ?? cancelledAt ?? createdAt,
        items: { create: lines },
      },
    });

    if (status === "COMPLETED" && completedAt) {
      for (const l of lines) reviewCandidates.push({ userId: user.id, productId: l.productId, at: completedAt });
    }
  }

  console.log("⭐ Tạo đánh giá...");
  const reviewed = new Set<string>();
  let reviewCount = 0;
  for (const c of reviewCandidates) {
    const key = `${c.userId}-${c.productId}`;
    if (reviewed.has(key) || rand() < 0.3) continue;
    reviewed.add(key);
    const rating = pick([5, 5, 5, 4, 4, 3]);
    await prisma.review.create({
      data: { userId: c.userId, productId: c.productId, rating, comment: pick(reviewTexts[rating]), createdAt: new Date(c.at.getTime() + 86_400_000) },
    });
    reviewCount++;
  }

  console.log(`✅ Hoàn tất: ${categories.length} danh mục, ${createdProducts.length} sản phẩm, ${customers.length + 1} tài khoản, 42 đơn hàng, ${reviewCount} đánh giá.`);
  console.log(`   Admin: ${(SEED_ADMIN_EMAIL || "admin@fashionhub.vn").toLowerCase()}  |  Khách hàng: khach@fashionhub.vn`);
}

main()
  .catch((e) => {
    console.error("❌ Seed thất bại:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
