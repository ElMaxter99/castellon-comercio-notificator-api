import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MailTemplates } from "./enums/mailTemplates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "../templates");

function renderTemplate(templatePath, vars = {}) {
  let html = fs.readFileSync(templatePath, "utf8");
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value ?? "");
  }
  return html;
}

export function getTemplateHtml(templateType, data) {
  switch (templateType) {
    case MailTemplates.UPDATE_COMERCIOS: {
      const templatePath = path.join(templatesDir, "updateEmail.html");

      const { added = [], removed = [], frontendUrl } = data;
      const totalChanges = added.length + removed.length;
      const date = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });

      const addedSection = added.length
        ? `
        <div class="section">
          <h2>🟢 Nuevos comercios (${added.length})</h2>
          <ul>
            ${added
              .map(
                c => `
                <li>
                  <strong>${c.name}</strong><br/>
                  <span class="sector">${c.sector || "Sin sector"}</span><br/>
                  <span class="address">${c.address || ""}</span>
                </li>`
              )
              .join("")}
          </ul>
        </div>`
        : "";

      const removedSection = removed.length
        ? `
        <div class="section">
          <h2>🔴 Comercios eliminados (${removed.length})</h2>
          <ul>
            ${removed
              .map(
                c => `
                <li>
                  <strong>${c.name}</strong><br/>
                  <span class="sector">${c.sector || "Sin sector"}</span><br/>
                  <span class="address">${c.address || ""}</span>
                </li>`
              )
              .join("")}
          </ul>
        </div>`
        : "";

      const noChangesMessage =
        !added.length && !removed.length
          ? `<p>No se han detectado cambios en los comercios adheridos.</p>`
          : "";

      return renderTemplate(templatePath, {
        date,
        totalChanges,
        addedSection,
        removedSection,
        noChangesMessage,
        frontendUrl:
          frontendUrl ||
          "http://bonoscastellodelaplana.es/establecimientos-adheridos-al-programa",
      });
    }

    default:
      throw new Error(`Plantilla no soportada: ${templateType}`);
  }
}
