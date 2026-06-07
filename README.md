# AI활용연구소 (AI-Dino-Kim)

> 일상과 업무에서 AI를 제대로 활용하는 방법을 안내합니다

ChatGPT, 생성형 AI, 업무 자동화, 프롬프트 엔지니어링 등 AI 도구를 실제로 활용하는 방법을 다루는 블로그 웹사이트입니다.

---

## 📌 프로젝트 소개

**AI활용연구소**는 AI 도구와 업무 자동화를 연구하는 디지털 콘텐츠 기획자 **디노킴**이 운영하는 블로그입니다.

- 직접 사용해보고 확인한 정보만 다룹니다
- 과장과 낚시성 표현을 사용하지 않습니다
- 입문자 기준으로 이해하기 쉽게 풀어 씁니다
- 콘텐츠는 주기적으로 검토하고 업데이트합니다

---

## 🗂️ 주요 카테고리

| 카테고리 | 설명 |
|---|---|
| ChatGPT 기초 | ChatGPT를 처음 시작하는 분들을 위한 기본 사용법과 핵심 개념 |
| 프롬프트 엔지니어링 | AI에게 원하는 결과를 이끌어내는 프롬프트 작성법 |
| AI 도구 활용 | 업무와 일상에서 바로 쓸 수 있는 다양한 AI 도구 소개 및 비교 |
| 업무 자동화 | 반복 업무를 AI로 자동화하여 업무 효율을 높이는 방법 |
| AI 글쓰기 | AI를 활용해 문서, 보고서, 콘텐츠를 더 빠르고 효과적으로 작성하는 방법 |

---

## 🛠️ 기술 스택

| 분류 | 기술 |
|---|---|
| Frontend | React 18, TypeScript 5.9, Vite |
| UI | Tailwind CSS, Radix UI, shadcn/ui |
| 라우팅 | Wouter |
| 상태 관리 | TanStack React Query |
| 패키지 매니저 | pnpm (workspaces) |
| 기타 | Framer Motion, Recharts, React Hook Form |

---

## 📁 프로젝트 구조

```
AI-Dino-Kim/
├── artifacts/
│   ├── api-server/        # Express 5 기반 API 서버
│   └── dinokim-ai/        # React 프론트엔드
│       └── src/
│           ├── components/ # 공통 컴포넌트
│           ├── data/       # 정적 데이터 (포스트, 카테고리 등)
│           ├── hooks/      # 커스텀 훅 (다크모드 등)
│           ├── lib/        # 유틸리티
│           └── pages/      # 페이지 컴포넌트
├── lib/                   # 공유 라이브러리
├── scripts/               # 빌드/유틸 스크립트
└── package.json           # 루트 워크스페이스 설정
```

---

## 🚀 시작하기

### 사전 요구사항

- Node.js 24 이상
- pnpm 패키지 매니저

### 설치

```bash
# 저장소 클론
git clone https://github.com/dinokjune/AI-Dino-Kim.git
cd AI-Dino-Kim

# 의존성 설치
pnpm install
```

### 개발 서버 실행

```bash
# 프론트엔드 개발 서버 (포트 자동 지정)
pnpm --filter @workspace/dinokim-ai run dev

# API 서버 실행 (포트 5000)
pnpm --filter @workspace/api-server run dev
```

### 빌드

```bash
# 전체 빌드 (타입체크 포함)
pnpm run build

# 타입체크만 실행
pnpm run typecheck
```

---

## 📄 주요 페이지

- **홈** (`/`) - 최신 포스트 및 추천 콘텐츠
- **카테고리** (`/categories`) - 주제별 포스트 분류
- **칼럼** (`/columns`) - 심층 분석 및 연재 콘텐츠
- **저자 소개** (`/author`) - 디노킴 소개
- **어바웃** (`/about`) - 블로그 소개
- **문의** (`/contact`) - 연락처

---

## 👤 운영자

**디노킴 (Dino Kim)**
- AI 도구와 업무 자동화를 연구하는 디지털 콘텐츠 기획자
- 📧 dinokceo@gmail.com
- 🌐 [ailab.dinokim.com](https://ailab.dinokim.com)

---

## 📜 라이선스

MIT License
