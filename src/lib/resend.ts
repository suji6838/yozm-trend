const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
const RESEND_BASE = "https://api.resend.com";

function resendHeaders() {
  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
    throw new Error("RESEND_API_KEY / RESEND_AUDIENCE_ID is not set");
  }
  return {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function upsertSubscriber(email: string) {
  const res = await fetch(
    `${RESEND_BASE}/audiences/${RESEND_AUDIENCE_ID}/contacts`,
    {
      method: "POST",
      headers: resendHeaders(),
      body: JSON.stringify({ email, unsubscribed: false }),
    },
  );
  if (!res.ok) {
    throw new Error(`Resend API error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export type ResendContact = {
  id: string;
  email: string;
  unsubscribed: boolean;
};

export async function listSubscribers(): Promise<ResendContact[]> {
  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
    throw new Error("RESEND_API_KEY / RESEND_AUDIENCE_ID is not set");
  }
  const res = await fetch(
    `${RESEND_BASE}/audiences/${RESEND_AUDIENCE_ID}/contacts`,
    { headers: resendHeaders(), cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(`Resend API error: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { data: ResendContact[] };
  return data.data;
}

const DIGEST_FROM = "YOZM Trend <onboarding@resend.com>";

export async function sendDigestBatch(
  recipients: string[],
  subject: string,
  html: string,
): Promise<{ sent: string[]; failed: { email: string; error: string }[] }> {
  const results = await Promise.all(
    recipients.map(async (email) => {
      const res = await fetch(`${RESEND_BASE}/emails`, {
        method: "POST",
        headers: resendHeaders(),
        body: JSON.stringify({ from: DIGEST_FROM, to: email, subject, html }),
      });
      if (res.ok) return { email, ok: true as const };
      return { email, ok: false as const, error: await res.text() };
    }),
  );

  return {
    sent: results.filter((r) => r.ok).map((r) => r.email),
    failed: results
      .filter((r): r is { email: string; ok: false; error: string } => !r.ok)
      .map((r) => ({ email: r.email, error: r.error })),
  };
}
