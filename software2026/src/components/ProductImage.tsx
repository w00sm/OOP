import type { Product } from "../services/productService";

// 상품 이미지
// 실제 쇼핑 API는 image URL을 주지만, 임시 DB 상품은 사진이 없어서 브랜드 색과 제형(정·캡슐·포)에 맞는
// 패키지 그림을 SVG로 그려 보여줍니다. product.image가 있으면 그 사진을 그대로 씁니다.

const BRAND_COLORS: Record<string, { main: string; dark: string; tint: string }> = {
  뉴트리랩: { main: "#2f6fdb", dark: "#1d4fa8", tint: "#eaf1fd" },
  그린웰: { main: "#3f9b4f", dark: "#2b7139", tint: "#eaf6ec" },
  바이탈원: { main: "#e0702b", dark: "#b3531a", tint: "#fdf0e7" },
  헬시코어: { main: "#7a4cc2", dark: "#5a3594", tint: "#f2ecfb" },
  데일리핏: { main: "#d94a6a", dark: "#a8324e", tint: "#fcebef" },
};
const FALLBACK = { main: "#5f8f2a", dark: "#3f6e12", tint: "#f2f8ea" };

type Form = "bottle" | "softgel" | "box";

function formOf(title: string): Form {
  if (/포|스틱/.test(title)) return "box";
  if (/캡슐/.test(title)) return "softgel";
  return "bottle";
}

// "90정", "30캡슐", "30포"
const countLabel = (title: string) => title.match(/\d+\s*(정|캡슐|포)/)?.[0].replace(/\s/g, "") ?? "";

// 라벨에 들어갈 글자 크기 (글자가 많으면 작게)
const fitSize = (text: string, width: number, max: number) =>
  Math.min(max, width / Math.max(1, [...text].length));

export default function ProductImage({ product, size = 96 }: { product: Product; size?: number }) {
  if (product.image) {
    return <img src={product.image} alt={product.title} width={size} height={size} />;
  }

  const color = BRAND_COLORS[product.brand] ?? FALLBACK;
  const form = formOf(product.title);
  const name = product.category;
  const count = countLabel(product.title);
  const id = `pi-${product.productId}`;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={product.title}
      className="product-image"
    >
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={color.tint} />
        </radialGradient>
        <linearGradient id={`${id}-body`} x1="0" x2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f6f7f8" />
          <stop offset="100%" stopColor="#dfe3e6" />
        </linearGradient>
        <linearGradient id={`${id}-label`} x1="0" x2="1">
          <stop offset="0%" stopColor={color.main} />
          <stop offset="100%" stopColor={color.dark} />
        </linearGradient>
      </defs>

      <rect width="120" height="120" fill={`url(#${id}-bg)`} />
      <ellipse cx="60" cy="106" rx="34" ry="5" fill="#071426" opacity="0.08" />

      {form === "box" ? (
        <g>
          {/* 스틱·포 상자 */}
          <path d="M28 30 L92 30 L92 104 L28 104 Z" fill={`url(#${id}-body)`} stroke="#d5dadd" strokeWidth="0.6" />
          <path d="M28 30 L36 22 L100 22 L92 30 Z" fill="#eef1f3" stroke="#d5dadd" strokeWidth="0.6" />
          <path d="M92 30 L100 22 L100 96 L92 104 Z" fill="#d9dee2" />
          <rect x="28" y="44" width="64" height="40" fill={`url(#${id}-label)`} />
          {[38, 46, 54].map((x) => (
            <rect key={x} x={x} y="13" width="6" height="14" rx="1.5" fill={color.main} opacity="0.85" />
          ))}
          <text x="60" y="40" textAnchor="middle" fontSize="6" fontWeight="700" fill={color.dark}>
            {product.brand}
          </text>
          <text x="60" y="64" textAnchor="middle" fontSize={fitSize(name, 56, 11)} fontWeight="800" fill="#fff">
            {name}
          </text>
          <text x="60" y="77" textAnchor="middle" fontSize="6" fontWeight="600" fill="#fff" opacity="0.9">
            {count}
          </text>
        </g>
      ) : (
        <g>
          {/* 정·캡슐 병 */}
          <rect x="41" y="14" width="38" height="16" rx="4" fill={color.dark} />
          <rect x="41" y="14" width="38" height="4" rx="2" fill="#ffffff" opacity="0.18" />
          <rect x="38" y="28" width="44" height="6" rx="2" fill="#e9ecee" />
          <rect x="33" y="32" width="54" height="72" rx="11" fill={`url(#${id}-body)`} stroke="#d5dadd" strokeWidth="0.6" />
          <rect x="33" y="48" width="54" height="40" fill={`url(#${id}-label)`} />
          <rect x="38" y="36" width="5" height="64" rx="2.5" fill="#ffffff" opacity="0.55" />
          <text x="60" y="44" textAnchor="middle" fontSize="5.5" fontWeight="700" fill={color.dark}>
            {product.brand}
          </text>
          <text x="60" y="66" textAnchor="middle" fontSize={fitSize(name, 46, 10)} fontWeight="800" fill="#fff">
            {name}
          </text>
          {form === "softgel" && (
            <ellipse cx="44" cy="78" rx="4.5" ry="2.6" fill="#f5c542" stroke="#fff" strokeWidth="0.6" />
          )}
          <text
            x={form === "softgel" ? 64 : 60}
            y="80"
            textAnchor="middle"
            fontSize="6"
            fontWeight="600"
            fill="#fff"
            opacity="0.9"
          >
            {count}
          </text>
        </g>
      )}
    </svg>
  );
}
