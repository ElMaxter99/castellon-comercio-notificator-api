#!/usr/bin/env node
/**
 * Genera docs/assets/email.png: el correo de "nuevos comercios" renderizado con
 * la plantilla real pero con DATOS FICTICIOS (nunca datos del programa).
 *
 * Uso (requiere Playwright y Chromium; no es dependencia del proyecto):
 *   PLAYWRIGHT_MODULE=/ruta/a/playwright CHROMIUM_PATH=/ruta/chromium node tools/readme-screenshots.cjs
 */
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { getTemplateHtml } = require("../src/services/templateService");
const { MailTemplates } = require("../src/enums/mailTemplates");

const added = [
  { name: "Boutique Naranjo", sector: "Moda y complementos", address: "Carrer Major, 12", phone: "964 000 101" },
  { name: "Moda Azahar", sector: "Moda y complementos", address: "Plaça Central, 5", phone: "964 000 108" },
  { name: "Óptica Mediterránea", sector: "Óptica", address: "Carrer del Sol, 31", phone: "964 000 115" },
  { name: "Juguetes Cascabel", sector: "Juguetería", address: "Avinguda del Mar, 20", phone: "964 000 122" },
  { name: "Librería Tinta y Papel", sector: "Librería, papelería y material de oficina", address: "Carrer Nou, 9", phone: "964 000 129" },
];

(async () => {
  const html = getTemplateHtml(MailTemplates.UPDATE_COMERCIOS, {
    added,
    frontendUrl: "https://ejemplo.invalid/",
    date: "martes, 20 de octubre de 2026, 14:09",
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 820, height: 900 } });
  await page.setContent(html);
  await page.screenshot({ path: path.join(__dirname, "../docs/assets/email.png"), fullPage: true });
  await browser.close();
  console.log("✔ docs/assets/email.png");
})();
