const fs = require("fs");
const path = require("path");
const { MailTemplates } = require("../enums/mailTemplates");

const templatesDir = path.join(__dirname, "../templates");

function renderTemplate(templateName, vars = {}) {
  const templatePath = path.join(templatesDir, templateName);
  let html = fs.readFileSync(templatePath, "utf8");
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value ?? "");
  }
  return html;
}

function getTemplateHtml(templateType, data) {
  switch (templateType) {
    case MailTemplates.UPDATE_COMERCIOS: {
      const { added = [], removed = [], frontendUrl } = data;
      const totalChanges = added.length + removed.length;
      const date = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });

      const addedSection = added.length
        ? added
            .map(
              (c) => `
                <li>
                  <strong>${c.name}</strong><br/>
                  <span class="sector">${c.sector || "Sin sector"}</span><br/>
                  <span class="address">${c.address || ""}</span>
                </li>`
            )
            .join("")
        : "";

      const removedSection = removed.length
        ? removed
            .map(
              (c) => `
                <li>
                  <strong>${c.name}</strong><br/>
                  <span class="sector">${c.sector || "Sin sector"}</span><br/>
                  <span class="address">${c.address || ""}</span>
                </li>`
            )
            .join("")
        : "";

      return renderTemplate("updateEmail.html", {
        date,
        totalChanges,
        addedSection: addedSection
          ? `<div class="section"><h2>🟢 Nuevos comercios (${added.length})</h2><ul>${addedSection}</ul></div>`
          : "",
        removedSection: removedSection
          ? `<div class="section"><h2>🔴 Comercios eliminados (${removed.length})</h2><ul>${removedSection}</ul></div>`
          : "",
        noChangesMessage:
          !added.length && !removed.length
            ? `<p>No se han detectado cambios en los comercios adheridos.</p>`
            : "",
        frontendUrl:
          frontendUrl ||
          "http://bonoscastellodelaplana.es/establecimientos-adheridos-al-programa",
      });
    }

    default:
      throw new Error(`Plantilla no soportada: ${templateType}`);
  }
}

module.exports = { getTemplateHtml };
