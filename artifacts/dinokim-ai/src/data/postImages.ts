/**
 * 각 포스트 슬러그별 이미지 URL (2~3장)
 * Picsum 특정 ID 사용 — AI/기술/업무 관련 사진들
 */
export const postImages: Record<string, string[]> = {
  "chatgpt-beginners-guide": [
    "https://picsum.photos/id/48/900/500",   // 노트북 + 책상
    "https://picsum.photos/id/119/900/500",  // 커피 + 노트북 작업 공간
    "https://picsum.photos/id/365/900/500",  // 화면/디스플레이
  ],
  "chatgpt-free-vs-plus": [
    "https://picsum.photos/id/60/900/500",   // 노트북 열린 화면
    "https://picsum.photos/id/160/900/500",  // 디지털 인터페이스
    "https://picsum.photos/id/48/900/500",   // 작업 환경
  ],
  "chatgpt-common-mistakes": [
    "https://picsum.photos/id/119/900/500",  // 집중하는 작업
    "https://picsum.photos/id/20/900/500",   // 창의적 환경
    "https://picsum.photos/id/366/900/500",  // 디지털 화면
  ],
  "chatgpt-conversation-tips": [
    "https://picsum.photos/id/1/900/500",    // 미팅/대화
    "https://picsum.photos/id/453/900/500",  // 협업 공간
    "https://picsum.photos/id/48/900/500",   // 노트북
  ],
  "prompt-basic-structure": [
    "https://picsum.photos/id/180/900/500",  // 구조적 디자인
    "https://picsum.photos/id/3/900/500",    // 아이디어 작업
    "https://picsum.photos/id/119/900/500",  // 작업 공간
  ],
  "prompt-role-setting": [
    "https://picsum.photos/id/453/900/500",  // 전문가 환경
    "https://picsum.photos/id/160/900/500",  // 디지털 작업
    "https://picsum.photos/id/60/900/500",   // 노트북
  ],
  "prompt-templates": [
    "https://picsum.photos/id/366/900/500",  // 서류/문서
    "https://picsum.photos/id/48/900/500",   // 작업
    "https://picsum.photos/id/180/900/500",  // 구조
  ],
  "ai-image-tools-comparison": [
    "https://picsum.photos/id/20/900/500",   // 창의적 이미지
    "https://picsum.photos/id/3/900/500",    // 아트워크 느낌
    "https://picsum.photos/id/160/900/500",  // 디지털 아트
  ],
  "perplexity-ai-guide": [
    "https://picsum.photos/id/453/900/500",  // 검색/탐색 느낌
    "https://picsum.photos/id/119/900/500",  // 노트북 사용
    "https://picsum.photos/id/366/900/500",  // 정보 탐색
  ],
  "notion-ai-guide": [
    "https://picsum.photos/id/3/900/500",    // 노트/정리
    "https://picsum.photos/id/180/900/500",  // 구조화된 작업
    "https://picsum.photos/id/60/900/500",   // 작업 화면
  ],
  "claude-vs-chatgpt": [
    "https://picsum.photos/id/160/900/500",  // 비교/선택
    "https://picsum.photos/id/48/900/500",   // AI 도구 사용
    "https://picsum.photos/id/453/900/500",  // 분석 환경
  ],
  "email-automation-ai": [
    "https://picsum.photos/id/1/900/500",    // 커뮤니케이션
    "https://picsum.photos/id/119/900/500",  // 업무 환경
    "https://picsum.photos/id/60/900/500",   // 이메일 작성
  ],
  "meeting-summary-ai": [
    "https://picsum.photos/id/453/900/500",  // 미팅/회의
    "https://picsum.photos/id/366/900/500",  // 회의록/문서
    "https://picsum.photos/id/3/900/500",    // 정리 작업
  ],
  "ai-blog-writing": [
    "https://picsum.photos/id/20/900/500",   // 글쓰기/창작
    "https://picsum.photos/id/60/900/500",   // 작성 환경
    "https://picsum.photos/id/119/900/500",  // 카페 작업
  ],
  "ai-report-writing": [
    "https://picsum.photos/id/366/900/500",  // 보고서/문서
    "https://picsum.photos/id/180/900/500",  // 분석/구조
    "https://picsum.photos/id/48/900/500",   // 전문 작업
  ],
};

/** 특정 포스트의 대표 썸네일(첫 번째 이미지) */
export function getPostThumbnail(slug: string): string {
  return postImages[slug]?.[0] ?? "https://picsum.photos/id/119/900/500";
}
