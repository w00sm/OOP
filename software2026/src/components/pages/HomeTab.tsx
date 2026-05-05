import { useEffect, useState } from "react";
import type { Supplement, TimeCategory } from "../Home";
import "../styles/HomeTab.css";

type HomeTabProps = {
  supplements: Supplement[];
  setSupplements: React.Dispatch<React.SetStateAction<Supplement[]>>;
  onOpenNotification: () => void;
};

export default function HomeTab({
  supplements,
  setSupplements,
  onOpenNotification,
}: HomeTabProps) {
  const [homeView, setHomeView] = useState<"일정" | "달력" | "보관법">("일정");
  const [selectedTime, setSelectedTime] = useState<TimeCategory>("아침");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem("supplements", JSON.stringify(supplements));
  }, [supplements]);

  const getTimeCategory = (name: string): TimeCategory => {
    const lower = name.toLowerCase();

    if (
      lower.includes("종합비타민") ||
      lower.includes("비타민") ||
      lower.includes("오메가")
    ) {
      return "아침";
    }

    if (
      lower.includes("철분") ||
      lower.includes("아연") ||
      lower.includes("루테인")
    ) {
      return "점심";
    }

    if (
      lower.includes("마그네슘") ||
      lower.includes("칼슘") ||
      lower.includes("유산균") ||
      lower.includes("프로바이오틱스")
    ) {
      return "저녁";
    }

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
    setHomeView("일정");
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
  const completionRate =
    total === 0 ? 0 : Math.round((completed / total) * 100);

  const filteredSupplements = supplements.filter(
    (item) => item.timeCategory === selectedTime
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>복약 관리</h1>
          <p>효과적인 영양제 복용을 위한 맞춤 스케줄</p>
        </div>
        <button
          type="button"
          className="top-bell-button"
          onClick={onOpenNotification}
        >
          ♧
        </button>
      </div>

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

      <button
        className="add-button"
        onClick={() => setShowAddForm(!showAddForm)}
      >
        ＋ 영양제 추가
      </button>

      {showAddForm && (
        <div className="add-form">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="영양제 이름"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="복용 방법 예: 1정"
          />
          <button onClick={addSupplement}>추가하기</button>
        </div>
      )}

      <div className="tabs">
        {(["일정", "달력", "보관법"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={homeView === tab ? "active" : ""}
            onClick={() => setHomeView(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {homeView === "일정" && (
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
            <div className="empty-card">
              이 시간대에 등록된 영양제가 없습니다.
            </div>
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
                    <div className={`name ${item.checked ? "done" : ""}`}>
                      {item.name}
                    </div>
                    <div className="desc">{item.desc}</div>
                  </div>
                  <div className="time">{item.time}</div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {homeView === "달력" && (
        <div className="calendar-section">
          <h2>2026년 5월</h2>

          <div className="calendar-grid">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <div className="calendar-day-name" key={day}>
                {day}
              </div>
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
            <div className="calendar-modal">
              <div className="calendar-modal-card">
                <button
                  type="button"
                  className="calendar-close"
                  onClick={() => setSelectedDay(null)}
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

      {homeView === "보관법" && (
        <div className="storage-section">
          <h2>영양제별 보관법</h2>
          <p>올바른 보관으로 효과를 유지하세요</p>

          <div className="storage-card">
            <div className="storage-icon">🌡️</div>
            <div>
              <div className="storage-name">유산균</div>
              <div className="storage-tip">냉장 보관 추천</div>
              <div className="storage-desc">
                생균의 활성을 유지하기 위해 냉장 보관이 좋습니다.
              </div>
            </div>
          </div>

          <div className="storage-card">
            <div className="storage-icon">💧</div>
            <div>
              <div className="storage-name">비타민 · 미네랄</div>
              <div className="storage-tip">습기 주의</div>
              <div className="storage-desc">
                직사광선을 피하고 건조한 곳에 보관하세요.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}