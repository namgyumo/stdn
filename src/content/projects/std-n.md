---
title: 'std::N 개인 홈페이지'
summary: 'Astro 정적 + Cloudflare Pages Functions + D1 로 만든 포트폴리오 겸 블로그. 직접 만든 admin CMS 와 Gemini 기반 AI 에디터 내장.'
status: 'active'
stack: ['Astro', 'TypeScript', 'Cloudflare Pages', 'Pages Functions', 'D1', 'Gemini AI', 'Pagefind']
repo: 'https://github.com/namgyumo/stdn'
startedAt: 2026-04-24
featured: true
order: 100
---

## 왜 만들었나

기존 정적 HTML 4페이지 포트폴리오를 확장하면서, "블로그·프로젝트·PS 풀이" 를 한 곳에서
일관된 디자인으로 보여주고 싶었다. 글쓰기도 쉬워야 하고, 배포도 단순해야 했다.

## 핵심 결정

- **Astro** — Markdown 콘텐츠에 최적화, View Transitions 내장
- **Cloudflare Pages** — 푸시 = 배포, 무료 tier 넉넉
- **Pagefind** — 정적 검색 인덱스, DB 불필요
- **Content Collections** — 글이 git 에 버전 관리됨

## 구조

```
blogs/                 마크다운 글
src/
  content/projects/    프로젝트 설명
  layouts/             BaseLayout, BlogLayout
  components/          Header, CommandPalette, TOC, ...
  pages/               라우트
```

## 추가로 구축한 것

- **Admin CMS** — PBKDF2 비밀번호 + HMAC 세션 쿠키(Web Crypto, npm 의존 없음), `/admin/login` → 포스트 CRUD
- **VS 스타일 에디터** — 라이브 마크다운 프리뷰, 자동 저장, 태그 칩, 단축키 (`Ctrl+S` / `Ctrl+K` / `Ctrl+Shift+R` / `Ctrl+Shift+F`)
- **Gemini AI 보조** — 인라인 이어쓰기, 자연스럽게 다듬기, 사실/문법 수정. 서버 프록시로 API 키 노출 차단
- **D1 ↔ 정적 MD 혼합 라우팅** — 같은 `/blog/:slug` 에서 Pages Function 이 D1 조회, 없으면 정적 MD 로 fall-through

## 앞으로

- D1 기반 방명록·조회수 활성화
- Resend 기반 contact 폼
- OG 이미지 자동 생성 (Workers)
