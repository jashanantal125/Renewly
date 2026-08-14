import {
  explainUrgency,
  formatDaysUntil,
  formatShortDate,
} from "./reminders";
import type { ReminderView } from "./types";
import { RENEWAL_TYPE_LABELS } from "./types";

const ACCENT: Record<string, string> = {
  overdue: "#b91c1c",
  act_now: "#b45309",
  soon: "#0369a1",
  later: "#57534e",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Subject line names the most urgent item.
 *
 * A generic "You have reminders" subject gets ignored in a full inbox, and the
 * whole point of the lead-time work is that the user acts in time.
 */
export function buildSubject(views: ReminderView[]): string {
  const [first] = views;
  if (!first) return "Renewly reminders";

  const rest = views.length - 1;
  const lead = `${first.renewal.name} — ${formatDaysUntil(first.daysUntil).toLowerCase()}`;

  return rest > 0
    ? `${lead} (+${rest} more renewal${rest === 1 ? "" : "s"})`
    : lead;
}

export function buildText(views: ReminderView[], appUrl?: string): string {
  const lines = views.map(
    (view) =>
      `- ${view.renewal.name} (${RENEWAL_TYPE_LABELS[view.renewal.type]}) — ` +
      `${formatDaysUntil(view.daysUntil)}, due ${formatShortDate(view.renewal.renewalDate)}. ` +
      explainUrgency(view),
  );

  return [
    "Renewly reminders",
    "",
    ...lines,
    "",
    appUrl ? `Open Renewly: ${appUrl}` : "",
    "You are receiving this because email reminders are on in Renewly.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildHtml(views: ReminderView[], appUrl?: string): string {
  const rows = views
    .map((view) => {
      const accent = ACCENT[view.urgency] ?? ACCENT.later;
      return `
        <tr>
          <td style="padding:14px 16px;border-left:4px solid ${accent};background:#ffffff;border-radius:8px;">
            <div style="font:600 15px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1917;">
              ${escapeHtml(view.renewal.name)}
              <span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:999px;background:${accent}1a;color:${accent};font:600 12px/1.5 system-ui,sans-serif;">
                ${escapeHtml(formatDaysUntil(view.daysUntil))}
              </span>
            </div>
            <div style="margin-top:4px;font:400 13px/1.5 system-ui,sans-serif;color:#78716c;">
              ${escapeHtml(RENEWAL_TYPE_LABELS[view.renewal.type])} · due ${escapeHtml(
                formatShortDate(view.renewal.renewalDate),
              )}
            </div>
            <div style="margin-top:6px;font:400 13px/1.5 system-ui,sans-serif;color:#44403c;">
              ${escapeHtml(explainUrgency(view))}
            </div>
          </td>
        </tr>
        <tr><td style="height:10px;"></td></tr>`;
    })
    .join("");

  const button = appUrl
    ? `<a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#065f46;color:#ffffff;font:600 14px/1 system-ui,sans-serif;text-decoration:none;">Open Renewly</a>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#eef2f0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="padding-bottom:16px;">
      <div style="font:600 12px/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#047857;">Renewly</div>
      <div style="margin-top:8px;font:600 22px/1.3 Georgia,serif;color:#1c1917;">Renew before it lapses.</div>
    </td></tr>
    ${rows}
    <tr><td style="padding-top:8px;">${button}</td></tr>
    <tr><td style="padding-top:18px;font:400 12px/1.5 system-ui,sans-serif;color:#a8a29e;">
      Reminders use a lead time matched to each renewal type, so this arrives while there is still time to act.
      You can turn email reminders off from your profile menu in Renewly.
    </td></tr>
  </table>
</body></html>`;
}
