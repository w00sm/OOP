import { useEffect, useState } from "react";
import { Bell, Heart, Search, Sparkles, X } from "lucide-react";
import type { Wishlist } from "../../hooks/useWishlist";
import {
  SORT_LABELS,
  formatPrice,
  getPriceStats,
  matchedIngredients,
  recommendProducts,
  searchProducts,
  type Product,
  type SortOption,
} from "../../services/productService";
import "../styles/SearchTab.css";

type SearchTabProps = {
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  recommendedIngredients: string[]; // 추천탭에서 넘어온 추천 성분
  onClearRecommended: () => void;
  wishlist: Wishlist;
  onOpenNotification: () => void;
};

// 이보다 작은 할인율은 의미가 적어 표시하지 않습니다.
const MIN_DISCOUNT_TO_SHOW = 3;

const POPULAR_KEYWORDS = ["비타민D", "오메가3", "유산균", "마그네슘", "루테인", "피로"];

export default function SearchTab({
  keyword,
  onKeywordChange,
  recommendedIngredients,
  onClearRecommended,
  wishlist,
  onOpenNotification,
}: SearchTabProps) {
  const [sort, setSort] = useState<SortOption>("sim");
  const [results, setResults] = useState<Product[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState("");

  const hasKeyword = keyword.trim() !== "";
  const isRecommendMode = !hasKeyword && recommendedIngredients.length > 0;
  // 추천 성분 목록이 바뀌어 선택했던 성분이 없어지면 '전체'로 봅니다.
  const activeIngredient = recommendedIngredients.includes(selectedIngredient)
    ? selectedIngredient
    : "";

  useEffect(() => {
    let cancelled = false;
    const request = isRecommendMode
      ? recommendProducts(
          activeIngredient ? [activeIngredient] : recommendedIngredients,
          sort
        )
      : searchProducts(keyword, sort);

    request.then((products) => {
      if (!cancelled) setResults(products);
    });
    return () => {
      cancelled = true;
    };
  }, [keyword, sort, isRecommendMode, activeIngredient, recommendedIngredients]);

  const showResults = hasKeyword || isRecommendMode;

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
          aria-label="알림"
          onClick={onOpenNotification}
        >
          <Bell size={22} strokeWidth={2} />
        </button>
      </div>

      <div className="search-section">
        <div className="search-input-wrap">
          <Search size={18} className="search-input-icon" />
          <input
            type="text"
            placeholder="제품명, 성분, 고민으로 검색"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="search-input"
          />
          {hasKeyword && (
            <button
              type="button"
              className="search-clear"
              aria-label="검색어 지우기"
              onClick={() => onKeywordChange("")}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {isRecommendMode && (
          <div className="recommend-banner">
            <div className="recommend-banner-top">
              <span>
                <Sparkles size={16} />
                AI 추천 성분으로 찾은 영양제
              </span>
              <button
                type="button"
                aria-label="추천 해제"
                onClick={onClearRecommended}
              >
                <X size={16} />
              </button>
            </div>
            <div className="keyword-chips">
              <button
                type="button"
                className={`keyword-chip ${activeIngredient === "" ? "active" : ""}`}
                onClick={() => setSelectedIngredient("")}
              >
                전체
              </button>
              {recommendedIngredients.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`keyword-chip ${activeIngredient === item ? "active" : ""}`}
                  onClick={() => setSelectedIngredient(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {!showResults && (
          <>
            <h2>인기 검색어</h2>
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
          </>
        )}

        {showResults && (
          <>
            <div className="sort-bar" role="tablist" aria-label="정렬">
              {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={sort === option}
                  key={option}
                  className={sort === option ? "active" : ""}
                  onClick={() => setSort(option)}
                >
                  {SORT_LABELS[option]}
                </button>
              ))}
            </div>
            <div className="search-count">상품 {results.length}개</div>
          </>
        )}

        <div className="search-list">
          {showResults && results.length === 0 && (
            <div className="search-empty">검색 결과가 없어요</div>
          )}

          {showResults &&
            results.map((product) => {
              const stats = getPriceStats(product);
              const wished = wishlist.isWished(product.productId);
              const matched = isRecommendMode
                ? matchedIngredients(product, recommendedIngredients)
                : [];

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
                      {stats.discountRate >= MIN_DISCOUNT_TO_SHOW && (
                        <span className="discount-rate">{stats.discountRate}%</span>
                      )}
                      {formatPrice(stats.current)}
                      {stats.isLowest && (
                        <span className="lowest-badge">90일 최저가</span>
                      )}
                    </div>
                    <div className="product-meta">
                      90일 최저 {formatPrice(stats.lowest)} · {product.mallName}
                    </div>
                    {matched.length > 0 && (
                      <div className="product-matched">
                        {matched.map((item) => (
                          <em key={item}>{item}</em>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label={wished ? "찜 해제" : "찜하기"}
                    className={`wish-heart ${wished ? "on" : ""}`}
                    onClick={() => wishlist.toggleWish(product.productId)}
                  >
                    <Heart
                      size={22}
                      strokeWidth={2}
                      fill={wished ? "currentColor" : "none"}
                    />
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}
