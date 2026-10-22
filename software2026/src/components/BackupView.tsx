import { useRef, useState, type ChangeEvent } from "react";
import { ChevronLeft, Download, ShieldAlert, Upload } from "lucide-react";
import {
  createBackup,
  exportBackup,
  readBackupFile,
  restoreBackup,
  summarizeBackup,
  type BackupFile,
} from "../services/backupService";

// 마이페이지 → 데이터 백업·복원
// 로그인 없이 쓰는 앱이라, 기기를 바꿀 때 기록을 파일로 옮깁니다.

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

export default function BackupView({ onBack }: { onBack: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [current] = useState(() => summarizeBackup(createBackup()));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<BackupFile | null>(null); // 복원 확인 중인 백업

  const handleExport = async () => {
    setError("");
    try {
      const result = await exportBackup();
      if (result === "cancelled") return;
      setMessage(
        result === "shared"
          ? "백업 파일을 저장했어요. 드라이브나 '나에게 보내기'처럼 다시 찾을 수 있는 곳에 보관하세요."
          : "백업 파일을 다운로드했어요. 다운로드 폴더에서 확인할 수 있어요."
      );
    } catch {
      setError("백업 파일을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // 같은 파일을 다시 골라도 동작하게
    if (!file) return;
    setError("");
    setMessage("");
    try {
      setPending(await readBackupFile(file));
    } catch (readError) {
      setError((readError as Error).message);
    }
  };

  const confirmRestore = () => {
    if (!pending) return;
    try {
      restoreBackup(pending);
    } catch {
      setPending(null);
      setError("복원하지 못했어요. 저장 공간이 부족한지 확인해 주세요.");
      return;
    }
    // 화면의 모든 기록을 백업 내용으로 다시 읽기
    window.location.reload();
  };

  const pendingSummary = pending ? summarizeBackup(pending) : null;

  return (
    <>
      <div className="mypage-sub-header">
        <button type="button" className="mypage-back" onClick={onBack}>
          <ChevronLeft size={28} />
        </button>
        <h1>데이터 백업·복원</h1>
      </div>

      <p className="backup-guide">
        Fit Vita는 회원가입 없이 이 기기에 기록을 저장해요.
        <br />
        폰을 바꾸거나 앱을 지우기 전에 백업해 두세요.
      </p>

      <div className="backup-card">
        <div className="backup-card-head">
          <span className="backup-icon">
            <Download size={18} />
          </span>
          <div>
            <h2>백업하기</h2>
            <p>지금 기록을 파일 하나로 저장해요.</p>
          </div>
        </div>
        <ul className="backup-summary">
          <li>
            영양제 <b>{current.supplements}개</b>
          </li>
          <li>
            복용 중인 약 <b>{current.medications}개</b>
          </li>
          <li>
            찜 <b>{current.wishlist}개</b>
          </li>
          <li>
            복용 내역 <b>{current.history}개</b>
          </li>
        </ul>
        <p className="backup-small">내 정보, 설문 결과, 달력 기록, 알림 설정도 함께 저장돼요.</p>
        <button type="button" className="backup-button" onClick={handleExport}>
          백업 파일 저장하기
        </button>
      </div>

      <div className="backup-card">
        <div className="backup-card-head">
          <span className="backup-icon restore">
            <Upload size={18} />
          </span>
          <div>
            <h2>복원하기</h2>
            <p>저장해 둔 백업 파일을 불러와요.</p>
          </div>
        </div>
        <button
          type="button"
          className="backup-button secondary"
          onClick={() => fileRef.current?.click()}
        >
          백업 파일 불러오기
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleFile}
        />
      </div>

      {message && <p className="backup-message">{message}</p>}
      {error && <p className="backup-error">{error}</p>}

      <p className="backup-privacy">
        <ShieldAlert size={14} />
        백업 파일에는 복용 중인 약 같은 건강 정보가 들어 있어요. 다른 사람과 공유하지 마세요.
      </p>

      {pending && pendingSummary && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-card backup-confirm">
            <p>이 백업으로 복원할까요?</p>
            <ul className="backup-summary">
              <li>
                백업한 날 <b>{formatDate(pendingSummary.exportedAt)}</b>
              </li>
              <li>
                영양제 <b>{pendingSummary.supplements}개</b> · 약 <b>{pendingSummary.medications}개</b>
              </li>
              <li>
                찜 <b>{pendingSummary.wishlist}개</b> · 복용 내역 <b>{pendingSummary.history}개</b>
              </li>
            </ul>
            <p className="backup-warning">지금 이 기기의 기록은 백업 내용으로 바뀌어요.</p>
            <div className="backup-confirm-buttons">
              <button type="button" className="secondary" onClick={() => setPending(null)}>
                취소
              </button>
              <button type="button" onClick={confirmRestore}>
                복원하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
