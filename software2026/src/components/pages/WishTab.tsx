import { useEffect, useState } from "react";
import type { WishItem, Wishlist } from "../../hooks/useWishlist";
import {
  formatPrice,
  getPriceStats,
  getProductsByIds,
  type Product,
} from "../../services/productService";
import "../styles/WishTab.css";

type WishTabProps = {
  wishlist: Wishlist;
  onOpenNotification: () => void;
};

export default function WishTab({ wishlist, onOpenNotification }: WishTabProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState("");

  const productIds = wishlist.wishlist.map((item) => item.productId).join(",");

  useEffect(() => {
    let cancelled = false;
    getProductsByIds(productIds ? productIds.split(",") : []).then((items) => {
      if (!cancelled) setProducts(items);
    });
    return () => {
      cancelled = true;
    };
  }, [productIds]);

  const startEditTarget = (item: WishItem) => {
    setEditingId(item.productId);
    setTargetInput(item.targetPrice ? String(item.targetPrice) : "");
  };

  const saveTarget = (productId: string) => {
    const value = Number(targetInput.replace(/[^0-9]/g, ""));
    wishlist.updateWish(productId, { targetPrice: value > 0 ? value : null });
    setEditingId(null);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>관심 상품 목록</h1>
          <p>관심 있는 영양제 가격을 확인하세요</p>
        </div>
        <button
          type="button"
          className="top-bell-button"
          onClick={onOpenNotification}
        >
          ♧
        </button>
      </div>

      <div className="wish-section">
        {wishlist.wishlist.length === 0 && (
          <div className="wish-empty">
            아직 찜한 상품이 없어요.
            <br />
            검색탭에서 ♡를 눌러 추가해 보세요.
          </div>
        )}

        {wishlist.wishlist.map((item) => {
          const product = products.find((p) => p.productId === item.productId);
          if (!product) return null;

          const stats = getPriceStats(product);
          const reachedTarget =
            item.targetPrice !== null && stats.current <= item.targetPrice;

          return (
            <div className="wish-card" key={item.productId}>
              <div className="wish-top">
                <div>
                  <div className="wish-name">{product.title}</div>
                  <div className="wish-brand">
                    {product.brand} · {product.mallName}
                  </div>
                </div>

                <div className="wish-icons">
                  <span
                    className={`wish-bell ${
                      item.lowestPriceAlarm ? "active" : ""
                    }`}
                  >
                    ♧
                  </span>

                  <button
                    type="button"
                    aria-label="최저가 알림 설정"
                    className={`wish-toggle ${item.lowestPriceAlarm ? "on" : ""}`}
                    onClick={() =>
                      wishlist.updateWish(item.productId, {
                        lowestPriceAlarm: !item.lowestPriceAlarm,
                      })
                    }
                  >
                    <span></span>
                  </button>
                </div>
              </div>

              {(reachedTarget || stats.isLowest) && (
                <div className="wish-badges">
                  {reachedTarget && (
                    <span className="wish-badge target">목표가 도달</span>
                  )}
                  {stats.isLowest && (
                    <span className="wish-badge lowest">90일 최저가</span>
                  )}
                </div>
              )}

              <div className="wish-row">
                <span>현재 가격</span>
                <strong>{formatPrice(stats.current)}</strong>
                <em className={stats.changeRate > 0 ? "up" : "down"}>
                  {stats.changeRate > 0 ? "+" : ""}
                  {stats.changeRate}%
                </em>
              </div>

              <div className="wish-row">
                <span>목표 가격</span>
                {editingId === item.productId ? (
                  <input
                    className="target-input"
                    inputMode="numeric"
                    autoFocus
                    placeholder="예: 25000"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    onBlur={() => saveTarget(item.productId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveTarget(item.productId);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="target"
                    onClick={() => startEditTarget(item)}
                  >
                    {item.targetPrice
                      ? formatPrice(item.targetPrice)
                      : "설정하기"}{" "}
                    ✎
                  </button>
                )}
              </div>

              <div className="wish-row">
                <span>3개월 최저가</span>
                <b className="lowest">{formatPrice(stats.lowest)}</b>
              </div>

              <div className="wish-actions">
                <button
                  type="button"
                  className="wish-remove"
                  onClick={() => wishlist.toggleWish(item.productId)}
                >
                  삭제
                </button>
                <a
                  className="wish-buy"
                  href={product.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  구매하기
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
