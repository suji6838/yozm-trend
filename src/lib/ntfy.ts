// ntfy JSON publish API 사용 — 헤더 방식(Title 헤더)은 한글 등 비ASCII 값에서
// 인코딩 문제가 생길 수 있어 JSON 본문으로 보낸다.
export async function sendNtfy(title: string, message: string) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) {
    console.error("NTFY_TOPIC is not set, skipping notification");
    return;
  }

  const res = await fetch("https://ntfy.sh/", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ topic, title, message }),
  });
  if (!res.ok) {
    console.error(`ntfy send failed: ${res.status} ${await res.text()}`);
  }
}
