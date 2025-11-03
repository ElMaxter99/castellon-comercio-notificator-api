const axios = require("axios");
const cheerio = require("cheerio");

const URL = "http://bonoscastellodelaplana.es/establecimientos-adheridos-al-programa";

async function scrapeComercios() {
  const { data: html } = await axios.get(URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const $ = cheerio.load(html);
  const comercios = [];

  $(".col-sm-12.col-md-6.col-xxl-4").each((i, el) => {
    const card = $(el);
    const name = card.find("td strong").first().text().trim();
    const sector = card.find("tr:nth-child(2) td:nth-child(2)").text().trim();
    const phone = card.find("tr:nth-child(3) td:nth-child(2)").text().trim();
    const address = card.find("tr:nth-child(4) td:nth-child(2)").text().trim();
    const img = card.find("img").attr("src")?.replace("../../", "http://bonoscastellodelaplana.es/");
    const mapsUrl = card.find("a").attr("href");

    if (name) {
      comercios.push({
        name,
        sector,
        phone,
        address,
        img,
        mapsUrl,
      });
    }
  });

  return comercios;
}

module.exports = { scrapeComercios };
