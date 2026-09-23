import { useState } from "react";
import { getOpenAI, hasOpenAIKey } from "../../services/openaiClient";
import { findConcerns, recommend } from "../../services/recommendService";
import "../styles/RecommendTab.css";

type RecommendTabProps = {
  onOpenNotification: () => void;
  onSearch: (keyword: string) => void;
};

type SavedProfile = {
  name: string;
  email: string;
  gender: "남성" | "여성";
  birthYear: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type RecommendedItem = {
  name: string;
  dose: string;
  reason?: string;
};

// OpenAI 키가 없을 때 쓰는 규칙 기반 답변
function ruleBasedReply(text: string) {
  const concerns = findConcerns(text);
  return concerns.length
    ? `${concerns.map((c) => c.label).join(", ")} 고민이 있으시군요. 다른 고민이 있으면 더 말씀해 주시고, 다 입력하셨다면 '상담 완료'를 눌러주세요.`
    : "조금 더 구체적으로 말씀해 주시겠어요? 예: 요즘 피곤하고 잠을 잘 못 자요";
}

export default function RecommendTab({
  onOpenNotification,
  onSearch,
}: RecommendTabProps) {
  const currentYear = new Date().getFullYear();

  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"남성" | "여성" | "">("");
  const [userInput, setUserInput] = useState("");

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "안녕하세요! 어떤 증상이나 건강 고민이 있으신가요? 자세히 말씀해주시면 적합한 영양제를 추천해드리겠습니다.",
    },
  ]);

  const [recommendedList, setRecommendedList] = useState<RecommendedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const ruleBasedItems = async (): Promise<RecommendedItem[]> => {
    const recommendations = await recommend({
      birthYear: age ? Number(age) : undefined,
      gender: gender || undefined,
      messages: chatMessages
        .filter((message) => message.role === "user")
        .map((message) => message.content),
    });
    return recommendations.map((item) => ({
      name: item.ingredient,
      dose: "",
      reason: item.reasons[0],
    }));
  };

  const loadMyInfo = () => {
    const saved = localStorage.getItem("userHealthProfile");

    if (!saved) {
      setModalMessage("저장된 정보가 없습니다.");
      return;
    }

    const profile: SavedProfile = JSON.parse(saved);

    setAge(profile.birthYear);
    setGender(profile.gender);
    setModalMessage("내 정보를 불러왔습니다.");
  };

  const handleChatSubmit = async () => {
    if (!userInput.trim() || isLoading || isCompleting) return;

    const savedInput = userInput;
    setUserInput("");
    setRecommendedList([]);

    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: savedInput },
    ];

    setChatMessages(nextMessages);
    setIsLoading(true);

    try {
      if (!hasOpenAIKey) {
        setChatMessages([
          ...nextMessages,
          { role: "assistant", content: ruleBasedReply(savedInput) },
        ]);
        return;
      }

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "당신은 친절하고 전문적인 영양 상담 AI입니다. 사용자의 정보와 고민을 바탕으로 핵심만 간단히 답하세요. 최대 2문장으로 짧고 명확하게 답변하세요. 불필요한 설명은 하지 마세요.",
          },
          {
            role: "user",
            content: `
사용자 정보:
${age ? `- 출생년도: ${age}` : ""}
${gender ? `- 성별: ${gender}` : ""}

이 정보를 참고해서 이후 상담에 반영해주세요.
`,
          },
          ...nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
      });

      const assistantMessage =
        response.choices[0].message.content ||
        "답변을 생성할 수 없습니다.";

      setChatMessages([
        ...nextMessages,
        { role: "assistant", content: assistantMessage },
      ]);
    } catch (error) {
      console.error("AI 상담 오류:", error);

      setChatMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            "죄송합니다. 현재 상담이 어렵습니다. 잠시 후 다시 시도해주세요.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (isLoading || isCompleting) return;

    const realConversation = chatMessages.filter(
      (message) =>
        !message.content.includes("안녕하세요! 어떤 증상이나 건강 고민이 있으신가요?")
    );

    if (realConversation.length === 0) {
      setModalMessage("상담 내용을 먼저 입력해주세요.");
      return;
    }

    setIsCompleting(true);

    try {
      if (!hasOpenAIKey) {
        setRecommendedList(await ruleBasedItems());
        return;
      }

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              '당신은 전문 영양사입니다. 지금까지의 상담 내용을 바탕으로 사용자에게 필요해 보이는 영양 성분과 일반적인 권장 용량을 정리하세요. 반드시 JSON만 반환하세요. 형식은 {"items":[{"name":"비타민D","dose":"1000~2000IU"},{"name":"마그네슘","dose":"200~400mg"}]} 입니다. 제품명보다 영양 성분명을 우선 사용하고, 과장하거나 질병 치료처럼 표현하지 마세요.',
          },
          {
            role: "user",
            content: `
사용자 정보:
${age ? `- 출생년도: ${age}` : ""}
${gender ? `- 성별: ${gender}` : ""}

상담 내용:
${realConversation
  .map((message) =>
    message.role === "user"
      ? `사용자: ${message.content}`
      : `AI: ${message.content}`
  )
  .join("\n")}

위 상담 내용을 바탕으로 필요한 영양 성분과 용량을 JSON으로 정리해주세요.
`,
          },
        ],
      });

      const content = response.choices[0].message.content || "";
      const parsed = JSON.parse(content);

      if (Array.isArray(parsed.items)) {
        setRecommendedList(parsed.items);
      } else {
        setRecommendedList([]);
        setModalMessage("추천 결과를 정리하지 못했습니다. 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("상담 완료 오류:", error);
      setRecommendedList(await ruleBasedItems());
      setModalMessage("AI 연결에 실패해 기본 추천을 보여드려요.");
    } finally {
      setIsCompleting(false);
    }
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
        <button className="load-info-button" onClick={loadMyInfo}>
          내 정보 불러오기
        </button>

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

          <div className="ai-chat-box">
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`ai-message ${
                  message.role === "user" ? "user" : "assistant"
                }`}
              >
                {message.content}
              </div>
            ))}

            {(isLoading || isCompleting) && (
              <div className="ai-message assistant">
                {isLoading
                  ? "영양 상담 AI가 답변을 작성 중입니다..."
                  : "상담 내용을 바탕으로 추천 영양제를 정리 중입니다..."}
              </div>
            )}
          </div>

          <div className="ai-input-row">
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="증상을 입력하세요..."
              disabled={isLoading || isCompleting}
              onKeyDown={(e) => {
                // 한글 입력 중 Enter가 두 번 처리되는 것을 막습니다.
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  handleChatSubmit();
                }
              }}
            />

            <button
              type="button"
              onClick={handleChatSubmit}
              disabled={isLoading || isCompleting}
            >
              {isLoading ? "..." : "➤"}
            </button>
          </div>

          <button
            type="button"
            className="consult-complete-button"
            onClick={handleCompleteConsultation}
            disabled={isLoading || isCompleting}
          >
            {isCompleting ? "정리 중..." : "상담 완료"}
          </button>
        </div>

        {recommendedList.length > 0 && (
          <div className="recommend-result-box">
            <h3>추천 영양 성분</h3>
            <p className="recommend-hint">성분을 누르면 상품을 검색해요</p>

            {recommendedList.map((item, index) => (
              <button
                type="button"
                className="recommend-result-item"
                key={index}
                onClick={() => onSearch(item.name)}
              >
                <div className="recommend-result-row">
                  <span>{item.name}</span>
                  <strong>{item.dose || "상품 보기 →"}</strong>
                </div>
                {item.reason && <p>{item.reason}</p>}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="recommend-submit"
          onClick={handleCompleteConsultation}
          disabled={isLoading || isCompleting}
        >
          맞춤 영양제 추천받기
        </button>
      </div>

      {modalMessage && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-card">
            <p>{modalMessage}</p>
            <button type="button" onClick={() => setModalMessage("")}>
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}