// 찜(장바구니) 목록
// 상품 정보는 저장하지 않고 productId와 사용자 설정(목표가, 알림)만 저장합니다.
// 가격은 항상 productService에서 최신 값을 가져옵니다.

import { useEffect, useState } from "react";

export type WishItem = {
  productId: string;
  targetPrice: number | null; // 이 가격 이하가 되면 알림 (맞춤 가격 알림)
  lowestPriceAlarm: boolean; // 기간 내 최저가가 되면 알림 (최저가 알림)
  addedAt: string;
};

const STORAGE_KEY = "wishlist";

const DEFAULT_WISHLIST: WishItem[] = [
  { productId: "p004", targetPrice: 25000, lowestPriceAlarm: true, addedAt: "" },
  { productId: "p006", targetPrice: 15000, lowestPriceAlarm: true, addedAt: "" },
  { productId: "p001", targetPrice: 29000, lowestPriceAlarm: false, addedAt: "" },
];

function loadWishlist(): WishItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_WISHLIST;
  } catch {
    return DEFAULT_WISHLIST;
  }
}

export function useWishlist() {
  const [wishlist, setWishlist] = useState<WishItem[]>(loadWishlist);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
    } catch {
      // 저장 실패(시크릿 모드 등)해도 화면은 계속 동작합니다.
    }
  }, [wishlist]);

  const isWished = (productId: string) =>
    wishlist.some((item) => item.productId === productId);

  const toggleWish = (productId: string) => {
    setWishlist((prev) =>
      prev.some((item) => item.productId === productId)
        ? prev.filter((item) => item.productId !== productId)
        : [
            ...prev,
            {
              productId,
              targetPrice: null,
              lowestPriceAlarm: true,
              addedAt: new Date().toISOString(),
            },
          ]
    );
  };

  const updateWish = (productId: string, changes: Partial<WishItem>) => {
    setWishlist((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, ...changes } : item
      )
    );
  };

  return { wishlist, isWished, toggleWish, updateWish };
}

export type Wishlist = ReturnType<typeof useWishlist>;
