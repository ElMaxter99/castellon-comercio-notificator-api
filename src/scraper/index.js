const axios = require("axios");
const cheerio = require("cheerio");

const logger = require("../utils/logger");

const BASE_URL = "http://bonoscastellodelaplana.es/establecimientos-adheridos-al-programa";

/**
 * Limpia texto (quita espacios y saltos de línea).
 */
function cleanText(text) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Scrapea una sola página de comercios.
 */
async function scrapePage(url) {
  const { data: html } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const $ = cheerio.load(html);
  const comercios = [];

  $(".col-sm-12.col-md-6.col-xxl-4").each((_, el) => {
    const card = $(el);

    const name = cleanText(card.find("td strong").first().text());
    const sector = cleanText(card.find("tr:nth-child(2) td:nth-child(2)").text());
    const phone = cleanText(card.find("tr:nth-child(3) td:nth-child(2)").text());
    const address = cleanText(card.find("tr:nth-child(4) td:nth-child(2)").text());
    const img = card.find("img").attr("src")?.replace("../../", "http://bonoscastellodelaplana.es/");
    const mapsUrl = card.find("a").attr("href");

    if (name) {
      comercios.push({ name, sector, phone, address, img, mapsUrl });
    }
  });

  // Buscar enlace "Siguiente"
  const nextLink = $("a.page-link")
    .filter((_, el) => $(el).text().includes("Siguiente"))
    .attr("href");

  return {
    comercios,
    nextUrl: nextLink && nextLink !== "#" ? nextLink : null,
  };
}

/**
 * Scrapea todas las páginas de comercios adheridos.
 */
async function scrapeComercios() {
  let url = BASE_URL;
  let page = 1;
  let allComercios = [];

  logger.info("Iniciando scrapeo de comercios", { context: "SCRAPER" });

  while (url) {
    logger.debug(`Scrapeando página ${page}`, {
      context: "SCRAPER",
      meta: { page, url },
    });
    const { comercios, nextUrl } = await scrapePage(url);

    allComercios = allComercios.concat(comercios);

    if (nextUrl) {
      // Si el link no es absoluto, lo construimos
      url = nextUrl.startsWith("http")
        ? nextUrl
        : `${BASE_URL}/${nextUrl.replace(/^\//, "")}`;
      page++;
    } else {
      url = null;
    }
  }

  logger.success("Scrapeo completado", {
    context: "SCRAPER",
    meta: { total: allComercios.length },
  });
  return allComercios;
}

module.exports = { scrapeComercios };
