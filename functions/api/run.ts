// POST /api/run — Wandbox(공개 코드 실행 API) 프록시.
// 서버(컴파일러) 없이 브라우저에서 온 코드를 실행만 대행한다. 채점(AC/WA 비교)은 클라이언트가 담당.
//
// (2026-02 기준 Piston 공개 API 가 화이트리스트 전용으로 막혀 Wandbox 로 전환)
// Wandbox 는 Cloudflare 뒤에 있어 브라우저형 User-Agent 가 필요하고,
// 무료 공용 인스턴스라 부하 시 "OCI runtime / Resource temporarily unavailable" 같은
// 일시적 인프라 오류를 낼 수 있어 재시도 + 별도 처리한다.
//
// body: { language: 'c'|'cpp'|'python', source: string, stdin?: string }
// resp(성공): { ok:true, run:{stdout,stderr,code,signal}, compile:{stdout,stderr,code} }
// resp(혼잡): { ok:false, retry:true, message } (HTTP 503)

interface Env {
  WANDBOX_URL?: string; // 셀프호스팅/미러 오버라이드
}

const COMPILER: Record<string, string> = {
  c: 'gcc-13.2.0-c',
  cpp: 'gcc-13.2.0',
  python: 'cpython-3.12.7',
};
const OPTION_RAW: Record<string, string> = {
  c: '-O2',
  cpp: '-O2\n-std=gnu++17',
  python: '',
};

const MAX_SOURCE = 60_000;
const MAX_STDIN = 20_000;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

interface WandboxResp {
  status?: string;
  signal?: string;
  compiler_output?: string;
  compiler_error?: string;
  program_output?: string;
  program_error?: string;
  program_message?: string;
}

// Wandbox 컨테이너/호스트가 일시적으로 뻗은 경우(사용자 코드 문제가 아님)
function isInfraError(compilerErr: string, code: number): boolean {
  return (
    code === 126 ||
    code === 127 ||
    /oci runtime|resource temporarily unavailable|crun|cannot allocate|no space left|too many open|cannot fork/i.test(
      compilerErr,
    )
  );
}

async function callWandbox(endpoint: string, payload: string): Promise<WandboxResp> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': UA,
      accept: 'application/json',
    },
    body: payload,
  });
  if (!res.ok) throw new Error(`http ${res.status}`);
  return (await res.json()) as WandboxResp;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const endpoint = env.WANDBOX_URL ?? 'https://wandbox.org/api/compile.json';

  let body: { language?: string; source?: string; stdin?: string };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: '잘못된 요청 형식' }, 400);
  }

  const language = String(body.language ?? '');
  const source = String(body.source ?? '');
  const stdin = String(body.stdin ?? '');

  if (!COMPILER[language]) return json({ ok: false, message: '지원하지 않는 언어' }, 400);
  if (!source.trim()) return json({ ok: false, message: '코드가 비어 있음' }, 400);
  if (source.length > MAX_SOURCE) return json({ ok: false, message: '코드가 너무 김' }, 413);
  if (stdin.length > MAX_STDIN) return json({ ok: false, message: '입력이 너무 김' }, 413);

  const payload = JSON.stringify({
    compiler: COMPILER[language],
    code: source,
    stdin,
    'compiler-option-raw': OPTION_RAW[language],
    save: false,
  });

  // 일시적 인프라 오류면 최대 3회까지 재시도
  let data: WandboxResp | null = null;
  let lastInfra = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const d = await callWandbox(endpoint, payload);
      const code = parseInt(d.status ?? '0', 10) || 0;
      if (isInfraError(d.compiler_error ?? '', code)) {
        lastInfra = (d.compiler_error ?? '').trim();
        await sleep(400 * (attempt + 1));
        continue;
      }
      data = d;
      break;
    } catch {
      await sleep(400 * (attempt + 1));
    }
  }

  if (!data) {
    return json(
      {
        ok: false,
        retry: true,
        message: '실행 서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.',
        detail: lastInfra.slice(0, 200),
      },
      503,
    );
  }

  const compilerErr = data.compiler_error ?? '';
  const stdout = data.program_output ?? '';
  const stderr = data.program_error ?? '';
  const rawStatus = data.status ?? '0';
  const rawSignal = data.signal ?? '';

  const ran = stdout !== '' || stderr !== '' || rawSignal !== '' || rawStatus === '0';
  const compileFailed = !ran && /error:/i.test(compilerErr);

  const signal = /kill|xcpu|term|abrt/i.test(rawSignal) ? 'SIGKILL' : rawSignal || null;
  const code = parseInt(rawStatus, 10) || 0;

  return json({
    ok: true,
    compile: {
      code: compileFailed ? 1 : 0,
      stdout: data.compiler_output ?? '',
      stderr: compilerErr,
    },
    run: { stdout, stderr, code, signal },
  });
};
