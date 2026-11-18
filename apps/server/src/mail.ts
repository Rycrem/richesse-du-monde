import { createTransport } from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

const transport = SMTP_HOST
  ? createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

export const mailEnabled = transport !== null;

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  await transport!.sendMail({ from: MAIL_FROM || SMTP_USER, to, subject, text });
}
