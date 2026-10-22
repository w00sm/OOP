// 데이터 백업·복원 (로그인 없이 기기를 바꿀 때 사용)
// 이 기기에 저장된 기록을 파일 하나(JSON)로 내보내고, 새 기기에서 그 파일을 불러옵니다.
// 서버 푸시 설정(기기마다 다른 알림 토큰)과 설치 안내 배너 같은 기기 설정은 옮기지 않습니다.

const APP = "fit-vita";
const VERSION = 1;

// 백업에 담는 기록
const BACKUP_KEYS = [
  "supplements", // 복용 관리 중인 영양제
  "medications", // 복용 중인 약
  "wishlist", // 찜·목표가
  "intakeHistory", // 복용 내역
  "supplementSurveys", // 설문 결과
  "dailySupplementRecords", // 달력 복용 기록
  "userHealthProfile", // 내 정보
  "notificationSettings", // 알림 설정
  "notificationHistory", // 받은 알림 목록
  "notificationSentKeys", // 오늘 보낸 알림 (복원 후 같은 알림이 또 오지 않게)
  "notificationSentOnceKeys",
  "lastActiveDate", // 날짜가 바뀌면 복용 체크를 푸는 기준
  "demoStockSeeded_v1",
];

export type BackupFile = {
  app: typeof APP;
  version: number;
  exportedAt: string;
  data: Record<string, string>;
};

export function createBackup(): BackupFile {
  const data: Record<string, string> = {};
  for (const key of BACKUP_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return { app: APP, version: VERSION, exportedAt: new Date().toISOString(), data };
}

// 백업 파일에 든 기록 요약 (복원 전에 확인용)
export function summarizeBackup(backup: BackupFile) {
  const count = (key: string) => {
    try {
      const value = JSON.parse(backup.data[key] ?? "[]");
      return Array.isArray(value) ? value.length : 0;
    } catch {
      return 0;
    }
  };
  return {
    exportedAt: backup.exportedAt,
    supplements: count("supplements"),
    medications: count("medications"),
    wishlist: count("wishlist"),
    history: count("intakeHistory"),
  };
}

const fileName = () => {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `fitvita-backup-${now.getFullYear()}${m}${d}.json`;
};

// 파일로 저장: 공유 기능이 있는 휴대폰은 공유 창(파일·드라이브·카카오톡 등에 저장), 없으면 다운로드
export async function exportBackup(): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob = new Blob([JSON.stringify(createBackup(), null, 2)], { type: "application/json" });
  const file = new File([blob], fileName(), { type: "application/json" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Fit Vita 백업" });
      return "shared";
    } catch (error) {
      if ((error as DOMException).name === "AbortError") return "cancelled";
      // 공유가 막히면 다운로드로
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}

// 파일을 읽어 Fit Vita 백업이 맞는지 확인
export async function readBackupFile(file: File): Promise<BackupFile> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("백업 파일을 읽지 못했어요. Fit Vita에서 저장한 파일인지 확인해 주세요.");
  }
  const backup = parsed as Partial<BackupFile>;
  if (backup?.app !== APP || typeof backup.data !== "object" || backup.data === null) {
    throw new Error("Fit Vita 백업 파일이 아니에요.");
  }
  if ((backup.version ?? 0) > VERSION) {
    throw new Error("더 새로운 버전의 앱에서 만든 백업이에요. 앱을 업데이트한 뒤 다시 시도해 주세요.");
  }
  return backup as BackupFile;
}

// 복원: 지금 기록을 백업 내용으로 바꿉니다. (백업에 없는 기록은 비움) 화면은 새로고침해서 다시 읽음
export function restoreBackup(backup: BackupFile) {
  for (const key of BACKUP_KEYS) {
    const value = backup.data[key];
    if (typeof value === "string") localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  }
}
