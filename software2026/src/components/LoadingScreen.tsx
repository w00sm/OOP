import { useEffect, useState } from "react";
import type { Supplement } from "./Home";
import "./LoadingScreen.css";

// 앱에 들어올 때 보여주는 로딩 화면
// 오늘 복용률에 따라 캐릭터 컨디션이 달라지고, 구간별 3컷을 번갈아 보여줘 스톱모션처럼 움직입니다.
// 이미지: public/loading/character-sheet.png (3열 x 5행, 행 = 복용률 구간, 열 = 컷)

type LoadingScreenProps = {
  supplements: Supplement[];
  onDone: () => void;
};

const FRAME_COUNT = 3;
const FRAME_MS = 350; // 한 컷이 보이는 시간
const SHOW_MS = 2100; // 로딩 화면이 보이는 시간 (컷 반복 2바퀴)
const FADE_MS = 350;

const TIERS = [
  { max: 20, message: "영양제를 기다리다 잠들었어요… zzZ" },
  { max: 40, message: "기운이 없어요. 한 알 챙겨볼까요?" },
  { max: 60, message: "절반쯤 왔어요. 조금만 더 힘내요!" },
  { max: 80, message: "좋아요! 거의 다 챙겼어요" },
  { max: 100, message: "완벽해요! 오늘 컨디션 최고예요" },
];

function todayKey() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

// 오늘 복용률 (%) — 날짜가 바뀌었으면 어제 체크는 무효라 0으로 봅니다.
function intakeRate(supplements: Supplement[]) {
  if (supplements.length === 0) return 0;
  let lastActiveDate: string | null = null;
  try {
    lastActiveDate = localStorage.getItem("lastActiveDate");
  } catch {
    // 읽지 못하면 오늘 기록으로 봅니다.
  }
  if (lastActiveDate && lastActiveDate !== todayKey()) return 0;
  const done = supplements.filter((item) => item.checked).length;
  return Math.round((done / supplements.length) * 100);
}

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export default function LoadingScreen({ supplements, onDone }: LoadingScreenProps) {
  // 로딩 화면이 떠 있는 동안 복용률이 바뀌어도 캐릭터가 바뀌지 않게 처음 값으로 고정
  const [rate] = useState(() => intakeRate(supplements));
  const [frame, setFrame] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const tierIndex = TIERS.findIndex((tier) => rate <= tier.max);
  const tier = TIERS[tierIndex];

  useEffect(() => {
    const frameTimer = prefersReducedMotion()
      ? undefined
      : window.setInterval(() => setFrame((prev) => (prev + 1) % FRAME_COUNT), FRAME_MS);
    const leaveTimer = window.setTimeout(() => setLeaving(true), SHOW_MS);
    return () => {
      window.clearInterval(frameTimer);
      window.clearTimeout(leaveTimer);
    };
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const doneTimer = window.setTimeout(onDone, FADE_MS);
    return () => window.clearTimeout(doneTimer);
  }, [leaving, onDone]);

  return (
    <div
      className={`loading-screen ${leaving ? "leaving" : ""}`}
      role="status"
      aria-label={`오늘 복용률 ${rate}%. ${tier.message}`}
      onClick={() => setLeaving(true)}
    >
      <div className="loading-brand">Fit Vita</div>

      <div
        className="loading-character"
        style={{
          backgroundPosition: `${(frame / (FRAME_COUNT - 1)) * 100}% ${(tierIndex / (TIERS.length - 1)) * 100}%`,
        }}
      />

      <div className="loading-rate">
        오늘 복용률 <strong>{rate}%</strong>
      </div>
      <div className="loading-bar">
        <span style={{ width: `${rate}%` }} />
      </div>
      <p className="loading-message">
        {supplements.length === 0 ? "영양제를 등록하고 함께 건강해져요" : tier.message}
      </p>
    </div>
  );
}
