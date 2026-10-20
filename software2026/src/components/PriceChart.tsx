import { useRef, useState, type PointerEvent } from "react";
import { formatPrice, type PricePoint } from "../services/productService";

// 90일 가격 추이 (선 하나). 손가락이나 마우스를 올리면 그날 가격을 보여줍니다.

const W = 320;
const H = 136;
const PAD = { top: 18, right: 12, bottom: 30, left: 12 };

export default function PriceChart({ history }: { history: PricePoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  if (history.length < 2) return null;

  const prices = history.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(1, max - min);
  const x = (i: number) => PAD.left + (i / (history.length - 1)) * (W - PAD.left - PAD.right);
  const y = (price: number) => PAD.top + (1 - (price - min) / span) * (H - PAD.top - PAD.bottom);

  const path = history
    .map((point, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(point.price).toFixed(1)}`)
    .join(" ");
  const minIndex = prices.lastIndexOf(min);
  const maxIndex = prices.indexOf(max);
  const last = history.length - 1;

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const ratio = (event.clientX - box.left) / box.width;
    const i = Math.round(((ratio * W - PAD.left) / (W - PAD.left - PAD.right)) * last);
    setActive(Math.min(last, Math.max(0, i)));
  };

  const shortDate = (date: string) => `${Number(date.slice(5, 7))}.${Number(date.slice(8))}`;
  // 끝에 붙는 라벨이 그래프 밖으로 나가지 않게
  const anchor = (i: number) => (x(i) < 50 ? "start" : x(i) > W - 50 ? "end" : "middle");
  const shown = active ?? last;
  const tipX = Math.min(W - 64, Math.max(0, x(shown) - 32));

  return (
    <div className="price-chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`90일 가격 추이: 최저 ${formatPrice(min)}, 최고 ${formatPrice(max)}, 오늘 ${formatPrice(prices[last])}`}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setActive(null)}
      >
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} className="price-chart-axis" />
        <text x={PAD.left} y={H - 6} className="price-chart-tick" textAnchor="start">
          {shortDate(history[0].date)}
        </text>
        <text x={W - PAD.right} y={H - 6} className="price-chart-tick" textAnchor="end">
          오늘
        </text>

        <path d={path} className="price-chart-line" />

        {/* 최저·최고만 직접 표시 */}
        <circle cx={x(minIndex)} cy={y(min)} r="3" className="price-chart-dot" />
        <text x={x(minIndex)} y={y(min) + 13} textAnchor={anchor(minIndex)} className="price-chart-label">
          최저 {formatPrice(min)}
        </text>
        {maxIndex !== minIndex && (
          <text x={x(maxIndex)} y={y(max) - 6} textAnchor={anchor(maxIndex)} className="price-chart-label muted">
            최고 {formatPrice(max)}
          </text>
        )}

        {active !== null && (
          <g pointerEvents="none">
            <line x1={x(active)} x2={x(active)} y1={PAD.top - 8} y2={H - PAD.bottom} className="price-chart-cross" />
            <circle cx={x(active)} cy={y(prices[active])} r="4.5" className="price-chart-focus" />
            <g transform={`translate(${tipX}, 0)`}>
              <rect width="64" height="15" rx="4" className="price-chart-tip" />
              <text x="32" y="10.5" textAnchor="middle" className="price-chart-tip-text">
                {shortDate(history[active].date)} · {formatPrice(prices[active])}
              </text>
            </g>
          </g>
        )}
        {active === null && <circle cx={x(last)} cy={y(prices[last])} r="4" className="price-chart-focus" />}

        {/* 손가락으로 잡기 쉽게 그래프 전체를 터치 영역으로 */}
        <rect x="0" y="0" width={W} height={H} fill="transparent" />
      </svg>
    </div>
  );
}
