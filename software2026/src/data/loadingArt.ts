// 로딩 화면 일러스트 8장 (viewBox 0 0 240 240)
// 앱을 열 때마다 한 장을 골라, 흑백 그림 위로 로딩 진행만큼 왼쪽부터 색이 차오르게 보여줍니다.
// 문구는 식약처 인정 기능성 표현을 따릅니다. (그림은 코드로 그린 SVG라 따로 이미지 파일이 없어요)

export type LoadingArt = {
  key: string; // 성분 이름 (복용 중인 영양제와 맞추는 데 사용)
  caption: string; // 한 줄 문구
  svg: string; // <svg> 안쪽 내용
};

export const LOADING_ART: LoadingArt[] = [
  {
    key: "종합비타민",
    caption: "놓치기 쉬운 영양소를 한 번에",
    svg: `
      <circle cx="120" cy="124" r="96" fill="#fff4d6"/>
      <!-- 캡슐 -->
      <g transform="translate(70 70) rotate(-35)">
        <rect x="0" y="0" width="70" height="30" rx="15" fill="#ff8a3d"/>
        <rect x="35" y="0" width="35" height="30" rx="15" fill="#fff"/>
        <rect x="35" y="0" width="12" height="30" fill="#fff"/>
        <rect x="6" y="5" width="22" height="6" rx="3" fill="#fff" opacity=".55"/>
        <rect x="0" y="0" width="70" height="30" rx="15" fill="none" stroke="#e46a1c" stroke-width="2"/>
      </g>
      <!-- 둥근 알약 -->
      <circle cx="150" cy="96" r="24" fill="#ffd23f" stroke="#e8b10f" stroke-width="2"/>
      <rect x="132" y="94" width="36" height="4" rx="2" fill="#e8b10f"/>
      <circle cx="142" cy="86" r="5" fill="#fff" opacity=".6"/>
      <!-- 타원 알약 -->
      <g transform="translate(150 148) rotate(20)">
        <ellipse cx="0" cy="0" rx="30" ry="17" fill="#5cc46a" stroke="#3a9c48" stroke-width="2"/>
        <ellipse cx="-10" cy="-6" rx="9" ry="3.5" fill="#fff" opacity=".55"/>
      </g>
      <!-- 소프트젤 -->
      <g transform="translate(88 150) rotate(-15)">
        <ellipse cx="0" cy="0" rx="24" ry="15" fill="#f7b928" stroke="#d99a0b" stroke-width="2"/>
        <ellipse cx="-8" cy="-5" rx="8" ry="3" fill="#fff" opacity=".7"/>
      </g>
      <!-- 반짝임 -->
      <path d="M190 58 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" fill="#ffb800"/>
      <path d="M52 112 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill="#ffb800"/>
    `,
  },
  {
    key: "비타민D",
    caption: "뼈를 만드는 데 필요해요",
    svg: `
      <circle cx="120" cy="124" r="96" fill="#fff1c9"/>
      <!-- 해 -->
      <g transform="translate(160 78)">
        ${Array.from({ length: 10 }, (_, i) => `<rect x="-3" y="-46" width="6" height="14" rx="3" fill="#ffb300" transform="rotate(${i * 36})"/>`).join("")}
        <circle r="28" fill="#ffc928"/>
        <circle r="28" fill="none" stroke="#ff9f00" stroke-width="3"/>
        <circle cx="-9" cy="-9" r="7" fill="#fff" opacity=".5"/>
      </g>
      <!-- 뼈 -->
      <g transform="translate(96 148) rotate(-30)">
        <rect x="-44" y="-11" width="88" height="22" rx="8" fill="#fffdf6" stroke="#d9c9a3" stroke-width="3"/>
        <circle cx="-46" cy="-13" r="14" fill="#fffdf6" stroke="#d9c9a3" stroke-width="3"/>
        <circle cx="-46" cy="13" r="14" fill="#fffdf6" stroke="#d9c9a3" stroke-width="3"/>
        <circle cx="46" cy="-13" r="14" fill="#fffdf6" stroke="#d9c9a3" stroke-width="3"/>
        <circle cx="46" cy="13" r="14" fill="#fffdf6" stroke="#d9c9a3" stroke-width="3"/>
        <rect x="-44" y="-8" width="88" height="16" fill="#fffdf6"/>
      </g>
      <!-- D 알약 -->
      <g transform="translate(160 160)">
        <circle r="20" fill="#ffb300" stroke="#e08e00" stroke-width="2"/>
        <text x="0" y="7" text-anchor="middle" font-size="20" font-weight="900" fill="#fff" font-family="Arial">D</text>
      </g>
    `,
  },
  {
    key: "오메가3",
    caption: "혈행 개선에 도움을 줄 수 있어요",
    svg: `
      <circle cx="120" cy="124" r="96" fill="#e3f1ff"/>
      <!-- 물결 -->
      <path d="M40 176 q20 -12 40 0 t40 0 t40 0 t40 0" fill="none" stroke="#9cc9f5" stroke-width="5" stroke-linecap="round"/>
      <!-- 물고기 -->
      <g transform="translate(108 118)">
        <path d="M-58 0 Q-20 -46 34 -8 L58 -30 L54 0 L58 30 L34 8 Q-20 46 -58 0 Z" fill="#3d8bfd"/>
        <path d="M-40 -6 Q-10 -30 24 -6" fill="none" stroke="#fff" stroke-width="3" opacity=".5" stroke-linecap="round"/>
        <circle cx="-34" cy="-6" r="6" fill="#fff"/>
        <circle cx="-34" cy="-6" r="3" fill="#0b2a52"/>
        <path d="M-14 -20 Q-4 0 -14 20" fill="none" stroke="#2a6fd6" stroke-width="3"/>
      </g>
      <!-- 하트 -->
      <path d="M176 78 c0 -12 -18 -16 -22 -2 c-4 -14 -22 -10 -22 2 c0 14 22 26 22 26 s22 -12 22 -26 z" fill="#ff5a6e"/>
      <!-- 기름 방울 -->
      <path d="M170 150 q14 18 0 26 q-14 -8 0 -26 z" fill="#f7b928" stroke="#d99a0b" stroke-width="2"/>
    `,
  },
  {
    key: "마그네슘",
    caption: "신경·근육 기능 유지에 필요해요",
    svg: `
      <circle cx="120" cy="124" r="96" fill="#ece6ff"/>
      <!-- 달 -->
      <path d="M150 50 a40 40 0 1 0 34 62 a32 32 0 1 1 -34 -62 z" fill="#ffd45c"/>
      <circle cx="74" cy="62" r="4" fill="#ffd45c"/>
      <circle cx="58" cy="94" r="3" fill="#ffd45c"/>
      <path d="M200 140 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill="#ffd45c"/>
      <!-- 아령(근육) -->
      <g transform="translate(104 156) rotate(-18)">
        <rect x="-40" y="-5" width="80" height="10" rx="5" fill="#b6a4f7"/>
        <rect x="-62" y="-26" width="16" height="52" rx="6" fill="#8b6cf0"/>
        <rect x="-48" y="-19" width="10" height="38" rx="4" fill="#7655e6"/>
        <rect x="46" y="-26" width="16" height="52" rx="6" fill="#8b6cf0"/>
        <rect x="38" y="-19" width="10" height="38" rx="4" fill="#7655e6"/>
        <rect x="-59" y="-22" width="4" height="30" rx="2" fill="#fff" opacity=".45"/>
        <rect x="49" y="-22" width="4" height="30" rx="2" fill="#fff" opacity=".45"/>
      </g>
      <text x="176" y="196" text-anchor="middle" font-size="18" font-weight="900" fill="#6a4bd6" font-family="Arial">Mg</text>
    `,
  },
  {
    key: "유산균",
    caption: "장 속 유익균을 늘려요",
    svg: `
      <circle cx="120" cy="124" r="96" fill="#e6f7e9"/>
      <circle cx="120" cy="124" r="66" fill="#fff" stroke="#bfe6c6" stroke-width="4"/>
      <!-- 유익균들 -->
      <g transform="translate(96 104) rotate(-25)">
        <rect x="-24" y="-11" width="48" height="22" rx="11" fill="#4fc36b"/>
        <circle cx="-6" cy="-2" r="2.5" fill="#0d3b1a"/><circle cx="6" cy="-2" r="2.5" fill="#0d3b1a"/>
        <path d="M-5 4 q5 4 10 0" fill="none" stroke="#0d3b1a" stroke-width="2" stroke-linecap="round"/>
      </g>
      <g transform="translate(146 118) rotate(30)">
        <rect x="-20" y="-10" width="40" height="20" rx="10" fill="#ffb74d"/>
        <circle cx="-5" cy="-2" r="2.3" fill="#4a2a00"/><circle cx="5" cy="-2" r="2.3" fill="#4a2a00"/>
        <path d="M-4 4 q4 3 8 0" fill="none" stroke="#4a2a00" stroke-width="2" stroke-linecap="round"/>
      </g>
      <g transform="translate(114 152)">
        <circle r="15" fill="#7cc7ff"/>
        <circle cx="-5" cy="-3" r="2.3" fill="#0b2a52"/><circle cx="5" cy="-3" r="2.3" fill="#0b2a52"/>
        <path d="M-4 3 q4 3 8 0" fill="none" stroke="#0b2a52" stroke-width="2" stroke-linecap="round"/>
      </g>
      <circle cx="156" cy="156" r="7" fill="#4fc36b" opacity=".6"/>
      <circle cx="80" cy="140" r="5" fill="#ffb74d" opacity=".7"/>
      <circle cx="140" cy="84" r="5" fill="#7cc7ff" opacity=".7"/>
    `,
  },
  {
    key: "비타민C",
    caption: "정상적인 면역 기능에 필요해요",
    svg: `
      <circle cx="120" cy="124" r="96" fill="#ffe9d6"/>
      <!-- 방패 -->
      <path d="M150 58 L196 74 L196 112 Q196 150 150 170 Q104 150 104 112 L104 74 Z" fill="#39b36b"/>
      <path d="M150 58 L150 170 Q104 150 104 112 L104 74 Z" fill="#2f9a5a"/>
      <path d="M132 112 l12 13 l24 -26" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- 오렌지 단면 -->
      <g transform="translate(86 150)">
        <circle r="44" fill="#ff9a1f"/>
        <circle r="37" fill="#ffd27a"/>
        ${Array.from({ length: 8 }, (_, i) => `<path d="M0 0 L${(Math.cos((i * Math.PI) / 4) * 33).toFixed(1)} ${(Math.sin((i * Math.PI) / 4) * 33).toFixed(1)} A33 33 0 0 1 ${(Math.cos(((i + 1) * Math.PI) / 4) * 33).toFixed(1)} ${(Math.sin(((i + 1) * Math.PI) / 4) * 33).toFixed(1)} Z" fill="#ffb238" stroke="#ffe7b8" stroke-width="3"/>`).join("")}
        <circle r="5" fill="#ffe7b8"/>
      </g>
    `,
  },
  {
    key: "루테인",
    caption: "황반 색소 밀도 유지에 도움",
    svg: `
      <circle cx="120" cy="124" r="96" fill="#e9f8ee"/>
      <!-- 눈 -->
      <path d="M38 118 Q120 40 202 118 Q120 196 38 118 Z" fill="#fff" stroke="#1f3b2b" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="120" cy="118" r="34" fill="#4caf50"/>
      <circle cx="120" cy="118" r="34" fill="none" stroke="#2e7d32" stroke-width="3"/>
      <circle cx="120" cy="118" r="15" fill="#10241a"/>
      <circle cx="109" cy="106" r="7" fill="#fff"/>
      ${[-40, -20, 0, 20, 40].map((dx) => `<line x1="${120 + dx}" y1="${70 + Math.abs(dx) * 0.35}" x2="${120 + dx * 1.15}" y2="${54 + Math.abs(dx) * 0.4}" stroke="#1f3b2b" stroke-width="4" stroke-linecap="round"/>`).join("")}
      <!-- 마리골드 꽃 -->
      <g transform="translate(184 176)">
        ${Array.from({ length: 10 }, (_, i) => `<ellipse cx="0" cy="-13" rx="6" ry="10" fill="#ffb300" transform="rotate(${i * 36})"/>`).join("")}
        <circle r="8" fill="#ff8f00"/>
      </g>
    `,
  },
  {
    key: "철분",
    caption: "산소를 나르는 데 필요해요",
    svg: `
      <circle cx="120" cy="124" r="96" fill="#ffe4e6"/>
      <!-- 혈액 방울 -->
      <path d="M110 40 Q160 104 160 136 A50 50 0 0 1 60 136 Q60 104 110 40 Z" fill="#ef4459"/>
      <path d="M110 40 Q160 104 160 136 A50 50 0 0 1 110 186 Z" fill="#d93349"/>
      <path d="M82 122 Q84 104 96 90" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".55"/>
      <!-- 산소 방울 -->
      <g font-family="Arial" font-weight="900" text-anchor="middle">
        <circle cx="178" cy="92" r="20" fill="#fff" stroke="#7cc7ff" stroke-width="4"/>
        <text x="178" y="98" font-size="16" fill="#2a7fd4">O₂</text>
        <circle cx="190" cy="148" r="14" fill="#fff" stroke="#7cc7ff" stroke-width="3"/>
        <text x="190" y="153" font-size="12" fill="#2a7fd4">O₂</text>
      </g>
      <circle cx="160" cy="186" r="7" fill="#fff" stroke="#7cc7ff" stroke-width="3"/>
    `,
  },
];
