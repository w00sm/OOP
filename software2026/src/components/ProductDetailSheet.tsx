import { ExternalLink, Heart, ShoppingBag, Star, Truck, X } from "lucide-react";
import ProductImage from "./ProductImage";
import PriceChart from "./PriceChart";
import {
  formatCount,
  formatPrice,
  getPriceStats,
  pricePerDay,
  type Product,
} from "../services/productService";

// 검색탭 → 상품 상세 (쇼핑몰 상품 페이지처럼: 큰 이미지, 가격, 90일 가격 추이, 판매처별 가격비교)

type ProductDetailSheetProps = {
  product: Product;
  wished: boolean;
  onToggleWish: () => void;
  onClose: () => void;
};

export default function ProductDetailSheet({
  product,
  wished,
  onToggleWish,
  onClose,
}: ProductDetailSheetProps) {
  const stats = getPriceStats(product);
  const days = Math.floor(product.count / Math.max(1, product.dailyDose));
  const unit = product.title.match(/\d+\s*(정|캡슐|포|구미|ml)/)?.[1] ?? "정";

  return (
    <div className="survey-overlay" role="dialog" aria-modal="true" aria-label={product.title}>
      <div className="survey-card product-sheet">
        <button type="button" className="product-sheet-x" aria-label="닫기" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="product-sheet-image">
          <ProductImage product={product} size={220} />
        </div>

        <div className="product-sheet-brand">{product.brand}</div>
        <h2 className="product-sheet-title">{product.title}</h2>
        <div className="product-rating">
          <Star size={14} fill="currentColor" />
          <b>{product.rating.toFixed(1)}</b>
          <span>리뷰 {formatCount(product.reviewCount)}</span>
          <span>· 찜 {formatCount(product.wishCount)}</span>
        </div>

        <div className="product-sheet-price">
          {stats.discountRate >= 3 && <span className="discount-rate">{stats.discountRate}%</span>}
          <strong>{formatPrice(stats.current)}</strong>
          <span className="product-lowest-tag">최저가</span>
          {stats.isLowest && <span className="lowest-badge">90일 최저가</span>}
        </div>
        <p className="product-sheet-unit">
          1통 {product.count}
          {unit} · 하루 {product.dailyDose}
          {unit} 기준 {days}일분 · <b>하루 {formatPrice(pricePerDay(product))}</b>
        </p>

        <section className="product-sheet-section">
          <h3>
            가격 추이 <small>최근 90일</small>
          </h3>
          <PriceChart history={product.priceHistory} />
        </section>

        <section className="product-sheet-section">
          <h3>
            판매처별 가격 <small>{product.offers.length}곳</small>
          </h3>
          <div className="offer-list">
            {product.offers.map((offer, index) => (
              <a
                key={offer.mall}
                className={`offer-row ${index === 0 ? "best" : ""}`}
                href={product.link}
                target="_blank"
                rel="noreferrer"
              >
                <div className="offer-mall">
                  <b>{offer.mall}</b>
                  {offer.official && <span className="offer-tag official">공식</span>}
                  {index === 0 && <span className="offer-tag best">최저</span>}
                  <small>
                    <Truck size={12} />
                    {offer.shipping === 0 ? "무료배송" : `배송비 ${formatPrice(offer.shipping)}`} · {offer.delivery}
                  </small>
                </div>
                <div className="offer-price">
                  {formatPrice(offer.price)}
                  <ExternalLink size={13} />
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="product-sheet-section">
          <h3>주요 성분</h3>
          <div className="product-chip-row">
            {product.ingredients.map((item) => (
              <span key={item}>{item}</span>
            ))}
            {product.tags.map((tag) => (
              <span key={tag} className="tag">
                #{tag}
              </span>
            ))}
          </div>
        </section>

        <div className="product-sheet-actions">
          <button
            type="button"
            className={`product-sheet-wish ${wished ? "on" : ""}`}
            aria-label={wished ? "찜 해제" : "찜하기"}
            onClick={onToggleWish}
          >
            <Heart size={22} fill={wished ? "currentColor" : "none"} />
          </button>
          <a className="product-sheet-buy" href={product.link} target="_blank" rel="noreferrer">
            <ShoppingBag size={18} />
            구매하기
          </a>
        </div>
      </div>
    </div>
  );
}
