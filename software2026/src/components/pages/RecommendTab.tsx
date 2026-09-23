import { useState } from "react";
import {
  findConcerns,
  recommend,
  type Gender,
  type Recommendation,
} from "../../services/recommendService";
import "../styles/RecommendTab.css";

type RecommendTabProps = {
  onOpenNotification: () => void;
  onSearch: (keyword: string) => void;
};

type ChatMessage = {
  from: "ai" | "user";
  text: string;
};

const GREETING: ChatMessage = {
  from: "ai",
  text: "안녕하세요! 어떤 증상이나 건강 고민이 있으신가요? 자세히 말씀해주시면 적합한 영양제를 추천해드리겠습니다.",
};

export default function RecommendTab({
  onOpenNotification,
  onSearch,
}: RecommendTabProps) {
  const currentYear = new Date().getFullYear();

  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [healthMessage, setHealthMessage] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([GREETING]);
  const [results, setResults] = useState<Recommendation[] | null>(null);

  const sendMessage = () => {
    const text = healthMessage.trim();
    if (!text) return;

    const concerns = findConcerns(text);
    const reply = concerns.length
      ? `${concerns.map((c) => c.label).join(", ")} 고민이 있으시군요. 다른 고민이 있으면 더 말씀해 주시고, 다 입력하셨다면 아래 '맞춤 영양제 추천받기'를 눌러주세요.`
      : "조금 더 구체적으로 말씀해 주시겠어요? 예: 요즘 피곤하고 잠을 잘 못 자요";

    setChat((prev) => [
      ...prev,
      { from: "user", text },
      { from: "ai", text: reply },
    ]);
    setHealthMessage("");
  };

  const submit = async () => {
    const messages = chat
      .filter((message) => message.from === "user")
      .map((message) => message.text);
    if (healthMessage.trim()) messages.push(healthMessage.trim());

    const recommendations = await recommend({
      birthYear: age ? Number(age) : undefined,
      gender: gender || undefined,
      messages,
    });
    setResults(recommendations);
  };

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

          <div className="chat-list">
            {chat.map((message, index) => (
              <div
                key={index}
                className={message.from === "ai" ? "ai-message" : "user-message"}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className="ai-input-row">
            <input
              value={healthMessage}
              onChange={(e) => setHealthMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) sendMessage();
              }}
              placeholder="증상을 입력하세요..."
            />
            <button type="button" onClick={sendMessage}>
              ➤
            </button>
          </div>
        </div>

        <button className="recommend-submit" onClick={submit}>
          맞춤 영양제 추천받기
        </button>

        {results && (
          <div className="recommend-results">
            <h2>추천 성분</h2>
            <p className="recommend-hint">성분을 누르면 상품을 검색해요</p>

            {results.map((item) => (
              <button
                type="button"
                key={item.ingredient}
                className="recommend-card"
                onClick={() => onSearch(item.ingredient)}
              >
                <div className="recommend-card-top">
                  <strong>{item.ingredient}</strong>
                  <span>상품 보기 →</span>
                </div>
                <div className="recommend-tags">
                  {item.concerns.map((concern) => (
                    <em key={concern}>#{concern}</em>
                  ))}
                </div>
                {item.reasons.map((reason) => (
                  <p key={reason}>{reason}</p>
                ))}
              </button>
            ))}

            <p className="recommend-notice">
              ※ 건강기능식품은 질병을 치료하는 약이 아니에요. 복용 중인 약이
              있다면 전문가와 상담하세요.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
