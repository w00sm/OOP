import { useState } from "react";
import "../styles/RecommendTab.css";

type RecommendTabProps = {
  onOpenNotification: () => void;
};

export default function RecommendTab({
  onOpenNotification,
}: RecommendTabProps) {
  const currentYear = new Date().getFullYear();

  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"남성" | "여성" | "">("");
  const [healthMessage, setHealthMessage] = useState("");

  return (
    <>
      <div className="page-header">
        <div>
          <h1>맞춤 추천</h1>
          <p>나에게 딱 맞는 영양제를 찾아보세요</p>
        </div>
        <button
          type="button"
          className="top-bell-button"
          onClick={onOpenNotification}
        >
          ♧
        </button>
      </div>

      <div className="recommend-page">
        <button className="load-info-button">내 정보 불러오기</button>

        <div className="recommend-box">
          <label>나이</label>
          <select value={age} onChange={(e) => setAge(e.target.value)}>
            <option value="">출생년도를 선택하세요</option>

            {Array.from({ length: currentYear - 1947 + 1 }, (_, i) => {
              const year = currentYear - i;
              return (
                <option key={year} value={year}>
                  {year}년
                </option>
              );
            })}
          </select>
        </div>

        <div className="recommend-box">
          <label>성별</label>
          <div className="gender-buttons">
            <button
              type="button"
              className={gender === "남성" ? "active" : ""}
              onClick={() => setGender("남성")}
            >
              남성
            </button>
            <button
              type="button"
              className={gender === "여성" ? "active" : ""}
              onClick={() => setGender("여성")}
            >
              여성
            </button>
          </div>
        </div>

        <div className="recommend-box">
          <label>AI 건강 상담</label>

          <div className="ai-message">
            안녕하세요! 어떤 증상이나 건강 고민이 있으신가요? 자세히
            말씀해주시면 적합한 영양제를 추천해드리겠습니다.
          </div>

          <div className="ai-input-row">
            <input
              value={healthMessage}
              onChange={(e) => setHealthMessage(e.target.value)}
              placeholder="증상을 입력하세요..."
            />
            <button type="button">➤</button>
          </div>
        </div>

        <button className="recommend-submit">맞춤 영양제 추천받기</button>
      </div>
    </>
  );
}