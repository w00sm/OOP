import { useEffect, useState } from "react";
import type { Wishlist } from "../../hooks/useWishlist";
import {
  formatPrice,
  getPriceStats,
  searchProducts,
  type Product,
  type SortOption,
} from "../../services/productService";
import "../styles/SearchTab.css";

type SearchTabProps = {
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  wishlist: Wishlist;
  onOpenNotification: () => void;
};

const POPULAR_KEYWORDS = ["비타민D", "오메가3", "유산균", "마그네슘", "루테인", "피로"];

const SORT_LABELS: Record<SortOption, string> = {
  sim: "관련도순",
  asc: "낮은 가격순",
  dsc: "높은 가격순",
};

export default function SearchTab({
  keyword,
  onKeywordChange,
  wishlist,
  onOpenNotification,
}: SearchTabProps) {
  const [sort, setSort] = useState<SortOption>("sim");
  const [results, setResults] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    searchProducts(keyword, sort).then((products) => {
      if (!cancelled) setResults(products);
    });
    return () => {
      cancelled = true;
    };
  }, [keyword, sort]);

  const hasKeyword = keyword.trim() !== "";

  return (
    <>
      <div className="page-header">
        <div>
          <h1>검색</h1>
          <p>영양제 가격을 비교하고 찜해보세요</p>
        </div>
        <button
          type="button"
          className="top-bell-button"
          onClick={onOpenNotification}
        >
          ♧
        </button>
      </div>

      <div className="search-section">
        <h2>영양제 검색</h2>

        <input
          type="text"
          placeholder="제품명, 성분, 고민으로 검색 (예: 비타민D, 피로)"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          className="search-input"
        />

        {!hasKeyword && (
          <div className="keyword-chips">
            {POPULAR_KEYWORDS.map((item) => (
              <button
                type="button"
                key={item}
                className="keyword-chip"
                onClick={() => onKeywordChange(item)}
              >
                #{item}
              </button>
            ))}
          </div>
        )}

        {hasKeyword && (
          <div className="search-toolbar">
            <span>검색 결과 {results.length}개</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="search-list">
          {hasKeyword && results.length === 0 && (
            <div className="search-empty">검색 결과가 없어요</div>
          )}

          {hasKeyword &&
            results.map((product) => {
              const stats = getPriceStats(product);
              const wished = wishlist.isWished(product.productId);

              return (
                <div className="product-item" key={product.productId}>
                  <div className="product-thumb">
                    {product.image ? (
                      <img src={product.image} alt={product.title} />
                    ) : (
                      <span>{product.category.slice(0, 2)}</span>
                    )}
                  </div>

                  <div className="product-info">
                    <div className="product-brand">{product.brand}</div>
                    <div className="product-title">{product.title}</div>
                    <div className="product-price">
                      {formatPrice(stats.current)}
                      {stats.isLowest && (
                        <span className="lowest-badge">90일 최저가</span>
                      )}
                    </div>
                    <div className="product-meta">
                      90일 최저 {formatPrice(stats.lowest)} · {product.mallName}
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label={wished ? "찜 해제" : "찜하기"}
                    className={`wish-heart ${wished ? "on" : ""}`}
                    onClick={() => wishlist.toggleWish(product.productId)}
                  >
                    {wished ? "♥" : "♡"}
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}
