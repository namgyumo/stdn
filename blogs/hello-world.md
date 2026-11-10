---
title: '블로그를 열었습니다'
description: 'std::N 사이트를 Astro + Cloudflare Pages 기반으로 새로 세팅했습니다. 왜 이 스택을 골랐는지, 앞으로 어떤 글을 쓸지 간단히 정리합니다.'
publishedAt: 2026-04-24
tags: ['공지', 'meta']
---

기존에 정적 HTML로 만들어 두었던 포트폴리오 사이트를 Astro 기반으로 다시 올렸습니다.
블로그, 프로젝트, PS 풀이, Now/Uses 같은 페이지가 생겼고, Cloudflare Pages 로 배포합니다.

## 왜 이 스택인지

- **Astro 5** — 콘텐츠가 중심인 사이트에 가장 마찰 없는 프레임워크. Markdown/MDX 콘텐츠 컬렉션이 강력합니다.
- **Cloudflare Pages** — 정적 파일 + 필요한 경우 Pages Functions 로 API 를 덧붙일 수 있어서, AWS 로 갈 필요가 없습니다.
- **TypeScript 전용** — 프론트·백 구분 없이 한 언어로 운영.

## 앞으로 쓸 것

- 백준·코드포스 문제 풀이 과정 (`#ps` 태그)
- C/C++ 저수준 & 포인터 관련 탐구 (`#cpp` 태그)
- 시스템 프로그래밍 / 자료구조 공부 로그
- 개발 환경·장비 변경 기록

`/now` 와 `/uses` 페이지에서는 지금 뭘 하는지, 어떤 장비를 쓰는지 실시간으로 업데이트합니다.

## 변경 로그

- 기존 4페이지(`index`/`about`/`skills`/`contact`) 를 Astro 페이지로 이식
- `<table>` / `align="center"` / `<p><h1>` 같은 비표준 마크업 정리
- `style.css` 를 토큰 기반으로 재작성 (색·간격·애니메이션 변수화)
- BOJ 뱃지 API 를 HTTPS 로 전환 (혼합 콘텐츠 이슈 해결)
- `Cmd/Ctrl + K` 명령어 팔레트 추가
- 커스텀 커서 글로우, 읽기 진행률, ToC, 코드 복사 버튼 추가

앞으로 천천히 쌓아가겠습니다.
