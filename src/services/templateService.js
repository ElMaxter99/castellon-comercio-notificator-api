const fs = require("fs");
const path = require("path");
const { MailTemplates } = require("../enums/mailTemplates");
const { escapeHtml } = require("../utils/sanitize");

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
      const { added = [], frontendUrl, date } = data;
      const totalChanges = added.length;

      const grouped = added.reduce((acc, comercio) => {
        const sector = comercio.sector || "Sin sector";
        if (!acc[sector]) acc[sector] = [];
        acc[sector].push(comercio);
        return acc;
      }, {});

      const groupedSections = Object.entries(grouped)
        .map(([sector, comercios]) => {
          const items = comercios
            .map(
              (c) => `
                <li>
                  <strong>${escapeHtml(c.name)}</strong><br/>
                  <span class="address">${escapeHtml(c.address)}</span><br/>
                  ${c.phone ? `<span class="phone">📞 ${escapeHtml(c.phone)}</span>` : ""}
                </li>`
            )
            .join("");

          return `
            <div class="section">
              <h2>🟢 ${escapeHtml(sector)} (${comercios.length})</h2>
              <ul>${items}</ul>
            </div>`;
        })
        .join("");

      return renderTemplate("updateEmail.html", {
        date: escapeHtml(date),
        totalChanges,
        addedSection: groupedSections,
        removedSection: "",
        noChangesMessage:
          !added.length
            ? `<p>No se han detectado nuevos comercios adheridos.</p>`
            : "",
        frontendUrl:
          escapeHtml(
            frontendUrl ||
          "http://bonoscastellodelaplana.es/establecimientos-adheridos-al-programa",
          ),
      });
    }

    default:
      throw new Error(`Plantilla no soportada: ${templateType}`);
  }
}

module.exports = { getTemplateHtml };
