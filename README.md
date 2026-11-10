# std::N

기본이 탄탄한 주니어 개발자의 개인 홈페이지 + 블로그.
Astro 5 (정적) + Cloudflare Pages + Pages Functions + D1 로 배포합니다.

---

## 🗂 프로젝트 구조

```
stdN/
├── _legacy/                 # 기존 단일 HTML 포트폴리오 보관 (참고용)
├── archive/algorithm-bank/  # 비공개로 보관한 뱅크 페이지와 코드 실행 API
├── blogs/                   # Markdown 글을 넣는 폴더
├── public/
│   ├── images/              # 프로필·보스턴·스포츠·뮤지컬 이미지
│   ├── favicon.svg
│   ├── site.webmanifest
│   ├── og-default.svg       # 기본 Open Graph 이미지
│   ├── robots.txt
│   ├── global.css           # 전역 스타일 (Astro + Pages Functions 공용)
│   └── _headers             # Cloudflare Pages 캐시/보안 헤더
├── functions/
│   ├── _lib/
│   │   ├── auth.ts          # PBKDF2 + HMAC 세션 쿠키 (Web Crypto 기반)
│   │   ├── md.ts            # markdown → HTML (marked + 기본 sanitize)
│   │   └── ai.ts            # Gemini 호출 래퍼 + 프롬프트 빌더
│   ├── api/
│   │   ├── contact.ts       # 연락 폼 — Resend 연동
│   │   ├── guestbook.ts     # 방명록 — D1
│   │   ├── views/[slug].ts  # 포스트 조회수 — D1
│   │   ├── posts/index.ts   # 공개 포스트 목록 (블로그 리스트 하이드레이션)
│   │   ├── admin/           # 로그인·세션·포스트 CRUD (인증 필수)
│   │   └── ai/              # complete / rewrite / fix (Gemini 프록시)
│   └── blog/
│       ├── [slug].ts        # D1 포스트 렌더, 없으면 정적 MD 로 fall-through
│       └── tags/[tag].ts    # D1-only 태그 페이지 fallback
├── src/
│   ├── components/          # Header, CommandPalette, TOC 등
│   ├── content/
│   │   ├── projects/        # 프로젝트 카드
│   │   └── config.ts        # Content Collection 스키마
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── BlogLayout.astro
│   │   └── AdminLayout.astro
│   ├── lib/
│   │   ├── site.ts          # 사이트 메타데이터 (이름/핸들/nav 등)
│   │   └── format.ts
│   ├── pages/
│   │   ├── index.astro       /   홈
│   │   ├── about.astro       /about
│   │   ├── skills.astro      /skills
│   │   ├── contact.astro     /contact
│   │   ├── now.astro         /now
│   │   ├── uses.astro        /uses
│   │   ├── ps.astro          /ps
│   │   ├── search.astro      /search
│   │   ├── 404.astro
│   │   ├── rss.xml.ts
│   │   ├── admin/
│   │   │   ├── login.astro
│   │   │   ├── index.astro   # 대시보드 (포스트 리스트)
│   │   │   └── editor.astro  # VS 같은 에디터 + AI 보조
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   ├── [...slug].astro
│   │   │   └── tags/[tag].astro
│   │   └── projects/
│   │       ├── index.astro
│   │       └── [...slug].astro
│   └── styles/
│       └── admin.css        # 어드민 전용 스타일
├── schema.sql               # D1 스키마 (guestbook, views, posts, sessions)
├── astro.config.mjs
├── tsconfig.json
├── wrangler.toml
└── package.json
```

---

## 🚀 로컬에서 돌리기

```bash
# 1. Node 20 이상 설치 — https://nodejs.org
# 2. pnpm (권장)
npm install -g pnpm

# 3. 의존성 설치
pnpm install

# 4. dev 서버
pnpm dev            # http://localhost:4321

# 5. 프로덕션 빌드 + 검색 인덱스 생성
pnpm build          # dist/ 에 빌드됨

# 6. 빌드 결과 로컬 미리보기
pnpm preview
```

> Pagefind 검색 인덱스는 `pnpm build` 시점에 생성됩니다.
> `pnpm dev` 환경에서는 `/search` 결과가 비어 보일 수 있어요.
> Pages Functions (`/functions/`) + D1 바인딩은 `pnpm dev` 에서는 동작하지 않습니다.
> 로컬에서 Functions 포함 테스트 하려면 `npx wrangler pages dev dist` 를 쓰세요.

---

## 블로그 글 추가

`blogs/`에 `.md` 또는 `.mdx` 파일을 넣으면 `/blog` 목록, 글 페이지, 태그, RSS에 반영됩니다. 기존 글도 이 폴더에 있습니다. 파일 이름이 글 주소가 됩니다.

````md
---
title: '글 제목'
publishedAt: 2026-11-10
description: '짧은 소개'
tags: ['메모']
---

## 본문 제목

본문을 작성합니다.
````

`title`과 `publishedAt`은 필수입니다. `draft: true`를 넣으면 공개 목록에서 빠집니다. 로컬에서는 `pnpm dev`를 켜 둔 상태에서 파일을 넣으면 바로 볼 수 있습니다. 공개 사이트는 Git에 파일을 추가해 푸시하고 Cloudflare Pages 빌드가 끝나면 갱신됩니다.

표, 체크리스트, 각주, 취소선, 언어 이름을 붙인 코드 블록을 지원합니다. `$E=mc^2$`는 인라인 수식, `$$ ... $$`는 블록 수식입니다. 흐름도와 시퀀스 다이어그램은 `mermaid` 코드 블록에 적습니다. `> [!NOTE]`나 `> [!WARNING]`으로 시작하는 인용문은 알림 상자로 표시됩니다.

블로그 이미지는 `blogs/asset/`에 넣습니다. `blogs/글이름.md`에서는 `![사진 설명](./asset/사진.jpg)`처럼 쓰면 됩니다. 하위 폴더의 글에서는 글 파일 기준 상대 경로를 사용하세요. Astro가 빌드할 때 이미지를 처리해 글에 포함합니다. 이미지를 바꾸거나 추가한 뒤 공개 사이트에 반영하려면 글과 이미지 파일을 함께 Git에 푸시해야 합니다.

---

## ☁️ Cloudflare Pages 배포

### A. Git 연동 자동 배포 (추천)

1. 이 폴더를 GitHub repo 로 푸시 (예: `github.com/namgyumo/stdn`).
2. https://dash.cloudflare.com → Pages → Create project → Connect to Git.
3. 해당 repo 선택. 빌드 설정:
   - **Framework preset**: Astro
   - **Build command**: `pnpm build`
   - **Build output directory**: `dist`
   - **Node version**: 20 이상 (환경변수 `NODE_VERSION=20`)
4. 환경변수 (Settings → Environment variables) — 아래 표 참조.
5. 배포 완료되면 도메인 연결 (Custom domain → `std-n.dev`).

### B. 환경변수

Pages → Settings → Environment variables 에서 **Production / Preview 모두** 등록:

| Key | 필수 | 예시 | 용도 |
|---|---|---|---|
| `PUBLIC_SITE_URL` | ✅ | `https://std-n.dev` | canonical / RSS / OG |
| `PUBLIC_CF_ANALYTICS_TOKEN` | ☐ | (CF 발급) | Web Analytics |
| `RESEND_API_KEY` | ☐ | `re_...` | 연락 폼 |
| `CONTACT_TO_EMAIL` | ☐ | `n.gyumo13@gmail.com` | 받는 이 |
| `CONTACT_FROM_EMAIL` | ☐ | `std::N <hello@std-n.dev>` | 보내는 이 |
| `ADMIN_PASSWORD_HASH` | ✅ (admin) | `100000:...:...` | admin 로그인 — PBKDF2 |
| `SESSION_SECRET` | ✅ (admin) | 32바이트 hex | 세션 쿠키 서명 (HMAC) |
| `GEMINI_API_KEY` | ✅ (AI) | AI Studio 발급 | 에디터 AI 보조 |
| `WANDBOX_URL` | ☐ | `https://wandbox.org/api/compile.json` | 보관된 알고리즘 뱅크를 복구할 때 사용 |

### C. D1 연결 (방명록·조회수·블로그 글)

1. **D1 생성** — Cloudflare 대시보드 D1 탭에서 `std-n` 이름으로 만들거나:
   ```bash
   npx wrangler d1 create std-n
   # 출력된 database_id 를 wrangler.toml 에 기입
   ```

2. **스키마 적용** — `schema.sql` 을 사용합니다.
   - 로컬에서:
     ```bash
     npx wrangler d1 execute std-n --remote --file=schema.sql
     ```
   - 또는 Cloudflare 대시보드 D1 → `std-n` → Console 탭에서 `schema.sql` 내용을 그대로 붙여넣고 실행.

3. **Pages 프로젝트 → Settings → Functions → D1 database bindings**
   - Binding name: **`DB`** (소문자·대문자 정확히)
   - Database: `std-n`

---

## 🔐 Admin (직접 블로그 쓰기)

정적 MD 파일 대신 관리자 UI 에서 바로 글을 쓰고 싶다면:

### 1. ADMIN_PASSWORD_HASH 생성

로컬 터미널에서 (Node 설치되어 있어야 함):

```bash
node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');const it=100000;const h=c.pbkdf2Sync(process.argv[1],Buffer.from(s,'hex'),it,32,'sha256').toString('hex');console.log(\`\${it}:\${s}:\${h}\`)" 'YOUR_PASSWORD'
```

출력된 `100000:xxxxx:yyyyy` 전체를 **`ADMIN_PASSWORD_HASH`** 환경변수에 넣기.
비밀번호 자체는 어디에도 저장하지 않습니다 (해시만 저장).

### 2. SESSION_SECRET 생성

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

출력된 64자리 hex 를 `SESSION_SECRET` 환경변수에.
바뀌면 기존 세션이 전부 무효화됩니다.

### 3. 접속

배포 후 `https://<your-domain>/admin/login` 접속 → 비밀번호 입력 → `/admin` 대시보드.

- 세션 쿠키는 **HttpOnly · Secure · SameSite=Strict · 7일** TTL.
- `/admin/*` 는 `robots: noindex, nofollow`.
- 에디터 접근: `/admin/editor` (신규) 또는 `/admin/editor?id=<postId>` (수정).

---

## 🤖 AI 보조 (Gemini)

에디터 안에서 "VS Code 인라인 보조" 스타일로 동작합니다.

### 1. API 키 발급

https://aistudio.google.com/apikey → Create API key → 복사 → `GEMINI_API_KEY` 환경변수.

무료 티어로도 충분히 동작합니다. 기본 모델은 `gemini-2.0-flash`.

### 2. 에디터 단축키

| 단축키 | 동작 |
|---|---|
| `Ctrl+S` | 저장 |
| `Ctrl+B` / `Ctrl+I` | 굵게 / 기울임 |
| `Ctrl+K` | **AI 이어쓰기** — 커서 위치에 자연스러운 이어쓰기 제안 |
| `Ctrl+Shift+R` | **AI 다듬기** — 선택한 블록을 자연스럽게 리라이트 |
| `Ctrl+Shift+F` | **AI 수정** — 선택한 블록에서 사실/문법 오류 교정 |
| `Tab` | AI 제안 수락 (제안 떠 있을 때) / 일반 들여쓰기 (아닐 때) |
| `Esc` | AI 제안 거절 |

- 요청은 `/api/ai/complete`, `/api/ai/rewrite`, `/api/ai/fix` 로 보내지고, 서버에서 Gemini 로 프록시됩니다. 클라이언트에는 API 키가 노출되지 않습니다.
- 글 전체 전송 대신 **커서 앞 4000자 + 뒤 1000자** (이어쓰기) 또는 **선택 블록 + 주변 2000자** (다듬기/수정) 만 보냅니다.

---

## ✍️ 새 글 쓰기

두 가지 방식을 공존시킵니다:

### 방식 1 — 로컬 Markdown (git 커밋으로 배포)

`blogs/<slug>.md(x)` 파일 생성:

```markdown
---
title: '새 글 제목'
description: '검색/OG 용 1-2줄 요약'
publishedAt: 2026-05-01
tags: ['ps', 'cpp']
draft: false
---

여기서부터 본문입니다.
```

- `draft: true` 이면 빌드에서 제외.
- `#ps` 태그가 붙은 글은 `/ps` 페이지에도 자동 등록.
- 코드 블록은 Shiki (`github-dark`) 로 하이라이트, `copy` 버튼 자동 주입.

### 방식 2 — Admin 에디터 (D1 에 저장, 즉시 반영)

`/admin/login` → `/admin/editor` 에서 작성.

- 같은 `/blog/<slug>` URL 에서 서빙됩니다.
- D1 포스트와 MD 포스트가 **slug 충돌 시**: MD 쪽이 우선. (정적 페이지가 먼저 응답)
- 실제로는 `functions/blog/[slug].ts` 가 먼저 실행 → D1 매치되면 D1 렌더, 아니면 정적 MD 로 fall-through.
- 블로그 리스트 (`/blog`) 는 빌드 시점 MD 글을 서버 렌더 → 클라이언트에서 `/api/posts` 로 D1 글 머지.

### 프로젝트 추가

`src/content/projects/<slug>.md` 파일 생성 (Admin UI 는 아직 프로젝트는 지원 안 함):

```markdown
---
title: '프로젝트 이름'
summary: '한 줄 요약'
status: 'wip'
stack: ['C++', 'CMake']
repo: 'https://github.com/namgyumo/...'
demo: 'https://...'
startedAt: 2026-03-01
featured: true
order: 90
---
```

---

## 🧮 알고리즘 뱅크 (보관됨)

현재 `/bank` 페이지와 `/api/run`은 공개 빌드에서 제외했다. 코드는
`archive/algorithm-bank/`에, 문제 데이터는 `src/content/problems/`에 남겨뒀다.
아래는 보관된 구현의 구조다.

```
브라우저 (CodeMirror 에디터, C/C++/Python)
   │  코드 + stdin
   ▼
Pages Function  /api/run   ← Wandbox 프록시 (브라우저 UA 부착 + 인프라 오류 재시도)
   │
   ▼
Wandbox (컴파일·실행)  →  stdout 반환
   │
   ▼
클라이언트가 테스트케이스와 대조 → AC / WA / TLE / RE / CE 판정
```

- **문제 데이터**: `src/content/problems/*.json` (Content Collection). 각 파일은 문제 지문·제한·
  예제·**채점 케이스(입력/정답)**·언어별 시작 코드를 담는다. 정답은 파이썬 레퍼런스 풀이를
  실제 실행해 생성했고, gcc 컴파일 정답으로 교차 검증했다.
- **판정은 클라이언트**가 수행한다. Function 은 실행만 대행하므로 어떤 문제/언어에도 재사용 가능.
- **주의 (개발 모드)**: `pnpm dev` 는 Pages Functions 를 실행하지 않아 `/api/run` 이 없다.
  실행/채점까지 테스트하려면 `pnpm build && npx wrangler pages dev dist` 를 쓰거나 배포본에서 확인.
- **주의 (공용 인스턴스)**: 공용 Wandbox 는 부하 시 일시적 오류를 낼 수 있어 프록시가 3회까지
  재시도하고, 그래도 실패하면 "서버 혼잡" 을 안내한다. 트래픽이 커지면 Wandbox 를
  셀프호스팅(Docker)하고 `WANDBOX_URL` 만 바꾸면 된다.

### 문제 추가

`scripts/gen_problems*.py` 형태의 생성기에 문제 정의(지문 + 파이썬 레퍼런스 풀이 + 입력)를 추가하고
실행하면 정답이 자동 계산되어 `src/content/problems/` 에 JSON 이 떨어진다. 손으로 정답을
적지 않는 것이 핵심 — 레퍼런스 풀이가 곧 정답의 근거다.

---

## 🎨 디자인 토큰

`public/global.css` 의 `:root` 섹션에서 관리합니다:

| 토큰 | 기본값 |
|---|---|
| `--color-bg` | `#080808` |
| `--color-fg` | `#e0f7fa` (시안) |
| `--color-accent` | `#c1ff00` (네온 라임) |
| `--color-blue` | `#0062ff` |
| `--color-pink` | `#ff003c` |
| `--font-sans` | `Trebuchet MS, Pretendard, ...` |
| `--font-mono` | `JetBrains Mono, Cascadia Code, ...` |

전역 배경의 그리드 격자·비네팅·유체 그라데이션은 `body::before`, `body::after` 에서 관리합니다.

---

## 🧩 주요 기능

- **Algorithm Bank (보관)** — 페이지와 코드 실행 API는 `archive/algorithm-bank/`에 보관
- **Content Collections** — 블로그·프로젝트·문제 모두 타입 안전 Frontmatter
- **D1 Admin CMS** — 관리자 로그인 + VS 스타일 에디터 + Gemini AI 보조
- **View Transitions** — Astro `ClientRouter` 로 부드러운 페이지 전환
- **Command Palette** — `Ctrl/Cmd + K` 또는 `/` 로 열기
- **Cursor Glow** — 마우스 주변 라임색 radial glow
- **Reading Progress Bar** — 블로그 스크롤 진행률
- **Table of Contents** — 자동 생성, 스크롤에 따라 active 이동
- **Copy Code Button** — 코드 블록마다 복사 버튼
- **Pagefind Search** — `pnpm build` 시점에 정적 인덱스 생성
- **RSS + Sitemap** — `/rss.xml`, `/sitemap-index.xml`
- **OG / Twitter Card / JSON-LD** — 페이지별 자동 생성
- **Touch-Active 클래스** — 모바일에서도 호버 전용 효과 동작

---

## 🛣 로드맵

- [x] Astro 5 정적 구조 + Cloudflare Pages 연결
- [x] D1 기반 방명록·조회수
- [x] Admin 로그인 + D1 포스트 CRUD
- [x] Gemini AI 이어쓰기/다듬기/수정
- [ ] `ADMIN_PASSWORD_HASH` / `SESSION_SECRET` / `GEMINI_API_KEY` Pages 환경변수 등록
- [ ] D1 `schema.sql` 적용 + `DB` 바인딩
- [ ] 도메인 연결 (std-n.dev 등)
- [ ] `poby01.jpg` WebP 로 재생성 (1.9MB → ~100KB)
- [ ] OG 기본 SVG 를 PNG 로 렌더
- [ ] Giscus 리포지토리·카테고리 ID 세팅
- [ ] Resend API 키 등록

---

## 📝 라이선스

개인 콘텐츠는 © {year} std::N — All rights reserved.
사이트 구조/코드는 편하게 참고 가능합니다.
