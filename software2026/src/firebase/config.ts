// Firebase 설정
// firebaseConfig와 VAPID 공개 키는 비밀번호가 아니라 공개용 식별자라 코드에 넣어도 됩니다.
// (보안은 firestore.rules로 지킵니다. 서비스 계정 키는 절대 여기에 넣지 마세요)
//
// 값 확인 위치
// - firebaseConfig: Firebase 콘솔 → ⚙️ 프로젝트 설정 → 일반 → 내 앱 → SDK 설정 및 구성(npm)
// - VAPID_KEY: 프로젝트 설정 → 클라우드 메시징 → 웹 구성 → 웹 푸시 인증서 → 키 쌍

export const firebaseConfig = {
  apiKey: "AIzaSyDNMiZD74aDei-z19FQqHXVArbw9gmU9j0",
  authDomain: "fit-vita-e9160.firebaseapp.com",
  projectId: "fit-vita-e9160",
  storageBucket: "fit-vita-e9160.firebasestorage.app",
  messagingSenderId: "669654006711",
  appId: "1:669654006711:web:b2ff2013ad119c82910632",
  measurementId: "G-BZ3EDQNCR6",
};

export const VAPID_KEY =
  "BGjXe6OUua2EYWuu0ek6bA8TH75b-vQBhF4Tkq9TNOr9g11Ku8Md74domFcEQnGKKU2EU4b_5m6EXoNHMG46C1A";

// 값이 비어 있으면 서버 푸시 기능만 꺼지고, 나머지 앱은 그대로 동작합니다.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.appId && firebaseConfig.messagingSenderId && VAPID_KEY
);
