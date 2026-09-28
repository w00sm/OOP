import { useState } from "react";
import { ClipboardCheck, X } from "lucide-react";
import type { Supplement } from "./Home";
import {
  CHANGE_OPTIONS,
  DISCOMFORT_OPTIONS,
  EFFECT_OPTIONS,
  NEXT_OPTIONS,
  VERDICT_LABELS,
  recommendAfterSurvey,
  saveSurvey,
  type SurveyAction,
  type SurveySubject,
  type SurveyAnswers,
  type SurveyResult,
} from "../services/surveyService";
import { josa } from "../utils/josa";
import "./SurveyModal.css";

type SurveyModalProps = {
  subject: SurveySubject; // 설문할 복용 내역
  supplements: Supplement[]; // 지금 복용 관리 중인 영양제 (다른 성분 추천 시 이미 충분히 먹는 성분 제외)
  savedResult?: SurveyResult; // 이미 설문했다면 결과부터 보여줌
  onClose: () => void;
  onAction: (action: SurveyAction) => void;
};

export default function SurveyModal({
  subject,
  supplements,
  savedResult,
  onClose,
  onAction,
}: SurveyModalProps) {
  const [effect, setEffect] = useState<SurveyAnswers["effect"] | null>(null);
  const [changes, setChanges] = useState<string[]>([]);
  const [discomfort, setDiscomfort] = useState<SurveyAnswers["discomfort"] | null>(null);
  const [next, setNext] = useState<SurveyAnswers["next"] | null>(null);
  const [result, setResult] = useState<SurveyResult | null>(savedResult ?? null);

  const canSubmit = effect !== null && discomfort !== null && next !== null;

  const toggleChange = (change: string) =>
    setChanges((prev) =>
      prev.includes(change) ? prev.filter((item) => item !== change) : [...prev, change]
    );

  const submit = () => {
    if (!canSubmit) return;
    const answers: SurveyAnswers = { effect, changes, discomfort, next };
    const outcome = recommendAfterSurvey(subject, answers, supplements);
    saveSurvey(subject, answers, outcome);
    setResult(outcome);
  };

  return (
    <div className="survey-overlay" role="dialog" aria-modal="true" aria-label="영양제 설문">
      <div className="survey-card">
        <button type="button" className="survey-close" aria-label="닫기" onClick={onClose}>
          <X size={20} />
        </button>

        {!result ? (
          <>
            <div className="survey-head">
              <ClipboardCheck size={22} />
              <div>
                <h2>{josa(subject.name, "은/는")} 어떠셨나요?</h2>
                <p>1분이면 끝나요. 답변으로 재구매가 필요한지 판단해 드려요.</p>
              </div>
            </div>

            <fieldset className="survey-question">
              <legend>1. 효과를 느끼셨나요?</legend>
              <div className="survey-options">
                {EFFECT_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={effect === option.value ? "selected" : ""}
                    onClick={() => setEffect(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="survey-question">
              <legend>
                2. 어떤 변화가 있었나요? <span>(여러 개 선택)</span>
              </legend>
              <div className="survey-options chips">
                {CHANGE_OPTIONS.map((change) => (
                  <button
                    type="button"
                    key={change}
                    className={changes.includes(change) ? "selected" : ""}
                    onClick={() => toggleChange(change)}
                  >
                    {change}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="survey-question">
              <legend>3. 불편한 점은 없었나요?</legend>
              <div className="survey-options">
                {DISCOMFORT_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={discomfort === option.value ? "selected" : ""}
                    onClick={() => setDiscomfort(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="survey-question">
              <legend>4. 앞으로 어떻게 하실 건가요?</legend>
              <div className="survey-options">
                {NEXT_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={next === option.value ? "selected" : ""}
                    onClick={() => setNext(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              className="survey-submit"
              disabled={!canSubmit}
              onClick={submit}
            >
              {canSubmit ? "결과 보기" : "1, 3, 4번에 답해주세요"}
            </button>
          </>
        ) : (
          <div className="survey-result">
            <span className={`survey-verdict ${result.verdict}`}>
              {VERDICT_LABELS[result.verdict]}
            </span>
            <h2>{result.title}</h2>
            <p>{result.message}</p>
            <div className="survey-actions">
              {result.actions.map((action) => (
                <button
                  type="button"
                  key={action.label}
                  className={`survey-action ${action.kind}`}
                  onClick={() => onAction(action)}
                >
                  {action.label}
                </button>
              ))}
              <button type="button" className="survey-action later" onClick={() => setResult(null)}>
                다시 설문하기
              </button>
              <button type="button" className="survey-action later" onClick={onClose}>
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
