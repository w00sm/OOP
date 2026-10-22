import { useEffect, useState } from "react";
import type { Supplement } from "./Home";
import { LOADING_ART, type LoadingArt } from "../data/loadingArt";
import { detectIngredients } from "../services/scheduleService";
import "./LoadingScreen.css";

// 앱에 들어올 때 보여주는 로딩 화면
// 영양제 그림 한 장 + 한 줄 문구. 처음엔 흑백이고, 로딩이 진행되는 만큼 왼쪽부터 색이 차오릅니다.
// 내가 먹는 영양제 그림이 더 자주 나오고, 바로 전에 본 그림은 다시 나오지 않게 합니다.
// 화면을 누르면 바로 넘어갑니다.

type LoadingScreenProps = {
  supplements: Supplement[];
  onDone: () => void;
};

const SHOW_MS = 3000; // 0% → 100%
const FADE_MS = 350;
const LAST_ART_KEY = "lastLoadingArt";
const MINE_CHANCE = 0.75; // 내가 먹는 영양제 그림을 고를 확률

function choose(supplements: Supplement[]): { art: LoadingArt; mine: boolean } {
  const mineKeys = new Set(supplements.flatMap((item) => detectIngredients(item.name)));
  const mine = LOADING_ART.filter((art) => mineKeys.has(art.key));
  const others = LOADING_ART.filter((art) => !mineKeys.has(art.key));

  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST_ART_KEY);
  } catch {
    // 읽지 못해도 고를 수 있습니다.
  }

  const pool = mine.length > 0 && (others.length === 0 || Math.random() < MINE_CHANCE) ? mine : others;
  const candidates = pool.filter((art) => art.key !== last);
  const list = candidates.length > 0 ? candidates : LOADING_ART.filter((art) => art.key !== last);
  const art = list[Math.floor(Math.random() * list.length)] ?? LOADING_ART[0];
  return { art, mine: mineKeys.has(art.key) };
}

export default function LoadingScreen({ supplements, onDone }: LoadingScreenProps) {
  // 로딩 화면이 떠 있는 동안 그림이 바뀌지 않게 처음 고른 그림으로 고정
  const [{ art, mine }] = useState(() => choose(supplements));
  const [progress, setProgress] = useState(0); // 0~100
  const [leaving, setLeaving] = useState(false);

  // 실제로 보여준 그림을 기억해 다음에는 다른 그림이 나오게
  useEffect(() => {
    try {
      localStorage.setItem(LAST_ART_KEY, art.key);
    } catch {
      // 저장하지 못해도 화면은 그대로 보여줍니다.
    }
  }, [art.key]);

  // 진행률: 3초 동안 0 → 100 (처음엔 빠르게, 끝에서 천천히)
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SHOW_MS);
      setProgress(Math.round((1 - (1 - t) ** 2) * 100));
      if (t < 1) frame = requestAnimationFrame(tick);
      else setLeaving(true);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const doneTimer = window.setTimeout(onDone, FADE_MS);
    return () => window.clearTimeout(doneTimer);
  }, [leaving, onDone]);

  const skip = () => {
    setProgress(100);
    setLeaving(true);
  };

  return (
    <div
      className={`loading-screen ${leaving ? "leaving" : ""}`}
      role="status"
      aria-label={`${art.key}: ${art.caption}. 로딩 ${progress}%`}
      onClick={skip}
    >
      <div className="loading-brand">Fit Vita</div>

      <div className="loading-art">
        {/* 흑백 그림 위에 같은 그림을 색으로 겹치고, 진행률만큼 왼쪽부터 보이게 */}
        <svg className="loading-art-gray" viewBox="0 0 240 240" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art.svg }} />
        <div className="loading-art-color" style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}>
          <svg viewBox="0 0 240 240" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art.svg }} />
        </div>
      </div>

      <div className="loading-chips">
        <span className="loading-ingredient">{art.key}</span>
        {mine && <span className="loading-mine">내가 먹는 영양제</span>}
      </div>
      <p className="loading-caption">{art.caption}</p>

      <div className="loading-percent">{progress}%</div>
    </div>
  );
}
