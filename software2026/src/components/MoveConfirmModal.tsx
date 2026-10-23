import { ArrowRight, Clock } from "lucide-react";
import "./MoveConfirmModal.css";

// 영양제·약을 추가할 때 겹치는 기존 영양제 시간을 옮길지 묻는 창
// 처방약(복용 중인 약)은 시간을 옮기지 않습니다.

export type MoveItem = { id: number; name: string; from: string; to: string; because: string };

type MoveConfirmModalProps = {
  title: string; // 예: "철분과 겹치는 영양제가 있어요"
  moves: MoveItem[];
  keepNote: string; // "옮기지 않기"를 고르면 어떻게 되는지
  moveNote?: string; // "옮기기"를 고르면 새로 추가하는 것은 어떻게 되는지
  onMove: () => void;
  onKeep: () => void;
};

export default function MoveConfirmModal({
  title,
  moves,
  keepNote,
  moveNote,
  onMove,
  onKeep,
}: MoveConfirmModalProps) {
  return (
    <div className="custom-modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="custom-modal-card move-confirm">
        <div className="move-confirm-icon">
          <Clock size={22} />
        </div>
        <h2>{title}</h2>
        <p className="move-confirm-sub">함께 먹으면 좋지 않아서, 기존 영양제의 복용 시간을 옮길까요?</p>

        <ul className="move-confirm-list">
          {moves.map((move) => (
            <li key={move.id}>
              <div className="move-confirm-row">
                <b>{move.name}</b>
                <span className="move-confirm-time">
                  {move.from}
                  <ArrowRight size={13} />
                  <strong>{move.to}</strong>
                </span>
              </div>
              <small>{move.because}</small>
            </li>
          ))}
        </ul>

        <p className="move-confirm-note">
          {moveNote && (
            <>
              {moveNote}
              <br />
            </>
          )}
          {keepNote} 처방약 시간은 옮기지 않아요.
        </p>

        <div className="move-confirm-buttons">
          <button type="button" className="secondary" onClick={onKeep}>
            옮기지 않기
          </button>
          <button type="button" onClick={onMove}>
            옮기기
          </button>
        </div>
      </div>
    </div>
  );
}
