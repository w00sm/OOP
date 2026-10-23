import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, TriangleAlert, X } from "lucide-react";
import type { Supplement, TimeCategory } from "./Home";
import {
  hasRxSearch,
  loadDrugDetail,
  loadDrugs,
  searchDrugs,
  type DrugEntry,
} from "../services/drugService";
import {
  MED_KIND_LABELS,
  MED_TIMINGS,
  efficacyLabel,
  groupHits,
  shortMedName,
  type Medication,
  type MedTiming,
} from "../services/medicationService";
import { separateFromMedications } from "../services/scheduleService";
import ClearableInput from "./common/ClearableInput";

// 마이페이지 → 복용 중인 약 → 추가 시트
// 공공데이터에서 약을 검색해 고르고(또는 직접 입력), 시간대·복용 방법을 정하면
// 설명서에서 찾은 영양제 주의 성분과 옮겨질 영양제를 미리 보여줍니다.

type KindFilter = "all" | "rx" | "otc";

type MedicationSheetProps = {
  supplements: Supplement[];
  medications: Medication[];
  onClose: () => void;
  onSubmit: (medication: Medication) => void;
};

const SLOTS: TimeCategory[] = ["아침", "점심", "저녁"];

export default function MedicationSheet({
  supplements,
  medications,
  onClose,
  onSubmit,
}: MedicationSheetProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [results, setResults] = useState<DrugEntry[]>([]);
  const [drugCount, setDrugCount] = useState<number | null>(null); // 받아 온 의약품 수 (0이면 직접 입력만)
  const [selected, setSelected] = useState<DrugEntry | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [slots, setSlots] = useState<TimeCategory[]>(["아침"]);
  const [timing, setTiming] = useState<MedTiming>("식후");
  const [dose, setDose] = useState("1정");
  const [until, setUntil] = useState("");
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [rxError, setRxError] = useState(false); // 처방약 검색 실패
  // 처방약을 고르면 설명서를 불러오는 중 / 실패
  const [detailState, setDetailState] = useState<"idle" | "loading" | "failed" | "noLeaflet">("idle");

  useEffect(() => {
    loadDrugs().then((drugs) => setDrugCount(drugs.length));
  }, []);

  // 입력이 멈추면 검색 (처방약은 서버에서 찾으니 조금 더 기다렸다가)
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      searchDrugs(query, kind).then(({ drugs, rxError: failed }) => {
        if (cancelled) return;
        setResults(drugs);
        setRxError(failed);
        setSearching(false);
      });
    }, kind === "otc" ? 150 : 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, kind]);

  const draft: Medication | null = useMemo(() => {
    const name = customMode ? customName.trim() : selected?.n;
    if (!name) return null;
    return {
      id: 0, // 등록할 때 정함
      itemSeq: customMode ? undefined : selected?.s,
      name,
      company: customMode ? undefined : selected?.c,
      kind: customMode ? "custom" : (selected?.k ?? "otc"),
      efficacy: customMode ? undefined : efficacyLabel(selected?.e),
      slots: timing === "필요시" ? [] : slots,
      timing,
      dose: dose.trim() || "1정",
      until: until || undefined,
      hits: customMode ? [] : (selected?.h ?? []),
    };
  }, [customMode, customName, selected, slots, timing, dose, until]);

  // 등록하면 옮겨질 영양제 미리보기
  const preview = useMemo(
    () => (draft ? separateFromMedications(supplements, [...medications, draft]) : null),
    [draft, supplements, medications]
  );

  const toggleSlot = (slot: TimeCategory) => {
    setError("");
    setSlots((prev) =>
      prev.includes(slot) ? prev.filter((item) => item !== slot) : [...prev, slot]
    );
  };

  const choose = (drug: DrugEntry) => {
    setSelected(drug);
    setCustomMode(false);
    setError("");
    setDetailState("idle");
    if (!drug.remote) return;
    // 처방약: 사용상의 주의사항에서 영양제 주의 성분을 찾아 옴
    setDetailState("loading");
    loadDrugDetail(drug.s)
      .then(({ noLeaflet, e, h }) => {
        setSelected((prev) =>
          prev?.s === drug.s ? { ...prev, e: e || prev.e, h, remote: false } : prev
        );
        setDetailState(noLeaflet ? "noLeaflet" : "idle");
      })
      .catch(() => setDetailState("failed"));
  };

  const submit = () => {
    if (detailState === "loading") return;
    if (!draft) {
      setError(customMode ? "약 이름을 입력해주세요." : "약을 검색해서 선택해주세요.");
      return;
    }
    if (draft.timing !== "필요시" && draft.slots.length === 0) {
      setError("언제 드시는지 시간대를 하나 이상 골라주세요.");
      return;
    }
    onSubmit({ ...draft, id: Date.now() });
  };

  // 처방약 검색을 못 쓰는 경우 (중계 서버 주소가 없는 개발 환경)
  const showRxPending = kind === "rx" && !hasRxSearch && query.trim() !== "";
  const rxTooShort = kind === "rx" && hasRxSearch && query.trim().length === 1;

  return (
    <div className="survey-overlay" role="dialog" aria-modal="true" aria-label="복용 중인 약 추가">
      <div className="survey-card med-sheet">
        <div className="med-sheet-head">
          <strong>복용 중인 약 추가</strong>
          <button type="button" className="med-sheet-x" aria-label="닫기" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {!customMode && (
          <>
            <div className="med-search">
              <Search size={18} />
              <input
                value={query}
                autoFocus
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError("");
                }}
                placeholder="약 이름을 검색하세요 (예: 타이레놀)"
              />
              {query && (
                <button type="button" aria-label="검색어 지우기" onClick={() => setQuery("")}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="med-kind-tabs">
              {(["all", "rx", "otc"] as KindFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={kind === value ? "active" : ""}
                  onClick={() => setKind(value)}
                >
                  {value === "all" ? "전체" : value === "rx" ? "처방약" : "일반약"}
                </button>
              ))}
            </div>

            <div className="med-results">
              {drugCount === 0 && !hasRxSearch && (
                <p className="med-results-empty">
                  의약품 목록을 불러오지 못했어요. 아래 '직접 입력하기'로 등록해 주세요.
                </p>
              )}
              {showRxPending && (
                <p className="med-results-empty">
                  처방약 검색을 쓸 수 없어요. '직접 입력하기'로 등록해 주세요.
                </p>
              )}
              {rxError && (
                <p className="med-results-empty">
                  처방약 정보를 불러오지 못했어요. 잠시 후 다시 검색하거나 직접 입력해 주세요.
                </p>
              )}
              {rxTooShort && <p className="med-results-empty">처방약은 두 글자 이상 입력해 주세요.</p>}
              {searching && results.length === 0 && query.trim().length >= 2 && (
                <p className="med-results-empty">찾는 중…</p>
              )}
              {results.map((drug) => (
                <button
                  type="button"
                  key={drug.s}
                  className={`med-result ${selected?.s === drug.s ? "selected" : ""}`}
                  onClick={() => choose(drug)}
                >
                  <span className="med-result-name">
                    {shortMedName(drug.n)}
                    <span className={`med-badge ${drug.k}`}>{MED_KIND_LABELS[drug.k]}</span>
                  </span>
                  <small>
                    {drug.c}
                    {drug.e ? ` · ${efficacyLabel(drug.e)}` : ""}
                  </small>
                </button>
              ))}
              {query.trim() !== "" && !searching && drugCount !== 0 && results.length === 0 &&
                !showRxPending && !rxError && !rxTooShort && (
                <p className="med-results-empty">검색 결과가 없어요.</p>
              )}
              <button
                type="button"
                className="med-result custom"
                onClick={() => {
                  setCustomMode(true);
                  setCustomName(query);
                  setSelected(null);
                  setError("");
                }}
              >
                찾는 약이 없나요? <b>직접 입력하기</b> <ChevronRight size={14} />
              </button>
            </div>
          </>
        )}

        {customMode && (
          <div className="med-custom">
            <ClearableInput
              onClear={() => setCustomName("")}
              value={customName}
              autoFocus
              onChange={(e) => {
                setCustomName(e.target.value);
                setError("");
              }}
              placeholder="약 이름 (예: 병원에서 받은 약)"
            />
            <p>직접 입력한 약은 설명서 정보가 없어 영양제 주의 성분을 찾을 수 없어요.</p>
            <button type="button" onClick={() => setCustomMode(false)}>
              ‹ 다시 검색하기
            </button>
          </div>
        )}

        <div className="med-label">언제 드세요? <small>여러 개 고를 수 있어요</small></div>
        <div className="med-seg three">
          {SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              disabled={timing === "필요시"}
              className={timing !== "필요시" && slots.includes(slot) ? "active" : ""}
              onClick={() => toggleSlot(slot)}
            >
              {slot}
            </button>
          ))}
        </div>

        <div className="med-label">복용 방법</div>
        <div className="med-seg four">
          {MED_TIMINGS.map((value) => (
            <button
              key={value}
              type="button"
              className={timing === value ? "active green" : ""}
              onClick={() => {
                setTiming(value);
                setError("");
              }}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="med-inline-fields">
          <label>
            1회 복용량
            <ClearableInput onClear={() => setDose("")} value={dose} onChange={(e) => setDose(e.target.value)} placeholder="1정" />
          </label>
          <label>
            언제까지 <small>(선택)</small>
            <ClearableInput onClear={() => setUntil("")} type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </label>
        </div>

        {draft && draft.hits.length > 0 && (
          <div className="med-found">
            <strong>
              <TriangleAlert size={14} /> 설명서에서 찾은 영양제 주의 성분
            </strong>
            <ul>
              {groupHits(draft.hits).map((group) => (
                <li key={group.names}>
                  <b>{group.names}</b> · {group.gap}시간 이상 간격
                  <span>{group.text}</span>
                </li>
              ))}
            </ul>
            {draft.timing === "필요시" ? (
              <p>필요할 때 드시는 약은 영양제 시간을 옮기지 않아요. 홈에서 먹었다고 체크하면 간격이 필요한 영양제와 먹어도 되는 시각을 알려드려요.</p>
            ) : preview && preview.moved.length > 0 ? (
              <p>
                → 겹치는 영양제가 있어요. 등록할 때 시간을 옮길지 물어볼게요:{" "}
                <b>{preview.moved.map((item) => `${item.name} ${item.from} → ${item.to}`).join(", ")}</b>
              </p>
            ) : (
              <p>지금 복용 중인 영양제 중 시간이 겹치는 건 없어요.</p>
            )}
          </div>
        )}

        {detailState === "loading" && (
          <p className="med-found-none">설명서에서 영양제 주의 성분을 확인하는 중…</p>
        )}
        {detailState === "failed" && (
          <p className="med-found-none">설명서를 불러오지 못해 영양제 주의 성분은 확인하지 못했어요.</p>
        )}
        {detailState === "noLeaflet" && (
          <p className="med-found-none">
            지금은 식약처에서 이 약의 설명서를 받을 수 없어 영양제 주의 성분을 확인하지 못했어요. 나중에
            다시 등록하면 확인할 수 있어요.
          </p>
        )}
        {draft && draft.hits.length === 0 && !customMode && detailState === "idle" && (
          <p className="med-found-none">설명서에서 영양제 주의 성분은 찾지 못했어요.</p>
        )}

        {error && <p className="med-error">{error}</p>}

        <button
          type="button"
          className="med-submit"
          disabled={detailState === "loading"}
          onClick={submit}
        >
          {detailState === "loading" ? "설명서 확인 중…" : "등록하기"}
        </button>
        <p className="med-source">
          식품의약품안전처 의약품개요정보(e약은요)·의약품 제품 허가정보 기준 안내예요. 정확한 복용법은 의사·약사와 상담하세요.
        </p>
      </div>
    </div>
  );
}
