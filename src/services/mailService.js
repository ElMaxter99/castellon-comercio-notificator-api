const nodemailer = require("nodemailer");
const { MailTemplates } = require("../enums/mailTemplates");
const { getTemplateHtml } = require("./templateService");
const logger = require("../utils/logger");

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
    logger.warn("MAIL_ENABLED=false → no se enviarán correos", {
      context: "MAIL",
    });
    return;
  }
  try {
    await transporter.verify();
    logger.success("SMTP verificado correctamente", {
      context: "MAIL",
      meta: { host: MAIL_HOST, port: MAIL_PORT, secure },
    });
  } catch (e) {
    logger.error("SMTP verify falló", { context: "MAIL", meta: e });
  }
}

/**
 * Envia un correo SOLO con los comercios añadidos
 */
async function sendDiffEmail({ added }) {
  if (MAIL_ENABLED !== "true") {
    logger.warn("MAIL_ENABLED=false → skip", { context: "MAIL" });
    return;
  }
  if (!added || added.length === 0) {
    logger.info("Ningún comercio nuevo que notificar", { context: "MAIL" });
    return;
  }

  const now = new Date();
  const formattedDate = now.toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "full",
    timeStyle: "short",
  });

  const subject = `🆕 ${added.length} nuevo${added.length > 1 ? "s" : ""} comercio${added.length > 1 ? "s" : ""} adherido${added.length > 1 ? "s" : ""} – ${formattedDate}`;

  const html = getTemplateHtml(MailTemplates.UPDATE_COMERCIOS, {
    added,
    removed: [],
    frontendUrl: FRONTEND_URL,
    date: formattedDate,
  });

  try {
    await transporter.sendMail({
      from: `"Bonos Castelló API" <${MAIL_USER}>`,
      to: MAIL_TO,
      subject,
      html,
    });
    logger.success("Correo enviado", {
      context: "MAIL",
      meta: { added: added.length, to: MAIL_TO },
    });
  } catch (e) {
    logger.error("Error enviando correo (SMTP)", { context: "MAIL", meta: e });
  }
}

module.exports = { verifyMailer, sendDiffEmail };
