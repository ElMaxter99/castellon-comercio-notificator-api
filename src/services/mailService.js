const axios = require("axios");
const nodemailer = require("nodemailer");
const { MailTemplates } = require("../enums/mailTemplates");
const { getTemplateHtml } = require("./templateService");
const logger = require("../utils/logger");

const {
  MAIL_PROVIDER = "smtp",
  MAIL_HOST,
  MAIL_PORT = "587",
  MAIL_SECURE,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM,
  MAIL_TO,
  MAIL_ENABLED = "true",
  RESEND_API_KEY,
  FRONTEND_URL,
} = process.env;

const RESEND_URL = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 15000;
const DEFAULT_RESEND_FROM = "Bonos Castelló API <onboarding@resend.dev>";
const FROM_NAME = "Bonos Castelló API";

const secure = MAIL_SECURE === "true" || Number(MAIL_PORT) === 465;

function resolveProvider() {
  const provider = String(MAIL_PROVIDER).trim().toLowerCase();
  if (provider === "smtp" || provider === "resend") return provider;
  logger.warn(`MAIL_PROVIDER="${MAIL_PROVIDER}" no válido, se usará smtp`, {
    context: "MAIL",
  });
  return "smtp";
}

const provider = resolveProvider();

/** Destinatarios separados por comas (MAIL_TO="a@x.com, b@y.com"). */
function recipients() {
  return String(MAIL_TO || "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------- SMTP
let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: Number(MAIL_PORT),
      secure,
      auth: { user: MAIL_USER, pass: MAIL_PASS },
      tls: { minVersion: "TLSv1.2" },
    });
  }
  return transporter;
}

const smtpProvider = {
  async verify() {
    await getTransporter().verify();
    logger.success("SMTP verificado correctamente", {
      context: "MAIL",
      meta: { host: MAIL_HOST, port: MAIL_PORT, secure },
    });
  },

  async send({ to, subject, html }) {
    await getTransporter().sendMail({
      from: MAIL_FROM || `"${FROM_NAME}" <${MAIL_USER}>`,
      to,
      subject,
      html,
    });
  },
};

// -------------------------------------------------------------- Resend
/** Resume un error de axios sin exponer cabeceras (llevan la API key). */
function describeHttpError(e) {
  return {
    message: e.message,
    status: e.response?.status,
    detail: e.response?.data,
  };
}

const resendProvider = {
  async verify() {
    // Resend no ofrece un "ping" que funcione con claves de solo envío:
    // se valida únicamente la configuración.
    if (!RESEND_API_KEY) {
      throw new Error("Falta RESEND_API_KEY");
    }
    logger.success("Resend configurado", {
      context: "MAIL",
      meta: { from: MAIL_FROM || DEFAULT_RESEND_FROM },
    });
    if (!MAIL_FROM) {
      logger.warn(
        "MAIL_FROM no definido: se usa onboarding@resend.dev, que solo entrega al correo de tu cuenta de Resend",
        { context: "MAIL" }
      );
    }
  },

  async send({ to, subject, html }) {
    if (!RESEND_API_KEY) {
      throw new Error("Falta RESEND_API_KEY");
    }
    try {
      const { data } = await axios.post(
        RESEND_URL,
        { from: MAIL_FROM || DEFAULT_RESEND_FROM, to, subject, html },
        {
          headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
          timeout: RESEND_TIMEOUT_MS,
        }
      );
      logger.debug("Respuesta de Resend", { context: "MAIL", meta: { id: data?.id } });
    } catch (e) {
      const error = new Error(`Resend rechazó el envío: ${JSON.stringify(describeHttpError(e))}`);
      throw error;
    }
  },
};

const providers = { smtp: smtpProvider, resend: resendProvider };
const mailer = providers[provider];

// ------------------------------------------------------------ Público
async function verifyMailer() {
  if (MAIL_ENABLED !== "true") {
    logger.warn("MAIL_ENABLED=false → no se enviarán correos", {
      context: "MAIL",
    });
    return;
  }
  logger.info(`Proveedor de correo: ${provider}`, { context: "MAIL" });
  try {
    await mailer.verify();
  } catch (e) {
    logger.error(`Verificación del correo (${provider}) falló`, {
      context: "MAIL",
      meta: e,
    });
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

  const to = recipients();
  if (to.length === 0) {
    logger.error("MAIL_TO vacío: no hay destinatarios", { context: "MAIL" });
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
    await mailer.send({ to, subject, html });
    logger.success("Correo enviado", {
      context: "MAIL",
      meta: { provider, added: added.length, to },
    });
  } catch (e) {
    logger.error(`Error enviando correo (${provider})`, { context: "MAIL", meta: e });
  }
}

module.exports = { verifyMailer, sendDiffEmail };
