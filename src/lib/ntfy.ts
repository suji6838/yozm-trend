const NTFY_TIMEOUT_MS = 10_000;
const NTFY_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ntfy JSON publish API 사용 — 헤더 방식(Title 헤더)은 한글 등 비ASCII 값에서
// 인코딩 문제가 생길 수 있어 JSON 본문으로 보낸다.
// 전송 성공 여부를 반환한다. ntfy.sh는 IP 단위로 호출을 제한하는데 Vercel은 여러 프로젝트가
// 같은 출구 IP를 공유해 간헐적으로 429가 날 수 있어, 실패 시 간격을 두고 재시도한다.
// 예외는 던지지 않는다 — 알림 실패가 크론 응답 자체를 500으로 만들지 않도록.
export async function sendNtfy(title: string, message: string): Promise<boolean> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) {
    console.error("NTFY_TOPIC is not set, skipping notification");
    return false;
  }

  for (let attempt = 1; attempt <= NTFY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch("https://ntfy.sh/", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ topic, title, message }),
        signal: AbortSignal.timeout(NTFY_TIMEOUT_MS),
      });
      if (res.ok) return true;
      console.error(`ntfy send failed (attempt ${attempt}): ${res.status} ${await res.text()}`);
    } catch (error) {
      console.error(`ntfy send failed (attempt ${attempt}):`, error);
    }
    if (attempt < NTFY_ATTEMPTS) await sleep(2000 * attempt);
  }
  return false;
}
