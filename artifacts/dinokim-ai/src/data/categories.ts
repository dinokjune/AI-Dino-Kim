export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string; // lucide-react icon name
  postCount: number;
}

export const categories: Category[] = [
  { id: "1", slug: "chatgpt-basics", name: "ChatGPT 기초", description: "ChatGPT를 처음 시작하는 분들을 위한 기본 사용법과 핵심 개념을 안내합니다.", icon: "MessageSquare", postCount: 4 },
  { id: "2", slug: "prompt-engineering", name: "프롬프트 엔지니어링", description: "AI에게 원하는 결과를 이끌어내는 프롬프트 작성법을 단계별로 설명합니다.", icon: "Zap", postCount: 3 },
  { id: "3", slug: "ai-tools", name: "AI 도구 활용", description: "업무와 일상에서 바로 쓸 수 있는 다양한 AI 도구들을 소개하고 비교합니다.", icon: "Wrench", postCount: 4 },
  { id: "4", slug: "work-automation", name: "업무 자동화", description: "반복 업무를 AI로 자동화하여 업무 효율을 높이는 방법을 다룹니다.", icon: "BarChart2", postCount: 2 },
  { id: "5", slug: "ai-writing", name: "AI 글쓰기", description: "AI를 활용해 문서, 보고서, 콘텐츠를 더 빠르고 효과적으로 작성하는 방법입니다.", icon: "PenLine", postCount: 2 },
];