// Visone contact form — Vercel serverless function.
// Receives the form POST and emails it via Resend.
// Set these in Vercel → Project → Settings → Environment Variables:
//   RESEND_API_KEY  (from resend.com)
//   CONTACT_TO      (where submissions are emailed, e.g. hello@visone.com)
//   CONTACT_FROM    (optional; defaults to Resend's test sender)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Body may arrive parsed or as a string depending on runtime.
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { name, email, company, plan, message } = body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM || "Visone <onboarding@resend.dev>";

  if (!apiKey || !to) {
    return res.status(500).json({ error: "Server not configured" });
  }

  const subject = `New Visone enquiry — ${company || name}${plan ? " (" + plan + ")" : ""}`;
  const text =
    `Name: ${name}\n` +
    `Email: ${email}\n` +
    `Company: ${company || "-"}\n` +
    `Plan: ${plan || "-"}\n\n` +
    `${message}`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject,
        text,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: "Email send failed", detail });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Unexpected error" });
  }
}
