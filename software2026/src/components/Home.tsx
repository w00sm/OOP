import { useState, useEffect } from "react";
import "./Home.css";

type Tab = "일정" | "달력" | "보관법" | "검색" | "추천";
type TimeCategory = "아침" | "점심" | "저녁";

type Supplement = {
  id: number;
  name: string;
  desc: string;
  time: string;
  timeCategory: TimeCategory;
  checked: boolean;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("일정");
  const [selectedTime, setSelectedTime] = useState<TimeCategory>("아침");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const currentYear = new Date().getFullYear();

  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"남성" | "여성" | "">("");
  const [healthMessage, setHealthMessage] = useState("");

  const [supplements, setSupplements] = useState<Supplement[]>(() => {
    const saved = localStorage.getItem("supplements");
    return saved
      ? JSON.parse(saved)
      : [
          { id: 1, name: "종합비타민", desc: "1정 · 식후 30분", time: "08:00", timeCategory: "아침", checked: true },
          { id: 2, name: "비타민B", desc: "1정 · 식후", time: "09:00", timeCategory: "아침", checked: false },
          { id: 3, name: "오메가3", desc: "1캡슐 · 식후", time: "13:00", timeCategory: "점심", checked: false },
          { id: 4, name: "마그네슘", desc: "1정 · 취침 전", time: "22:00", timeCategory: "저녁", checked: false },
        ];
  });

  useEffect(() => {
    localStorage.setItem("supplements", JSON.stringify(supplements));
  }, [supplements]);

  const getTimeCategory = (name: string): TimeCategory => {
    const lower = name.toLowerCase();

    if (lower.includes("종합비타민") || lower.includes("비타민") || lower.includes("오메가")) return "아침";
    if (lower.includes("철분") || lower.includes("아연") || lower.includes("루테인")) return "점심";
    if (lower.includes("마그네슘") || lower.includes("칼슘") || lower.includes("유산균") || lower.includes("프로바이오틱스")) return "저녁";

    return "아침";
  };

  const getDefaultTime = (category: TimeCategory) => {
    if (category === "아침") return "08:00";
    if (category === "점심") return "13:00";
    return "22:00";
  };

  const addSupplement = () => {
    if (!newName.trim() || !newDesc.trim()) return;

    const category = getTimeCategory(newName);

    const newItem: Supplement = {
      id: Date.now(),
      name: newName,
      desc: newDesc,
      time: getDefaultTime(category),
      timeCategory: category,
      checked: false,
    };

    setSupplements((prev) => [...prev, newItem]);
    setNewName("");
    setNewDesc("");
    setShowAddForm(false);
    setActiveTab("일정");
    setSelectedTime(category);
  };

  const toggleCheck = (id: number) => {
    setSupplements((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const total = supplements.length;
  const completed = supplements.filter((item) => item.checked).length;
  const remaining = total - completed;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  const filteredSupplements = supplements.filter((item) => item.timeCategory === selectedTime);

  const searchedSupplements = supplements.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container">
      <div className="header">
        <h1>
          {activeTab === "검색" ? "검색" : activeTab === "추천" ? "맞춤 추천" : "복약 관리"}
        </h1>
        <p>
          {activeTab === "검색"
            ? "등록한 영양제를 빠르게 찾아보세요"
            : activeTab === "추천"
            ? "나에게 딱 맞는 영양제를 찾아보세요"
            : "효과적인 영양제 복용을 위한 맞춤 스케줄"}
        </p>
      </div>

      {activeTab !== "검색" && activeTab !== "추천" && (
        <>
          <div className="summary">
            <div className="summary-title">오늘의 복용 현황</div>
            <div className="summary-box">
              <div>
                <div className="num">{total}</div>
                <div className="label">총 복용</div>
              </div>
              <div>
                <div className="num">{completed}</div>
                <div className="label">완료</div>
              </div>
              <div>
                <div className="num">{remaining}</div>
                <div className="label">남음</div>
              </div>
            </div>
          </div>

          <button className="add-button" onClick={() => setShowAddForm(!showAddForm)}>
            ＋ 영양제 추가
          </button>

          {showAddForm && (
            <div className="add-form">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="영양제 이름" />
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="복용 방법 예: 1정" />
              <button onClick={addSupplement}>추가하기</button>
            </div>
          )}

          <div className="tabs">
            {(["일정", "달력", "보관법"] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? "active" : ""}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </>
      )}

      {activeTab === "일정" && (
        <>
          <div className="time-tabs">
            {(["아침", "점심", "저녁"] as TimeCategory[]).map((time) => (
              <button
                key={time}
                type="button"
                className={selectedTime === time ? "active" : ""}
                onClick={() => setSelectedTime(time)}
              >
                {time === "아침" && "🌅 "}
                {time === "점심" && "🍽️ "}
                {time === "저녁" && "🌙 "}
                {time}
              </button>
            ))}
          </div>

          {filteredSupplements.length === 0 ? (
            <div className="empty-card">이 시간대에 등록된 영양제가 없습니다.</div>
          ) : (
            filteredSupplements.map((item) => (
              <div className="card" key={item.id}>
                <div className="card-top">
                  <button
                    type="button"
                    className={`circle ${item.checked ? "checked" : ""}`}
                    onClick={() => toggleCheck(item.id)}
                  />
                  <div>
                    <div className={`name ${item.checked ? "done" : ""}`}>{item.name}</div>
                    <div className="desc">{item.desc}</div>
                  </div>
                  <div className="time">{item.time}</div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {activeTab === "달력" && (
        <div className="calendar-section">
          <h2>2026년 5월</h2>

          <div className="calendar-grid">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <div className="calendar-day-name" key={day}>{day}</div>
            ))}

            {Array.from({ length: 31 }, (_, i) => {
              const day = i + 1;
              return (
                <button
                  key={day}
                  type="button"
                  className={`calendar-day ${day === 4 ? "today" : ""}`}
                  onClick={() => setSelectedDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {selectedDay !== null && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 99999,
                background: "rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 340,
                  background: "white",
                  borderRadius: 24,
                  padding: 22,
                  boxShadow: "0 20px 45px rgba(0,0,0,0.18)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  style={{
                    display: "block",
                    marginLeft: "auto",
                    border: 0,
                    background: "#f1f3f2",
                    borderRadius: 999,
                    padding: "8px 12px",
                    fontWeight: 700,
                  }}
                >
                  닫기
                </button>

                <h3>5월 {selectedDay}일 복용 기록</h3>
                <p>완료율 {completionRate}%</p>

                {supplements.map((item) => (
                  <div className="calendar-record" key={item.id}>
                    <span>{item.checked ? "✅" : "⬜"}</span>
                    <span>{item.name}</span>
                    <small>{item.time}</small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "보관법" && (
        <div className="storage-section">
          <h2>영양제별 보관법</h2>
          <p>올바른 보관으로 효과를 유지하세요</p>

          <div className="storage-card">
            <div className="storage-icon">🌡️</div>
            <div>
              <div className="storage-name">유산균</div>
              <div className="storage-tip">냉장 보관 추천</div>
              <div className="storage-desc">생균의 활성을 유지하기 위해 냉장 보관이 좋습니다.</div>
            </div>
          </div>

          <div className="storage-card">
            <div className="storage-icon">💧</div>
            <div>
              <div className="storage-name">비타민 · 미네랄</div>
              <div className="storage-tip">습기 주의</div>
              <div className="storage-desc">직사광선을 피하고 건조한 곳에 보관하세요.</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "검색" && (
        <div className="search-section">
          <h2>영양제 검색</h2>

          <input
            type="text"
            placeholder="영양제 이름 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />

          <div className="search-list">
            {searchQuery.trim() !== "" &&
              searchedSupplements.map((item) => (
                <div className="search-item" key={item.id}>
                  <div>
                    <div className="name">{item.name}</div>
                    <div className="desc">{item.desc}</div>
                  </div>
                  <div className="time">{item.time}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === "추천" && (
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
                className={gender === "남성" ? "active" : ""}
                onClick={() => setGender("남성")}
              >
                남성
              </button>
              <button
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
              안녕하세요! 어떤 증상이나 건강 고민이 있으신가요? 자세히 말씀해주시면 적합한 영양제를 추천해드리겠습니다.
            </div>

            <div className="ai-input-row">
              <input
                value={healthMessage}
                onChange={(e) => setHealthMessage(e.target.value)}
                placeholder="증상을 입력하세요..."
              />
              <button>➤</button>
            </div>
          </div>

          <button className="recommend-submit">맞춤 영양제 추천받기</button>
        </div>
      )}

      <div className="bottom-nav">
        <button className={activeTab === "일정" ? "active" : ""} onClick={() => setActiveTab("일정")}>홈</button>
        <button className={activeTab === "검색" ? "active" : ""} onClick={() => setActiveTab("검색")}>검색</button>
        <button className={activeTab === "추천" ? "active" : ""} onClick={() => setActiveTab("추천")}>추천</button>
        <button>찜</button>
        <button>마이페이지</button>
      </div>
    </div>
  );
}