const nodemailer = require("nodemailer");
const { MailTemplates } = require("../enums/mailTemplates");
const { getTemplateHtml } = require("./templateService");

const {
  MAIL_HOST,
  MAIL_PORT = "587",
  MAIL_SECURE,
  MAIL_USER,
  MAIL_PASS,
  MAIL_TO,
  MAIL_ENABLED = "true",
  FRONTEND_URL,
} = process.env;

const secure = MAIL_SECURE === "true" || Number(MAIL_PORT) === 465;

const transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: Number(MAIL_PORT),
  secure,
  auth: { user: MAIL_USER, pass: MAIL_PASS },
  tls: { minVersion: "TLSv1.2" },
});

async function verifyMailer() {
  if (MAIL_ENABLED !== "true") {
    console.log("📪 MAIL_ENABLED=false → no se enviarán correos.");
    return;
  }
  try {
    await transporter.verify();
    console.log(`📧 SMTP OK (${MAIL_HOST}:${MAIL_PORT}, secure=${secure})`);
  } catch (e) {
    console.error("❌ SMTP verify falló:", e.message);
  }
}

async function sendDiffEmail({ added, removed }) {
  if (MAIL_ENABLED !== "true") {
    console.log("📪 MAIL_ENABLED=false → skip");
    return;
  }
  if (!added.length && !removed.length) return;

  const html = getTemplateHtml(MailTemplates.UPDATE_COMERCIOS, {
    added,
    removed,
    frontendUrl: FRONTEND_URL,
  });

  try {
    await transporter.sendMail({
      from: `"Bonos Castelló API" <${MAIL_USER}>`,
      to: MAIL_TO,
      subject: "📰 Actualización de Comercios Adheridos",
      html,
    });
    console.log("📧 Correo enviado correctamente ✅");
  } catch (e) {
    console.error("❌ Error enviando correo (SMTP):", e.message);
  }
}

module.exports = {
  verifyMailer,
  sendDiffEmail,
};
