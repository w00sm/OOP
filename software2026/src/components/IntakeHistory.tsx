import { useEffect, useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, ClipboardList, Pill } from "lucide-react";
import type { Supplement } from "./Home";
import SurveyModal from "./SurveyModal";
import {
  formatDate,
  getHistoryEntries,
  subscribeHistory,
  type HistoryEntry,
} from "../services/historyService";
import { VERDICT_LABELS, getSurveyFor, type SurveyAction } from "../services/surveyService";
import "./IntakeHistory.css";

// 마이페이지 → 복용 내역
// 다 먹어서(잔여량 0) 복용 관리에서 빠진 영양제 목록. 누르면 설문으로 재구매가 필요한지 판단합니다.

type IntakeHistoryProps = {
  supplements: Supplement[]; // 지금 복용 관리 중인 영양제 (추천 시 이미 충분한 성분 제외용)
  onBack: () => void;
  onSearch: (keyword: string) => void;
  onRecommend: (ingredients: string[]) => void;
  onReAdd: (entry: HistoryEntry) => void;
};

export default function IntakeHistory({
  supplements,
  onBack,
  onSearch,
  onRecommend,
  onReAdd,
}: IntakeHistoryProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>(getHistoryEntries);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  useEffect(() => subscribeHistory(() => setEntries(getHistoryEntries())), []);

  const handleAction = (action: SurveyAction) => {
    const entry = selected;
    setSelected(null);
    if (action.kind === "search") onSearch(action.keyword);
    if (action.kind === "recommend") onRecommend(action.ingredients);
    if (action.kind === "readd" && entry) onReAdd(entry);
  };

  return (
    <>
      <div className="mypage-sub-header">
        <button type="button" className="mypage-back" onClick={onBack}>
          <ChevronLeft size={28} />
        </button>
        <h1>복용 내역</h1>
      </div>

      <p className="history-guide">
        다 드신 영양제가 기록돼요. 누르면 설문으로 재구매가 필요한지 알려드려요.
      </p>

      {entries.length === 0 && (
        <div className="history-empty">
          <ClipboardList size={28} />
          <p>
            아직 다 드신 영양제가 없어요.
            <br />
            잔여량이 0이 되면 여기에 기록돼요.
          </p>
        </div>
      )}

      <div className="history-list">
        {entries.map((entry) => {
          const survey = getSurveyFor(entry.id);
          return (
            <button
              type="button"
              key={entry.id}
              className="history-card"
              onClick={() => setSelected(entry)}
            >
              <div className="history-card-top">
                <div>
                  <div className="history-name">{entry.name}</div>
                  <div className="history-meta">
                    {/* 제품명과 다를 때만 주성분 표시 (예: "데일리 멀티" → 종합비타민) */}
                    {entry.ingredient && entry.ingredient !== entry.name && (
                      <em>{entry.ingredient}</em>
                    )}
                    <span>{entry.desc}</span>
                  </div>
                </div>
                <span className={`history-verdict ${survey ? survey.result.verdict : "todo"}`}>
                  {survey ? VERDICT_LABELS[survey.result.verdict] : "설문하기"}
                </span>
              </div>

              <div className="history-detail">
                <span>
                  <CalendarRange size={14} />
                  {entry.startedAt ? `${formatDate(entry.startedAt)} ~ ` : ""}
                  {formatDate(entry.finishedAt)}
                </span>
                {entry.totalTaken !== null && (
                  <span>
                    <Pill size={14} />
                    {entry.totalTaken}
                    {entry.unit} 복용
                  </span>
                )}
                <ChevronRight size={18} className="history-arrow" />
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <SurveyModal
          subject={{ key: selected.id, id: selected.supplementId, name: selected.name }}
          supplements={supplements}
          savedResult={getSurveyFor(selected.id)?.result}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
    </>
  );
}
