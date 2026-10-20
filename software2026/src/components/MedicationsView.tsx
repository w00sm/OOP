import { useState } from "react";
import { ChevronLeft, Lightbulb, Pill, Trash2, TriangleAlert, X } from "lucide-react";
import type { Supplement } from "./Home";
import MedicationSheet from "./MedicationSheet";
import {
  MED_KIND_LABELS,
  describeWhen,
  groupHits,
  hitSummary,
  isActiveMed,
  shortDate,
  shortMedName,
  type Medication,
} from "../services/medicationService";
import type { MovedSupplement } from "../services/scheduleService";
import { josa } from "../utils/josa";
import "./Medications.css";

// 마이페이지 → 복용 중인 약
// 등록한 약과 설명서의 영양제 주의 성분을 보여주고, 약을 추가·삭제합니다.

export type MedNotice = { medName: string; moved: MovedSupplement[] };

type MedicationsViewProps = {
  supplements: Supplement[];
  medications: Medication[];
  notice: MedNotice | null;
  onBack: () => void;
  onAdd: (medication: Medication) => void;
  onRemove: (id: number) => void;
  onCloseNotice: () => void;
};

export default function MedicationsView({
  supplements,
  medications,
  notice,
  onBack,
  onAdd,
  onRemove,
  onCloseNotice,
}: MedicationsViewProps) {
  const [showSheet, setShowSheet] = useState(false);
  const [openReasons, setOpenReasons] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Medication | null>(null);

  return (
    <>
      <div className="mypage-sub-header">
        <button type="button" className="mypage-back" onClick={onBack}>
          <ChevronLeft size={28} />
        </button>
        <h1>복용 중인 약</h1>
      </div>

      <p className="med-guide">
        등록한 약의 주의사항을 확인해
        <br />
        영양제 복용 시간을 자동으로 조정해요.
      </p>

      {notice && <MovedNotice notice={notice} onClose={onCloseNotice} />}

      {medications.length === 0 && (
        <div className="med-empty">
          <Pill size={28} />
          <p>
            아직 등록한 약이 없어요.
            <br />
            드시는 약을 등록하면 영양제와 겹치는 성분을 알려드려요.
          </p>
        </div>
      )}

      {medications.map((med) => {
        const active = isActiveMed(med);
        const { names, gap } = hitSummary(med.hits);
        return (
          <div className={`med-card ${active ? "" : "ended"}`} key={med.id}>
            <div className={`med-icon ${med.kind}`}>
              <Pill size={20} />
            </div>
            <div className="med-body">
              <div className="med-name">
                {shortMedName(med.name)}
                <span className={`med-badge ${med.kind}`}>{MED_KIND_LABELS[med.kind]}</span>
              </div>
              <div className="med-meta">
                {[med.company, describeWhen(med), med.dose].filter(Boolean).join(" · ")}
              </div>
              {(med.efficacy || med.until) && (
                <div className="med-chips">
                  {med.efficacy && <span>{med.efficacy}</span>}
                  {med.until && <span>{active ? `~ ${shortDate(med.until)}까지` : "복용 끝"}</span>}
                </div>
              )}
              {med.hits.length > 0 && active && (
                <button
                  type="button"
                  className="med-warn"
                  onClick={() => setOpenReasons(openReasons === med.id ? null : med.id)}
                >
                  <TriangleAlert size={14} />
                  <span>
                    설명서에 <b>{names}</b> 주의가 있어요. 영양제와 {gap}시간 이상 떨어뜨려 드세요.
                    <em>{openReasons === med.id ? " 접기" : " 근거 보기"}</em>
                  </span>
                </button>
              )}
              {openReasons === med.id && (
                <ul className="med-reasons">
                  {groupHits(med.hits).map((group) => (
                    <li key={group.names}>
                      <b>{group.names}</b> {group.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              className="med-remove"
              aria-label={`${shortMedName(med.name)} 삭제`}
              onClick={() => setConfirmRemove(med)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}

      <button type="button" className="med-add" onClick={() => setShowSheet(true)}>
        ＋ 복용 중인 약 추가
      </button>

      <p className="med-source center">
        식품의약품안전처 의약품 정보를 바탕으로 안내해요.
        <br />
        정확한 복용법은 의사·약사와 상담하세요.
      </p>

      {showSheet && (
        <MedicationSheet
          supplements={supplements}
          medications={medications}
          onClose={() => setShowSheet(false)}
          onSubmit={(medication) => {
            onAdd(medication);
            setShowSheet(false);
          }}
        />
      )}

      {confirmRemove && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-card">
            <p>{josa(shortMedName(confirmRemove.name), "을/를")} 목록에서 지울까요?</p>
            <div className="med-confirm-buttons">
              <button type="button" className="secondary" onClick={() => setConfirmRemove(null)}>
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemove(confirmRemove.id);
                  setConfirmRemove(null);
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 약 등록으로 영양제 시간을 옮겼을 때 안내 (마이페이지·홈 공통)
export function MovedNotice({ notice, onClose }: { notice: MedNotice; onClose: () => void }) {
  if (notice.moved.length === 0) return null;
  return (
    <div className="schedule-notice med-moved">
      <Lightbulb size={18} className="schedule-notice-icon" />
      <div>
        <strong>
          {josa(notice.medName, "과/와")} 겹치는 영양제 {notice.moved.length}개를 옮겼어요
        </strong>
        {notice.moved.map((item) => (
          <p key={item.id}>
            {item.name} {item.from} → <b>{item.to}</b> · {item.because}
          </p>
        ))}
      </div>
      <button type="button" aria-label="닫기" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
