import nodemailer, { type Transporter } from "nodemailer";
import { env, isMailConfigured } from "./env";

/**
 * Gmail SMTP with an app password.
 *
 * Chosen over a transactional provider because it needs no verified domain, so
 * the app can email any address during a demo. Everything mail-related lives
 * behind `sendEmail`, so swapping in Resend or SES later is a one-file change.
 *
 * Note this sends *from* Renewly's own Gmail account. Sending as the signed-in
 * user would need the Gmail API and a much broader OAuth scope, which the app
 * has no reason to hold.
 */
const globalForMail = globalThis as unknown as {
  renewlyTransporter?: Transporter;
};

function transporter(): Transporter {
  if (!isMailConfigured()) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD are not set");
  }
  if (!globalForMail.renewlyTransporter) {
    globalForMail.renewlyTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: env.gmailUser!, pass: env.gmailAppPassword! },
    });
  }
  return globalForMail.renewlyTransporter;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  await transporter().sendMail({
    from: `Renewly <${env.gmailUser}>`,
    ...email,
  });
}
