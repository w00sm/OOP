import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { getOpenAI } from "../../services/openaiClient";
import type { Supplement, TimeCategory } from "../Home";
import "../styles/HomeTab.css";

type HomeTabProps = {
  supplements: Supplement[];
  setSupplements: Dispatch<SetStateAction<Supplement[]>>;
  onOpenNotification: () => void;
};

type DailyRecordItem = {
  id: number;
  name: string;
  desc: string;
  time: string;
  checked: boolean;
};

type DailyRecords = {
  [dateKey: string]: DailyRecordItem[];
};

type StorageTip = {
  name: string;
  tip: string;
  desc: string;
  icon: string;
};

export default function HomeTab({
  supplements,
  setSupplements,
  onOpenNotification,
}: HomeTabProps) {
  const today = new Date();
  const calendarYear = today.getFullYear();
  const calendarMonth = today.getMonth() + 1;
  const todayKey = getDateKey(today);

  const [homeView, setHomeView] = useState<"일정" | "달력" | "보관법">("일정");
  const [selectedTime, setSelectedTime] = useState<TimeCategory>("아침");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [storageTips, setStorageTips] = useState<StorageTip[]>([]);
  const [isStorageLoading, setIsStorageLoading] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");

  const initializedRef = useRef(false);

  const [dailyRecords, setDailyRecords] = useState<DailyRecords>(() => {
    const saved = localStorage.getItem("dailySupplementRecords");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const lastActiveDate = localStorage.getItem("lastActiveDate");

    if (lastActiveDate && lastActiveDate !== todayKey) {
      setSupplements((prev) =>
        prev.map((item) => ({
          ...item,
          checked: false,
        }))
      );
    } else {
      setDailyRecords((prev) => {
        if (prev[todayKey]) return prev;

        return {
          ...prev,
          [todayKey]: createDailyRecord(supplements),
        };
      });
    }

    localStorage.setItem("lastActiveDate", todayKey);
    initializedRef.current = true;
  }, []);

  useEffect(() => {
    localStorage.setItem("supplements", JSON.stringify(supplements));

    if (!initializedRef.current) return;

    setDailyRecords((prev) => ({
      ...prev,
      [todayKey]: createDailyRecord(supplements),
    }));
  }, [supplements, todayKey]);

  useEffect(() => {
    localStorage.setItem("dailySupplementRecords", JSON.stringify(dailyRecords));
  }, [dailyRecords]);

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
    setStorageTips([]);
    setStorageMessage("");
  };

  const toggleCheck = (id: number) => {
    setSupplements((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const loadStorageTips = async () => {
    if (supplements.length === 0) {
      setStorageMessage("등록된 영양제가 없습니다.");
      setStorageTips([]);
      return;
    }

    setIsStorageLoading(true);
    setStorageMessage("");

    try {
      const supplementNames = supplements.map((item) => item.name).join(", ");

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              '당신은 영양제 보관 전문가입니다. 사용자가 현재 섭취 중인 영양제 목록에 대해서만 보관법을 알려주세요. 반드시 JSON만 반환하세요. 형식은 {"items":[{"name":"오메가3","tip":"서늘한 곳 보관","desc":"직사광선과 고온을 피하고 뚜껑을 잘 닫아 보관하세요.","icon":"💊"}]} 입니다. 설명은 짧고 실용적으로 작성하세요.',
          },
          {
            role: "user",
            content: `현재 섭취 중인 영양제: ${supplementNames}`,
          },
        ],
      });

      const content = response.choices[0].message.content || "";
      const parsed = JSON.parse(content);

      if (Array.isArray(parsed.items)) {
        setStorageTips(parsed.items);
      } else {
        setStorageTips([]);
        setStorageMessage("보관법을 불러오지 못했습니다.");
      }
    } catch (error) {
      console.error("보관법 불러오기 오류:", error);
      setStorageTips([]);
      setStorageMessage("보관법을 불러오지 못했습니다.");
    } finally {
      setIsStorageLoading(false);
    }
  };

  const total = supplements.length;
  const completed = supplements.filter((item) => item.checked).length;
  const remaining = total - completed;

  const filteredSupplements = supplements.filter(
    (item) => item.timeCategory === selectedTime
  );

  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();

  const selectedDateKey =
    selectedDay !== null
      ? getDateKey(new Date(calendarYear, calendarMonth - 1, selectedDay))
      : "";

  const selectedRecords = selectedDateKey ? dailyRecords[selectedDateKey] : [];

  const selectedCompleted =
    selectedRecords?.filter((item) => item.checked).length || 0;

  const selectedCompletionRate =
    selectedRecords && selectedRecords.length > 0
      ? Math.round((selectedCompleted / selectedRecords.length) * 100)
      : 0;

  const isFutureDate = selectedDay !== null && selectedDateKey > todayKey;

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
          aria-label="알림"
          onClick={onOpenNotification}
        >
          <Bell size={22} strokeWidth={2} />
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
          <h2>
            {calendarYear}년 {calendarMonth}월
          </h2>

          <div className="calendar-grid">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <div className="calendar-day-name" key={day}>
                {day}
              </div>
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateKey = getDateKey(
                new Date(calendarYear, calendarMonth - 1, day)
              );

              return (
                <button
                  key={day}
                  type="button"
                  className={`calendar-day ${
                    dateKey === todayKey ? "today" : ""
                  } ${dailyRecords[dateKey] ? "has-record" : ""}`}
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
                <div className="calendar-modal-title">
                  {calendarMonth}월 {selectedDay}일 복용 기록
                </div>

                {isFutureDate ? (
                  <div className="empty-card">
                    미래 날짜의 복용 기록은 아직 생성되지 않았습니다.
                  </div>
                ) : selectedRecords && selectedRecords.length > 0 ? (
                  <>
                    <div className="calendar-modal-rate">
                      완료율 {selectedCompletionRate}%
                    </div>

                    <div className="calendar-record-list">
                      {selectedRecords.map((item) => (
                        <div className="calendar-record" key={item.id}>
                          <span
                            className={`record-check ${
                              item.checked ? "checked" : ""
                            }`}
                          >
                            {item.checked ? "✓" : ""}
                          </span>

                          <span className="record-name">{item.name}</span>
                          <span className="record-time">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-card">
                    저장된 복용 기록이 없습니다.
                  </div>
                )}

                <button
                  type="button"
                  className="calendar-close-bottom"
                  onClick={() => setSelectedDay(null)}
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {homeView === "보관법" && (
        <div className="storage-section">
          <h2>영양제별 보관법</h2>
          <p>현재 섭취 중인 영양제의 보관법을 확인하세요</p>

          {storageTips.length === 0 && (
            <button
              className="add-button"
              onClick={loadStorageTips}
              disabled={isStorageLoading}
            >
              {isStorageLoading
                ? "보관법 불러오는 중..."
                : "내 영양제 보관법 불러오기"}
            </button>
          )}

          {storageMessage && <div className="empty-card">{storageMessage}</div>}

          {storageTips.map((item, index) => (
            <div className="storage-card" key={`${item.name}-${index}`}>
              <div className="storage-icon">{item.icon || "💊"}</div>
              <div>
                <div className="storage-name">{item.name}</div>
                <div className="storage-tip">{item.tip}</div>
                <div className="storage-desc">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function createDailyRecord(supplements: Supplement[]): DailyRecordItem[] {
  return supplements.map((item) => ({
    id: item.id,
    name: item.name,
    desc: item.desc,
    time: item.time,
    checked: item.checked,
  }));
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}