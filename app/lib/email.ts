import nodemailer from "nodemailer";
import type { ScrapedItem } from "./scrapers/types";

const configured =
  !!process.env.EMAIL_HOST &&
  !!process.env.EMAIL_USER &&
  !!process.env.EMAIL_PASS;

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST!,
    port: parseInt(process.env.EMAIL_PORT ?? "587"),
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASS!,
    },
  });
}

function formatPrice(price?: number, currency?: string): string {
  if (!price) return "Preț necunoscut";
  const eur = currency === "RON" ? Math.round(price / 4.97) : price;
  return `${eur.toLocaleString("ro-RO")} €`;
}

function buildAlertEmail(
  alertLocality: string,
  alertType: string,
  items: ScrapedItem[]
): { subject: string; html: string } {
  const subject = `🔔 ${items.length} proprietăți noi în ${alertLocality} — Alerta ta Invest`;

  const cards = items
    .map(
      (it) => `
    <div style="border:1px solid #2d2d2d;border-radius:10px;padding:16px;margin-bottom:12px;background:#1a1a1a;">
      <div style="font-size:11px;color:${it.source === "olx" ? "#4ade80" : "#60a5fa"};font-weight:700;margin-bottom:6px;text-transform:uppercase;">${it.source}</div>
      <div style="font-size:15px;font-weight:700;color:#e2e8f0;margin-bottom:8px;">${it.title}</div>
      <table style="font-size:12px;color:#94a3b8;border-collapse:collapse;width:100%;">
        <tr>
          <td style="padding:3px 0;">📍 Localitate</td>
          <td style="padding:3px 0;color:#e2e8f0;text-align:right;">${it.locality}</td>
        </tr>
        <tr>
          <td style="padding:3px 0;">💰 Preț</td>
          <td style="padding:3px 0;color:#4ade80;font-weight:700;text-align:right;">${formatPrice(it.price, it.currency)}</td>
        </tr>
        ${it.areaM2 ? `<tr><td style="padding:3px 0;">📐 Suprafață</td><td style="padding:3px 0;color:#e2e8f0;text-align:right;">${it.areaM2} m²</td></tr>` : ""}
        ${it.areaM2 && it.price ? `<tr><td style="padding:3px 0;">💶 Preț/m²</td><td style="padding:3px 0;color:#e2e8f0;text-align:right;">${Math.round((it.currency === "RON" ? it.price / 4.97 : it.price) / it.areaM2)} €/m²</td></tr>` : ""}
      </table>
      ${it.description ? `<div style="font-size:11px;color:#64748b;margin-top:8px;line-height:1.5;">${it.description.slice(0, 150)}…</div>` : ""}
      <a href="${it.link}" style="display:inline-block;margin-top:12px;padding:7px 16px;background:#1d4ed8;color:#fff;border-radius:7px;font-size:12px;font-weight:600;text-decoration:none;">🔗 Vezi anunțul</a>
    </div>
  `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="background:#0a0a0a;color:#fff;font-family:system-ui,sans-serif;margin:0;padding:20px;">
      <div style="max-width:560px;margin:0 auto;">

        <div style="text-align:center;padding:24px 0 20px;">
          <div style="font-size:28px;margin-bottom:8px;">🔔</div>
          <h1 style="font-size:20px;font-weight:900;color:#f59e0b;margin:0 0 6px;">Alertă Invest</h1>
          <p style="font-size:13px;color:#64748b;margin:0;">
            ${items.length} proprietăți noi găsite pentru alerta ta:<br>
            <strong style="color:#e2e8f0;">${alertLocality} · ${alertType}</strong>
          </p>
        </div>

        ${cards}

        <div style="margin-top:24px;padding:16px;background:#111;border-radius:10px;text-align:center;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/scrape"
            style="display:inline-block;padding:10px 24px;background:#1d4ed8;color:#fff;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">
            🔎 Deschide Scraperul
          </a>
          <p style="font-size:11px;color:#334155;margin:12px 0 0;">
            Gestionează alertele tale la
            <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/alerts" style="color:#475569;">/alerts</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export async function sendAlertEmail(
  to: string,
  alertLocality: string,
  alertType: string,
  items: ScrapedItem[]
): Promise<void> {
  if (!configured) {
    console.log(`[email] Not configured — would send ${items.length} matches to ${to}`);
    return;
  }

  const { subject, html } = buildAlertEmail(alertLocality, alertType, items);
  const transport = createTransport();

  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
}
