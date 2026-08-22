import { TRENDS } from "@/data/trends";
import { getDailyAnalysis } from "@/lib/dailyAnalysis";
import { listSubscribers, sendDigestBatch } from "@/lib/resend";
import { buildDigestEmail } from "@/lib/digestEmail";

export async function runDigestSend() {
  let trends = TRENDS;
  try {
    const analysis = await getDailyAnalysis();
    if (analysis && analysis.trends.length > 0) trends = analysis.trends;
  } catch (error) {
    console.error("send-digest: falling back to static trends:", error);
  }

  const subscribers = await listSubscribers();
  const recipients = subscribers
    .filter((s) => !s.unsubscribed)
    .map((s) => s.email);

  if (recipients.length === 0) {
    return { sentCount: 0, failedCount: 0, failed: [], subscriberCount: 0 };
  }

  const { subject, html } = buildDigestEmail(trends);
  const result = await sendDigestBatch(recipients, subject, html);

  return {
    sentCount: result.sent.length,
    failedCount: result.failed.length,
    failed: result.failed,
    subscriberCount: recipients.length,
  };
}
