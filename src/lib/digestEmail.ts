import { Trend } from "@/data/trends";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHref(link: string | undefined) {
  if (!link) return "#";
  try {
    const url = new URL(link);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "#";
    return escapeHtml(url.toString());
  } catch {
    return "#";
  }
}

export function buildDigestEmail(trends: Trend[]) {
  const today = new Date();
  const dateLabel = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`;
  const subject = `[요즘트렌드] ${dateLabel} 오늘의 트렌드`;

  const cards = trends
    .map(
      (t) => `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #eee;">
          <span style="display:inline-block;background:#eef2ff;color:#4f46e5;font-size:12px;padding:2px 8px;border-radius:9999px;">${escapeHtml(t.category)}</span>
          <div style="margin-top:8px;font-size:16px;font-weight:600;color:#111;">
            <a href="${safeHref(t.link)}" style="color:#111;text-decoration:none;">${escapeHtml(t.title)}</a>
          </div>
          <p style="margin:6px 0 0;font-size:14px;color:#555;line-height:1.5;">${escapeHtml(t.summary)}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#999;">출처 · ${escapeHtml(t.source)}</p>
        </td>
      </tr>`,
    )
    .join("");

  const html = `
    <div style="max-width:560px;margin:0 auto;font-family:-apple-system,Helvetica,Arial,sans-serif;">
      <h1 style="font-size:20px;color:#111;">오늘, 놓치면 아쉬운 흐름</h1>
      <p style="font-size:13px;color:#888;">${dateLabel} · 요즘트렌드 YOZM Trend</p>
      <table style="width:100%;border-collapse:collapse;">${cards}</table>
      <p style="margin-top:24px;font-size:12px;color:#aaa;">
        이 메일은 요즘트렌드 구독 설정에서 신청하신 분께 발송됩니다.
      </p>
    </div>`;

  return { subject, html };
}
