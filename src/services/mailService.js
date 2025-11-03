import nodemailer from "nodemailer";
import { MailTemplates } from "./enums/mailTemplates.js";
import { getTemplateHtml } from "./templateService.js";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendDiffEmail({ added, removed }) {
  if (!added.length && !removed.length) return;

  const html = getTemplateHtml(MailTemplates.UPDATE_COMERCIOS, {
    added,
    removed,
    frontendUrl: process.env.FRONTEND_URL,
  });

  await transporter.sendMail({
    from: `"Bonos Castelló API" <${process.env.MAIL_USER}>`,
    to: process.env.MAIL_TO,
    subject: "📰 Actualización de Comercios Adheridos",
    html,
  });

  console.log("📧 Correo de actualización enviado correctamente");
}
