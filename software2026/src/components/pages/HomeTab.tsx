import { useEffect, useRef, useState } from "react";
import {
  Lightbulb,
  Moon,
  Package,
  Sun,
  Sunrise,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import NotificationBell from "../NotificationBell";
import type { Dispatch, SetStateAction } from "react";
import { getOpenAI } from "../../services/openaiClient";
import type { Supplement, TimeCategory } from "../Home";
import {
  daysLeft,
  findScheduleConflicts,
  suggestSchedule,
  timeToCategory,
} from "../../services/scheduleService";
import { josa } from "../../utils/josa";
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
  const [newStock, setNewStock] = useState("");
  const [newDailyDose, setNewDailyDose] = useState("1");
  const [scheduleNotice, setScheduleNotice] = useState<{ title: string; reasons: string[] } | null>(null);
  const [editingTimeId, setEditingTimeId] = useState<number | null>(null);
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

  const addSupplement = () => {
    if (!newName.trim() || !newDesc.trim()) return;

    // 이미 등록된 영양제와의 상호작용을 따져 복용 시간을 자동으로 정합니다.
    const schedule = suggestSchedule(newName, supplements);
    const stock = Number(newStock);
    const dailyDose = Number(newDailyDose);

    const newItem: Supplement = {
      id: Date.now(),
      name: newName.trim(),
      desc: newDesc.trim(),
      time: schedule.time,
      timeCategory: schedule.timeCategory,
      checked: false,
      stock: newStock.trim() !== "" && stock >= 0 ? stock : undefined,
      dailyDose: dailyDose > 0 ? dailyDose : 1,
    };

    setSupplements((prev) => [...prev, newItem]);
    setScheduleNotice({
      title: `${josa(newItem.name, "을/를")} ${schedule.timeCategory} ${schedule.time}에 배정했어요`,
      reasons: schedule.reasons,
    });
    setNewName("");
    setNewDesc("");
    setNewStock("");
    setNewDailyDose("1");
    setShowAddForm(false);
    setHomeView("일정");
    setSelectedTime(schedule.timeCategory);
    setStorageTips([]);
    setStorageMessage("");
  };

  // 복용 체크 시 남은 수량을 하루 복용량만큼 줄이고, 체크 해제하면 되돌립니다.
  const toggleCheck = (id: number) => {
    setSupplements((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const checked = !item.checked;
        const dose = item.dailyDose ?? 1;
        const stock =
          item.stock === undefined
            ? undefined
            : Math.max(0, item.stock + (checked ? -dose : dose));
        return { ...item, checked, stock };
      })
    );
  };

  const changeTime = (id: number, time: string) => {
    if (!time) return;
    setSupplements((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, time, timeCategory: timeToCategory(time) } : item
      )
    );
    setSelectedTime(timeToCategory(time));
  };

  const removeSupplement = (id: number) => {
    setSupplements((prev) => prev.filter((item) => item.id !== id));
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

  const filteredSupplements = supplements
    .filter((item) => item.timeCategory === selectedTime)
    .sort((a, b) => a.time.localeCompare(b.time));

  const conflicts = findScheduleConflicts(supplements);

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

        <NotificationBell onClick={onOpenNotification} />
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
            placeholder="복용 방법 예: 1정 · 식후"
          />

          <div className="add-form-row">
            <label>
              남은 개수
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                placeholder="예: 60"
              />
            </label>
            <label>
              하루 복용 개수
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={newDailyDose}
                onChange={(e) => setNewDailyDose(e.target.value)}
              />
            </label>
          </div>
          <p className="add-form-hint">
            복용 시간은 함께 먹는 영양제와의 궁합을 따져 자동으로 정해져요.
            남은 개수를 입력하면 7일분 이하일 때 재구매 알림을 보내드려요.
          </p>

          <button onClick={addSupplement}>추가하기</button>
        </div>
      )}

      {scheduleNotice && (
        <div className="schedule-notice">
          <Lightbulb size={18} className="schedule-notice-icon" />
          <div>
            <strong>{scheduleNotice.title}</strong>
            {scheduleNotice.reasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setScheduleNotice(null)}
          >
            <X size={16} />
          </button>
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
                {time === "아침" && <Sunrise size={17} className="time-icon morning" />}
                {time === "점심" && <Sun size={17} className="time-icon noon" />}
                {time === "저녁" && <Moon size={16} className="time-icon night" />}
                {time}
              </button>
            ))}
          </div>

          {filteredSupplements.length === 0 ? (
            <div className="empty-card">
              이 시간대에 등록된 영양제가 없습니다.
            </div>
          ) : (
            filteredSupplements.map((item) => {
              const conflict = conflicts.get(item.id);
              const left = daysLeft(item);

              return (
                <div className="card" key={item.id}>
                  <div className="card-top">
                    <button
                      type="button"
                      className={`circle ${item.checked ? "checked" : ""}`}
                      aria-label={item.checked ? "복용 취소" : "복용 완료"}
                      onClick={() => toggleCheck(item.id)}
                    />

                    <div>
                      <div className={`name ${item.checked ? "done" : ""}`}>
                        {item.name}
                      </div>
                      <div className="desc">{item.desc}</div>
                    </div>

                    {editingTimeId === item.id ? (
                      <input
                        type="time"
                        className="time time-input"
                        autoFocus
                        defaultValue={item.time}
                        onBlur={(e) => {
                          changeTime(item.id, e.target.value);
                          setEditingTimeId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="time"
                        aria-label="복용 시간 변경"
                        onClick={() => setEditingTimeId(item.id)}
                      >
                        {item.time}
                      </button>
                    )}

                    <button
                      type="button"
                      className="card-remove"
                      aria-label={`${item.name} 삭제`}
                      onClick={() => removeSupplement(item.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {left !== null && (
                    <div className={`card-stock ${left <= 7 ? "low" : ""}`}>
                      <Package size={14} />
                      남은 {item.stock}개 · 약 {left}일분
                      {left <= 7 && " · 재구매 필요"}
                    </div>
                  )}

                  {conflict && (
                    <div className="card-warning">
                      <TriangleAlert size={14} />
                      <span>
                        {josa(conflict.with.name, "과/와")} 같은 시간대예요.{" "}
                        {conflict.rule.reason} 2시간 이상 간격을 두세요.
                      </span>
                    </div>
                  )}

                </div>
              );
            })
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