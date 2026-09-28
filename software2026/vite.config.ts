import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // 빌드 끝에 파일마다 gzip 크기를 계산하는 과정을 생략해 빌드를 가볍게 합니다.
    // (OneDrive 폴더 등 느린 디스크에서 이 단계가 오래 걸리거나 멈추는 경우가 있음)
    reportCompressedSize: false,
    // openai·firebase 라이브러리가 커서 나는 경고 기준을 조정 (firebase는 이미 필요할 때만 불러옴)
    chunkSizeWarningLimit: 1000,
  },
});
