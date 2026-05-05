import { useState } from "react";
import "../styles/WishTab.css";

type WishTabProps = {
  onOpenNotification: () => void;
};

export default function WishTab({ onOpenNotification }: WishTabProps) {
  const [wishItems, setWishItems] = useState([
    {
      name: "오메가3 1000mg",
      brand: "브랜드D",
      price: "28,000원",
      change: "-5%",
      changeType: "down",
      targetPrice: "25,000원",
      lowestPrice: "24,500원",
      stockAlert: "",
      lowestPriceAlarm: true,
    },
    {
      name: "비타민D 5000IU",
      brand: "브랜드E",
      price: "16,800원",
      change: "+3%",
      changeType: "up",
      targetPrice: "15,000원",
      lowestPrice: "14,900원",
      stockAlert: "⚠ 재고가 7일분 남았습니다",
      lowestPriceAlarm: true,
    },
    {
      name: "블랙 프라이데이 특가 멀티비타민",
      brand: "브랜드F",
      price: "32,000원",
      change: "-12%",
      changeType: "down",
      targetPrice: "29,000원",
      lowestPrice: "28,500원",
      stockAlert: "",
      lowestPriceAlarm: false,
    },
  ]);

  const toggleLowestPriceAlarm = (index: number) => {
    setWishItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, lowestPriceAlarm: !item.lowestPriceAlarm }
          : item
      )
    );
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
        {wishItems.map((item, index) => (
          <div className="wish-card" key={item.name}>
            <div className="wish-top">
              <div>
                <div className="wish-name">{item.name}</div>
                <div className="wish-brand">{item.brand}</div>
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
                  className={`wish-toggle ${
                    item.lowestPriceAlarm ? "on" : ""
                  }`}
                  onClick={() => toggleLowestPriceAlarm(index)}
                >
                  <span></span>
                </button>
              </div>
            </div>

            <div className="wish-row">
              <span>현재 가격</span>
              <strong>{item.price}</strong>
              <em className={item.changeType === "up" ? "up" : "down"}>
                {item.change}
              </em>
            </div>

            <div className="wish-row">
              <span>목표 가격</span>
              <b className="target">{item.targetPrice}</b>
            </div>

            <div className="wish-row">
              <span>3개월 최저가</span>
              <b className="lowest">{item.lowestPrice}</b>
            </div>

            <button className="wish-buy">구매하기</button>

            {item.stockAlert && (
              <div className="wish-alert">{item.stockAlert}</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}