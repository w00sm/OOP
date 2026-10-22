import { useId } from "react";
import type { ProductForm } from "../data/products";
import type { Product } from "../services/productService";

// 상품 이미지
// 실제 쇼핑 API는 사진 주소(image)를 주지만, 시연용 상품은 사진이 없어서 제형에 맞는 패키지를
// 스튜디오 제품 사진처럼(입체 음영·반사광·그림자) SVG로 그립니다. product.image가 있으면 그 사진을 씁니다.

type Style = {
  main: string;
  dark: string;
  light: string;
  bottle: "white" | "amber" | "dark"; // 정·캡슐 병 재질
  label: 0 | 1 | 2; // 라벨 디자인 (띠 / 사선 / 원형 배지)
};

const BRAND_STYLES: Record<string, Style> = {
  뉴트리랩: { main: "#2f6fdb", dark: "#173f8a", light: "#e6efff", bottle: "white", label: 0 },
  그린웰: { main: "#2f8f4e", dark: "#1b5c31", light: "#e5f4ea", bottle: "amber", label: 1 },
  바이탈원: { main: "#e8702a", dark: "#a8481a", light: "#fff0e5", bottle: "white", label: 2 },
  헬시코어: { main: "#6c45c4", dark: "#43278a", light: "#efe9fb", bottle: "dark", label: 0 },
  데일리핏: { main: "#e04a6c", dark: "#9c2a46", light: "#fde9ee", bottle: "white", label: 1 },
  퓨어포뮬라: { main: "#1aa39a", dark: "#0e6a64", light: "#e3f6f4", bottle: "white", label: 2 },
  루틴랩: { main: "#f2b200", dark: "#9a6a00", light: "#fff7d9", bottle: "dark", label: 1 },
  하루한알: { main: "#e2453b", dark: "#962620", light: "#fde8e6", bottle: "white", label: 0 },
  그린스텝: { main: "#5c9e2e", dark: "#3a6a17", light: "#eef7e4", bottle: "amber", label: 2 },
  모닝웰: { main: "#f08a3c", dark: "#a5521a", light: "#fff0e2", bottle: "white", label: 1 },
  에버핏: { main: "#2563eb", dark: "#1e3a8a", light: "#e7eeff", bottle: "dark", label: 2 },
  내추럴코드: { main: "#8a6d3b", dark: "#5a4522", light: "#f5efe3", bottle: "amber", label: 0 },
  메디베이스: { main: "#0f766e", dark: "#0b4b46", light: "#e1f3f1", bottle: "white", label: 1 },
  바이오데이: { main: "#9333ea", dark: "#5b1a99", light: "#f3e8ff", bottle: "white", label: 2 },
  리브온: { main: "#db2777", dark: "#8f174d", light: "#fde7f1", bottle: "dark", label: 0 },
};
const FALLBACK: Style = { main: "#5f8f2a", dark: "#3f6e12", light: "#f2f8ea", bottle: "white", label: 0 };

const BOTTLE_BODY = {
  white: { base: "#f6f6f3", edge: "#c9ccc8", labelBg: "#ffffff" },
  amber: { base: "#8a4510", edge: "#3d1a04", labelBg: "#fbf6ec" },
  dark: { base: "#2a2d33", edge: "#0b0c0e", labelBg: "#ffffff" },
};

function formOf(product: Product): ProductForm {
  if (product.form) return product.form;
  const title = product.title;
  if (/포|스틱/.test(title)) return "stick";
  if (/구미/.test(title)) return "gummy";
  if (/ml|액상/.test(title)) return "liquid";
  if (/캡슐/.test(title)) return "softgel";
  return "tablet";
}

// "90정", "30캡슐", "30포", "60구미", "30ml"
const countLabel = (title: string) =>
  title.match(/\d+\s*(정|캡슐|포|구미|ml)/)?.[0].replace(/\s/g, "") ?? "";

// 함량: "350mg", "5000IU", "100억"
const strengthLabel = (title: string) =>
  title.match(/\d[\d,]*\s*(mg|IU|mcg|ug|억)/i)?.[0].replace(/\s/g, "") ?? "";

// 라벨 글자가 많으면 작게
const fit = (text: string, width: number, max: number) =>
  Math.min(max, (width / Math.max(1, [...text].length)) * 1.05);

export default function ProductImage({ product, size = 96 }: { product: Product; size?: number }) {
  const uid = useId().replace(/:/g, "");
  if (product.image) {
    return <img src={product.image} alt={product.title} width={size} height={size} />;
  }

  const style = BRAND_STYLES[product.brand] ?? FALLBACK;
  const form = formOf(product);
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;
  const info = {
    brand: product.brand,
    name: product.category,
    strength: strengthLabel(product.title),
    count: countLabel(product.title),
  };

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={product.title}
      className="product-image"
    >
      <defs>
        {/* 스튜디오 배경 */}
        <radialGradient id={id("bg")} cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f3f4f3" />
          <stop offset="100%" stopColor="#e6e8e6" />
        </radialGradient>
        {/* 원통 음영 (왼쪽 어둡게 → 반사광 → 오른쪽 어둡게) */}
        <linearGradient id={id("shade")} x1="0" x2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0.28" />
          <stop offset="10%" stopColor="#000" stopOpacity="0.06" />
          <stop offset="22%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="32%" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="70%" stopColor="#000" stopOpacity="0.04" />
          <stop offset="92%" stopColor="#000" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id={id("cap")} x1="0" x2="1">
          <stop offset="0%" stopColor={style.dark} />
          <stop offset="25%" stopColor={style.main} />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="48%" stopColor={style.main} />
          <stop offset="100%" stopColor={style.dark} />
        </linearGradient>
        <linearGradient id={id("label")} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={style.main} />
          <stop offset="100%" stopColor={style.dark} />
        </linearGradient>
        <linearGradient id={id("gloss")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={id("blur")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id={id("soft")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      <rect width="200" height="200" fill={url("bg")} />
      {/* 바닥 그림자 */}
      <ellipse cx="102" cy="182" rx="62" ry="8" fill="#000" opacity="0.22" filter={url("blur")} />

      {form === "stick" ? (
        <StickBox style={style} info={info} url={url} />
      ) : form === "gummy" ? (
        <GummyPouch style={style} info={info} url={url} />
      ) : form === "liquid" ? (
        <DropperBottle style={style} info={info} url={url} />
      ) : (
        <Bottle style={style} info={info} url={url} form={form} />
      )}
    </svg>
  );
}

type Info = { brand: string; name: string; strength: string; count: string };
type PartProps = { style: Style; info: Info; url: (name: string) => string };

// 라벨 안쪽 (브랜드 · 성분 · 함량 · 개수) — x, y는 라벨 왼쪽 위, w·h는 라벨 크기
function LabelArt({
  style,
  info,
  url,
  x,
  y,
  w,
  h,
  bg,
}: PartProps & { x: number; y: number; w: number; h: number; bg: string }) {
  const cx = x + w / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={bg} />
      {style.label === 0 && <rect x={x} y={y} width={w} height={h * 0.3} fill={url("label")} />}
      {style.label === 1 && (
        <path d={`M${x} ${y + h * 0.86} L${x + w} ${y + h * 0.7} L${x + w} ${y + h} L${x} ${y + h} Z`} fill={url("label")} />
      )}
      {style.label === 2 && (
        <>
          <rect x={x} y={y + h - 6} width={w} height={6} fill={url("label")} />
          <circle cx={x + w - 13} cy={y + 13} r="9" fill={url("label")} />
          <text x={x + w - 13} y={y + 15.5} textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#fff">
            {info.count.replace(/[^\d]/g, "")}
          </text>
        </>
      )}

      <text
        x={cx}
        y={y + (style.label === 0 ? h * 0.19 : 12)}
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="800"
        letterSpacing="0.6"
        fill={style.label === 0 ? "#fff" : style.dark}
      >
        {info.brand}
      </text>
      <text
        x={cx}
        y={y + h * (style.label === 0 ? 0.56 : 0.46)}
        textAnchor="middle"
        fontSize={fit(info.name, w - 14, 17)}
        fontWeight="900"
        fill={style.dark}
      >
        {info.name}
      </text>
      {info.strength && (
        <text
          x={cx}
          y={y + h * (style.label === 0 ? 0.72 : 0.62)}
          textAnchor="middle"
          fontSize="8"
          fontWeight="700"
          fill={style.main}
        >
          {info.strength}
        </text>
      )}
      <text
        x={cx}
        y={y + h - (style.label === 2 ? 10 : 6)}
        textAnchor="middle"
        fontSize="7"
        fontWeight="700"
        fill={style.label === 1 ? "#fff" : "#6b7280"}
      >
        {info.count}
      </text>
    </g>
  );
}

// 정·캡슐 병 (흰 플라스틱 / 갈색 유리 / 짙은 병)
function Bottle({ style, info, url, form }: PartProps & { form: ProductForm }) {
  const body = BOTTLE_BODY[style.bottle];
  const ridges = Array.from({ length: 15 }, (_, i) => 62 + i * 5);
  return (
    <g>
      {/* 몸통 */}
      <path
        d="M54 74 Q54 60 70 56 L130 56 Q146 60 146 74 L146 168 Q146 178 134 178 L66 178 Q54 178 54 168 Z"
        fill={body.base}
      />
      {/* 목 */}
      <rect x="68" y="44" width="64" height="16" rx="3" fill={body.base} />
      <rect x="68" y="44" width="64" height="16" rx="3" fill={url("shade")} />
      {/* 뚜껑 + 홈 */}
      <rect x="60" y="16" width="80" height="32" rx="5" fill={url("cap")} />
      {ridges.map((rx) => (
        <rect key={rx} x={rx} y="19" width="1.4" height="26" fill="#000" opacity="0.12" />
      ))}
      <rect x="60" y="16" width="80" height="4" rx="2" fill="#fff" opacity="0.25" />
      {/* 라벨 */}
      <LabelArt style={style} info={info} url={url} x={54} y={82} w={92} h={78} bg={body.labelBg} />
      {/* 원통 음영과 반사광 */}
      <path
        d="M54 74 Q54 60 70 56 L130 56 Q146 60 146 74 L146 168 Q146 178 134 178 L66 178 Q54 178 54 168 Z"
        fill={url("shade")}
      />
      <rect x="66" y="64" width="7" height="104" rx="3.5" fill="#fff" opacity="0.55" filter={url("soft")} />
      {/* 소프트젤 표시 */}
      {(form === "softgel" || form === "capsule") && (
        <g transform="translate(118 132) rotate(-25)">
          {form === "softgel" ? (
            <ellipse rx="9" ry="5" fill="#f5c542" stroke="#d99b16" strokeWidth="0.8" />
          ) : (
            <>
              <rect x="-10" y="-4.5" width="10" height="9" rx="4.5" fill={style.main} />
              <rect x="0" y="-4.5" width="10" height="9" rx="4.5" fill="#f3f4f6" />
            </>
          )}
          <ellipse cx="-3" cy="-2" rx="3" ry="1.2" fill="#fff" opacity="0.7" />
        </g>
      )}
    </g>
  );
}

// 스틱(포) 상자 + 앞에 놓인 스틱 두 개
function StickBox({ style, info, url }: PartProps) {
  return (
    <g>
      {/* 윗면·옆면·앞면 */}
      <path d="M40 54 L62 40 L164 40 L142 54 Z" fill="#f4f5f4" />
      <path d="M142 54 L164 40 L164 160 L142 176 Z" fill="#cfd3cf" />
      <path d="M142 54 L164 40 L164 160 L142 176 Z" fill={url("label")} opacity="0.35" />
      <LabelArt style={style} info={info} url={url} x={40} y={54} w={102} h={122} bg="#ffffff" />
      <rect x="40" y="54" width="102" height="122" fill="none" stroke="#000" strokeOpacity="0.06" />
      <rect x="44" y="58" width="4" height="114" fill="#fff" opacity="0.5" filter={url("soft")} />
      {/* 스틱 */}
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${132 + i * 13} ${116 + i * 4}) rotate(${8 + i * 6})`}>
          <rect x="0" y="0" width="13" height="62" rx="2" fill={url("label")} />
          <rect x="0" y="0" width="13" height="5" fill="#fff" opacity="0.35" />
          <rect x="0" y="57" width="13" height="5" fill="#000" opacity="0.15" />
          <rect x="2" y="8" width="3" height="46" rx="1.5" fill="#fff" opacity="0.35" />
        </g>
      ))}
    </g>
  );
}

// 구미 스탠드 파우치 (지퍼 + 투명 창)
function GummyPouch({ style, info, url }: PartProps) {
  const gummies = [
    [84, 150, "#f87171"],
    [100, 146, "#fbbf24"],
    [116, 151, "#34d399"],
    [92, 160, "#a78bfa"],
    [108, 161, "#fb923c"],
  ] as const;
  return (
    <g>
      <path
        d="M50 30 L150 30 L154 150 Q155 176 132 178 L68 178 Q45 176 46 150 Z"
        fill={url("label")}
      />
      <rect x="50" y="30" width="100" height="10" fill="#000" opacity="0.12" />
      <rect x="50" y="44" width="100" height="2" fill="#fff" opacity="0.4" />
      <LabelArt style={{ ...style, label: 0 }} info={info} url={url} x={60} y={56} w={80} h={66} bg="#ffffff" />
      {/* 투명 창 */}
      <rect x="70" y="132" width="60" height="38" rx="14" fill="#fff" opacity="0.85" />
      {gummies.map(([cx, cy, color]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="6.5" fill={color} />
          <circle cx={cx - 2} cy={cy - 2} r="2" fill="#fff" opacity="0.6" />
        </g>
      ))}
      <path d="M50 30 L150 30 L154 150 Q155 176 132 178 L68 178 Q45 176 46 150 Z" fill={url("shade")} opacity="0.7" />
      <path d="M58 40 L66 40 L64 168 L56 166 Z" fill={url("gloss")} opacity="0.6" />
    </g>
  );
}

// 액상 갈색 유리병 + 스포이드
function DropperBottle({ style, info, url }: PartProps) {
  return (
    <g>
      {/* 스포이드 고무 */}
      <path d="M86 14 Q100 4 114 14 L114 40 L86 40 Z" fill={style.dark} />
      <path d="M90 16 Q96 10 100 12 L100 38 L90 38 Z" fill="#fff" opacity="0.25" />
      <rect x="80" y="38" width="40" height="16" rx="3" fill="#1f2328" />
      <rect x="80" y="38" width="40" height="16" rx="3" fill={url("shade")} />
      {/* 병 */}
      <path
        d="M84 54 L116 54 L116 62 Q146 66 146 92 L146 170 Q146 178 136 178 L64 178 Q54 178 54 170 L54 92 Q54 66 84 62 Z"
        fill="#7a3a0a"
      />
      <LabelArt style={style} info={info} url={url} x={54} y={100} w={92} h={66} bg="#fbf6ec" />
      <path
        d="M84 54 L116 54 L116 62 Q146 66 146 92 L146 170 Q146 178 136 178 L64 178 Q54 178 54 170 L54 92 Q54 66 84 62 Z"
        fill={url("shade")}
      />
      <rect x="64" y="76" width="6" height="94" rx="3" fill="#fff" opacity="0.5" filter={url("soft")} />
    </g>
  );
}
