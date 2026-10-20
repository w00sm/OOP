// 성분별 유튜브 영상 (홈 → 오늘의 영양 카드 마지막 장)
// 영상 주소가 https://www.youtube.com/watch?v=AbCdEf12345 이면 id는 "AbCdEf12345" 입니다.
// 약사·의사 채널이나 식약처 공식 채널처럼 믿을 만한 영상만 넣어 주세요.
// 영상이 없는 성분은 "유튜브에서 영상 보기" 버튼으로 유튜브 검색 결과를 엽니다.

export type IngredientVideo = {
  id: string; // 유튜브 영상 ID
  title: string;
  channel: string;
};

export const INGREDIENT_VIDEOS: Record<string, IngredientVideo[]> = {
  // 예시) 마그네슘: [{ id: "AbCdEf12345", title: "마그네슘, 언제 먹어야 할까?", channel: "OO약사" }],
};
