import { useMemo, useRef, useState } from "react";
import {
  AlarmClock,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Pill,
  Play,
  Scale,
  Sparkles,
  ThumbsUp,
  X,
} from "lucide-react";
import type { Supplement } from "./Home";
import type { Medication } from "../services/medicationService";
import {
  buildCardNews,
  hideCardToday,
  pickTodayIngredient,
  type CardSlide,
} from "../services/cardNewsService";
import { josa } from "../utils/josa";
import "./NutritionCard.css";

// 홈 → 오늘의 영양 카드 (옆으로 넘기는 카드뉴스, 마지막 장은 영상)
// 오른쪽 위 X를 누르면 오늘은 숨기고, 내일 다른 성분 카드로 다시 보여줍니다.

type NutritionCardProps = {
  supplements: Supplement[];
  medications: Medication[];
  onHide: () => void;
};

export default function NutritionCard({ supplements, medications, onHide }: NutritionCardProps) {
  const ingredient = pickTodayIngredient(supplements);
  const card = useMemo(
    () => buildCardNews(ingredient, supplements, medications),
    [ingredient, supplements, medications]
  );
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null); // 재생 중인 영상 ID
  const trackRef = useRef<HTMLDivElement>(null);
  const total = card.slides.length;

  const goTo = (next: number) => {
    const track = trackRef.current;
    if (!track) return;
    const target = Math.max(0, Math.min(total - 1, next));
    track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.round(track.scrollLeft / track.clientWidth);
    if (next !== index) {
      setIndex(next);
      setPlaying(null); // 다른 장으로 넘기면 영상 정지
    }
  };

  const hide = () => {
    hideCardToday();
    onHide();
  };

  const [from, to] = card.colors;

  return (
    <section className="nc" aria-label={`오늘의 영양 카드: ${ingredient}`}>
      <div className="nc-frame" style={{ "--nc-from": from, "--nc-to": to } as React.CSSProperties}>
        <div className="nc-track" ref={trackRef} onScroll={onScroll}>
          {card.slides.map((slide, i) => (
            <div className="nc-slide" key={`${ingredient}-${slide.kind}`} aria-hidden={i !== index}>
              <SlideBody
                slide={slide}
                ingredient={ingredient}
                playing={playing}
                onPlay={setPlaying}
              />
            </div>
          ))}
        </div>

        <button type="button" className="nc-close" aria-label="오늘의 영양 카드 닫기" onClick={hide}>
          <X size={16} />
        </button>
        <span className="nc-count">
          {index + 1} / {total}
        </span>
        {index > 0 && (
          <button type="button" className="nc-arrow left" aria-label="이전 카드" onClick={() => goTo(index - 1)}>
            <ChevronLeft size={18} />
          </button>
        )}
        {index < total - 1 && (
          <button type="button" className="nc-arrow right" aria-label="다음 카드" onClick={() => goTo(index + 1)}>
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      <div className="nc-dots" aria-hidden="true">
        {card.slides.map((slide, i) => (
          <span key={slide.kind} className={i === index ? "active" : ""} />
        ))}
      </div>
    </section>
  );
}

function SlideBody({
  slide,
  ingredient,
  playing,
  onPlay,
}: {
  slide: CardSlide;
  ingredient: string;
  playing: string | null;
  onPlay: (id: string) => void;
}) {
  switch (slide.kind) {
    case "cover":
      return (
        <div className="nc-cover">
          <span className="nc-label">
            <Sparkles size={13} /> 오늘의 영양 카드
          </span>
          <h3>{ingredient}</h3>
          <p>{slide.hook}</p>
          {slide.mine && <span className="nc-mine">내가 먹는 영양제</span>}
          <span className="nc-swipe">옆으로 넘겨보세요 →</span>
          <span className="nc-bubble one" />
          <span className="nc-bubble two" />
        </div>
      );
    case "concerns":
      return (
        <div className="nc-page">
          <SlideTitle icon={<HeartPulse size={16} />}>이런 분께 좋아요</SlideTitle>
          <div className="nc-chips">
            {slide.items.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <p className="nc-sub">이런 고민이 있을 때 많이 찾는 성분이에요.</p>
        </div>
      );
    case "benefit":
      return (
        <div className="nc-page">
          <SlideTitle icon={<ThumbsUp size={16} />}>이런 점이 좋아요</SlideTitle>
          <p className="nc-big">{slide.text}</p>
          <p className="nc-source">식약처 인정 기능성 표현 기준</p>
        </div>
      );
    case "howto":
      return (
        <div className="nc-page">
          <SlideTitle icon={<AlarmClock size={16} />}>이렇게 드세요</SlideTitle>
          <p className="nc-big">
            <b>{slide.when}</b>
          </p>
          <p className="nc-sub">{slide.tip}</p>
          {slide.together.map((line) => (
            <p className="nc-pair good" key={line}>
              ＋ {line}
            </p>
          ))}
          {slide.apart.map((line) => (
            <p className="nc-pair apart" key={line}>
              ↔ {line} 2시간 간격
            </p>
          ))}
        </div>
      );
    case "amount":
      return (
        <div className="nc-page">
          <SlideTitle icon={<Scale size={16} />}>하루 얼마나?</SlideTitle>
          {slide.range && (
            <p className="nc-big">
              영양제로 <b>{slide.range}</b>
            </p>
          )}
          {slide.upper && <p className="nc-sub">하루 {josa(slide.upper, "을/를")} 넘기지 않는 게 좋아요.</p>}
          <p className="nc-sub">{slide.note}</p>
        </div>
      );
    case "caution":
      return (
        <div className="nc-page caution">
          <SlideTitle icon={<Pill size={16} />}>복용 중인 약과 함께라면</SlideTitle>
          {slide.lines.map((line) => (
            <p className="nc-sub" key={line}>
              {line}
            </p>
          ))}
          <p className="nc-source">함께 드셔도 되는지는 의사·약사와 상담하세요.</p>
        </div>
      );
    case "video": {
      const video = slide.videos[0];
      if (!video) {
        return (
          <div className="nc-page nc-video-empty">
            <SlideTitle icon={<Play size={16} />}>영상으로 더 알아보기</SlideTitle>
            <a className="nc-yt-button" href={slide.searchUrl} target="_blank" rel="noreferrer">
              <Play size={16} fill="currentColor" />
              유튜브에서 {ingredient} 영상 보기
            </a>
            <p className="nc-source">약사·의사 채널의 영상을 참고하세요.</p>
          </div>
        );
      }
      return (
        <div className="nc-video">
          {playing === video.id ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&playsinline=1&rel=0`}
              title={video.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button type="button" className="nc-thumb" onClick={() => onPlay(video.id)}>
              <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" loading="lazy" />
              <span className="nc-play">
                <Play size={22} fill="currentColor" />
              </span>
              <span className="nc-video-caption">
                <b>{video.title}</b>
                {video.channel}
              </span>
            </button>
          )}
        </div>
      );
    }
  }
}

function SlideTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="nc-title">
      <span className="nc-title-icon">{icon}</span>
      {children}
    </div>
  );
}
