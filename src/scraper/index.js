const axios = require("axios");
const cheerio = require("cheerio");

const logger = require("../utils/logger");

const SITE_ORIGIN = "https://bonoscastellodelaplana.es";
const BASE_URL = `${SITE_ORIGIN}/establecimientos-adheridos-al-programa`;

const REQUEST_TIMEOUT_MS = 20000;
const MAX_RETRIES = 2;
const MAX_PAGES = 200; // tope de seguridad ante bucles de paginación

// La web añade "MUNICIPIO / MUNICIPIO, COMUNITAT VALENCIANA, CP, ESPAÑA" a cada dirección.
const ADDRESS_SUFFIX =
  /\s*,?\s*(?:CASTELL[ÓO] DE LA PLANA\s*)?\/?\s*CASTELL[ÓO]N DE LA PLANA\s*,\s*COMUNITAT VALENCIANA\s*,\s*\d{5}\s*,\s*ESPA[ÑN]A\s*$/i;

/**
 * Limpia texto (quita espacios y saltos de línea).
 */
function cleanText(text) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Quita el sufijo repetitivo de la dirección ("CASTELLÓ DE LA PLANA / ..., ESPAÑA").
 */
function cleanAddress(address) {
  return cleanText(address).replace(ADDRESS_SUFFIX, "");
}

/**
 * Resuelve una URL (relativa o absoluta) contra la web oficial y fuerza https.
 */
function toAbsoluteUrl(href, base = BASE_URL) {
  if (!href) return undefined;
  try {
    const url = new URL(href, base);
    if (url.protocol === "http:") url.protocol = "https:";
    return url.toString();
  } catch {
    return undefined;
  }
}

async function fetchHtml(url) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data } = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: REQUEST_TIMEOUT_MS,
      });
      return data;
    } catch (err) {
      lastError = err;
      logger.warn("Fallo al descargar página, reintentando", {
        context: "SCRAPER",
        meta: { url, attempt: attempt + 1, error: err.message },
      });
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}

/**
 * Scrapea una sola página de comercios.
 */
async function scrapePage(url) {
  const html = await fetchHtml(url);

  const $ = cheerio.load(html);
  const comercios = [];

  $(".col-sm-12.col-md-6.col-xxl-4").each((_, el) => {
    const card = $(el);

    const name = cleanText(card.find("td strong").first().text());
    const sector = cleanText(card.find("tr:nth-child(2) td:nth-child(2)").text());
    const phone = cleanText(card.find("tr:nth-child(3) td:nth-child(2)").text());
    const address = cleanAddress(card.find("tr:nth-child(4) td:nth-child(2)").text());
    const img = toAbsoluteUrl(card.find("img").attr("src"), url);
    const mapsUrl = card.find("a").attr("href");

    if (name) {
      comercios.push({ name, sector, phone, address, img, mapsUrl });
    }
  });

  // Enlace "Siguiente" (deshabilitado en la última página: href="#")
  const nextLink = $("a.page-link")
    .filter((_, el) => $(el).text().includes("Siguiente"))
    .attr("href");

  return {
    comercios,
    nextUrl: nextLink && nextLink !== "#" ? toAbsoluteUrl(nextLink, url) : null,
  };
}

/**
 * Scrapea todas las páginas de comercios adheridos.
 */
async function scrapeComercios() {
  let url = BASE_URL;
  let page = 1;
  const visited = new Set();
  let allComercios = [];

  logger.info("Iniciando scrapeo de comercios", { context: "SCRAPER" });

  while (url && !visited.has(url) && page <= MAX_PAGES) {
    visited.add(url);
    logger.debug(`Scrapeando página ${page}`, {
      context: "SCRAPER",
      meta: { page, url },
    });
    const { comercios, nextUrl } = await scrapePage(url);

    allComercios = allComercios.concat(comercios);
    url = nextUrl;
    page++;
  }

  logger.success("Scrapeo completado", {
    context: "SCRAPER",
    meta: { total: allComercios.length, pages: visited.size },
  });
  return allComercios;
}

module.exports = { scrapeComercios, scrapePage, cleanAddress, toAbsoluteUrl };
