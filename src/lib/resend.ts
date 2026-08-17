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

export async function listSubscribers() {
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
  return res.json();
}
