// 영양제 라벨 사진으로 등록하기
// 휴대폰 카메라(또는 앨범)로 찍은 성분표 사진을 AI가 읽어 이름·1회 섭취량·총 개수·성분 함량을 채웁니다.
// 사진은 휴대폰에서 작게 줄인 뒤 보내고, 앱에는 읽은 글자만 저장합니다. (사진 자체는 저장하지 않음)

import type { LabelIngredient } from "../components/Home";
import { getOpenAI, hasOpenAIKey } from "./openaiClient";

export type LabelScan = {
  name: string; // 앱에 표시할 짧은 이름 (예: 비타민D3 5000IU)
  dose: string; // 1일 섭취량 (예: 1정, 2캡슐)
  totalCount: number | null; // 한 통에 든 개수 → 잔여량
  ingredients: LabelIngredient[]; // 1일 섭취량 기준 함량
};

export class LabelScanError extends Error {}

const MAX_SIDE = 1280; // 긴 변 기준 (성분표 글자가 읽힐 정도)

// 사진을 줄이고 JPEG로 바꿔 data URL로 (iPhone HEIC도 브라우저가 열 수 있으면 변환됨)
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new LabelScanError("사진을 열지 못했어요. 다른 사진으로 시도해 주세요."));
      img.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const PROMPT = `사진은 건강기능식품(영양제) 포장이나 성분표(영양·기능정보)입니다. 읽은 내용을 JSON으로만 반환하세요.
형식: {"isLabel":true,"name":"비타민D3 5000IU","dose":"1정","totalCount":90,"ingredients":[{"name":"비타민D","amount":125,"unit":"µg"}]}
- isLabel: 영양제 포장·성분표가 아니면 false
- name: 앱에 보여줄 짧은 이름. 브랜드는 빼고, 주성분 이름을 한국어로 꼭 넣으세요(예: 비타민D3, 마그네슘, 오메가3, 종합비타민, 유산균, 루테인). 주성분이 하나면 함량도 붙이세요(예: "마그네슘 350mg"). 여러 성분이 든 종합 제품은 "종합비타민"처럼.
- dose: 1일 섭취량과 단위(정·캡슐·포·ml 등). 예: "1정", "2캡슐". 모르면 "1정"
- totalCount: 한 통에 든 개수(숫자). 모르면 null
- ingredients: 영양·기능정보 표의 성분별 1일 섭취량 기준 함량. 성분 이름은 한국어 일반명(비타민D, 비타민C, 아연, 마그네슘, 칼슘, 철분, 엽산, 오메가3(EPA 및 DHA 합), 루테인, 비오틴 등), amount는 숫자, unit은 표에 적힌 단위 그대로(mg, µg, IU, 억 CFU 등). %영양성분기준치는 넣지 마세요.
- 글자가 안 보이면 지어내지 말고 빈 값으로 두세요.`;

export async function scanLabel(file: File): Promise<LabelScan> {
  if (!hasOpenAIKey) {
    throw new LabelScanError("사진 분석은 AI 연결이 필요해요. 지금은 직접 입력해 주세요.");
  }
  const image = await shrink(file);

  let content: string;
  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "이 영양제 라벨을 읽어 주세요." },
            { type: "image_url", image_url: { url: image, detail: "high" } },
          ],
        },
      ],
    });
    content = response.choices[0].message.content ?? "";
  } catch (error) {
    console.error("라벨 분석 오류:", error);
    throw new LabelScanError("라벨을 읽지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  let parsed: {
    isLabel?: boolean;
    name?: string;
    dose?: string;
    totalCount?: number | null;
    ingredients?: { name?: string; amount?: number | string; unit?: string }[];
  };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new LabelScanError("라벨을 읽지 못했어요. 다시 찍어 주세요.");
  }
  if (parsed.isLabel === false || !parsed.name) {
    throw new LabelScanError("영양제 라벨을 찾지 못했어요. 성분표가 잘 보이게 다시 찍어 주세요.");
  }

  const ingredients = (parsed.ingredients ?? [])
    .map((item) => ({
      name: String(item.name ?? "").trim(),
      amount: Number(String(item.amount ?? "").replace(/,/g, "")),
      unit: String(item.unit ?? "").trim(),
    }))
    .filter((item) => item.name && Number.isFinite(item.amount) && item.amount > 0 && item.unit);

  const totalCount = Number(parsed.totalCount);
  return {
    name: parsed.name.trim(),
    dose: parsed.dose?.trim() || "1정",
    totalCount: Number.isFinite(totalCount) && totalCount > 0 ? Math.floor(totalCount) : null,
    ingredients,
  };
}
