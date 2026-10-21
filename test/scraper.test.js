const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const axios = require("axios");

const { scrapePage, scrapeComercios, cleanAddress, toAbsoluteUrl } = require("../src/scraper/index");
const { DEFAULT_USER_AGENT } = require("../src/utils/userAgent");

const fixture = (name) => fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
const BASE = "https://bonoscastellodelaplana.es/establecimientos-adheridos-al-programa";
const PAGE2 = `${BASE}?page=2`;

const realGet = axios.get;
test.afterEach(() => {
  axios.get = realGet;
});

function stubWeb(pages) {
  const calls = [];
  axios.get = async (url, options) => {
    calls.push({ url, options });
    if (!(url in pages)) throw Object.assign(new Error(`404 ${url}`), { response: { status: 404 } });
    return { data: pages[url] };
  };
  return calls;
}

test("cleanAddress quita el sufijo repetitivo de la web", () => {
  assert.equal(
    cleanAddress("CALLE MAYOR, 1, CASTELLÓ DE LA PLANA / CASTELLÓN DE LA PLANA, COMUNITAT VALENCIANA, 12001, ESPAÑA"),
    "CALLE MAYOR, 1"
  );
  assert.equal(cleanAddress("  PLAZA  X  "), "PLAZA X");
});

test("toAbsoluteUrl resuelve rutas relativas y fuerza https", () => {
  assert.equal(toAbsoluteUrl("/img/a.jpg"), "https://bonoscastellodelaplana.es/img/a.jpg");
  assert.equal(toAbsoluteUrl("http://bonoscastellodelaplana.es/x"), "https://bonoscastellodelaplana.es/x");
  assert.equal(toAbsoluteUrl(undefined), undefined);
});

test("scrapePage extrae los comercios y el enlace «Siguiente»", async () => {
  stubWeb({ [BASE]: fixture("pagina1.html") });
  const { comercios, nextUrl } = await scrapePage(BASE);

  assert.equal(comercios.length, 2);
  assert.deepEqual(comercios[0], {
    name: "PANADERÍA EJEMPLO",
    sector: "Alimentación",
    phone: "964 000 001",
    address: "CALLE MAYOR, 1",
    img: "https://bonoscastellodelaplana.es/img/a.jpg",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=39.9864,-0.0376",
  });
  assert.equal(comercios[1].name, "LIBRERÍA DEMO", "colapsa espacios repetidos");
  assert.equal(comercios[1].img, "https://bonoscastellodelaplana.es/img/b.jpg", "imagen http → https");
  assert.equal(nextUrl, PAGE2);
});

test("en la última página «Siguiente» (href=#) no devuelve nextUrl", async () => {
  stubWeb({ [BASE]: fixture("pagina2.html") });
  const { comercios, nextUrl } = await scrapePage(BASE);
  assert.equal(comercios.length, 1);
  assert.equal(nextUrl, null);
});

test("una página sin tarjetas (la web cambió) devuelve 0 comercios, sin romper", async () => {
  stubWeb({ [BASE]: "<html><body><p>Mantenimiento</p></body></html>" });
  const { comercios, nextUrl } = await scrapePage(BASE);
  assert.deepEqual(comercios, []);
  assert.equal(nextUrl, null);
});

test("scrapeComercios recorre la paginación y se identifica con el User-Agent", async () => {
  const calls = stubWeb({ [BASE]: fixture("pagina1.html"), [PAGE2]: fixture("pagina2.html") });
  const all = await scrapeComercios();

  assert.deepEqual(
    all.map((x) => x.name),
    ["PANADERÍA EJEMPLO", "LIBRERÍA DEMO", "FERRETERÍA FICTICIA"]
  );
  assert.deepEqual(calls.map((x) => x.url), [BASE, PAGE2]);
  assert.equal(calls[0].options.headers["User-Agent"], DEFAULT_USER_AGENT);
});

test("un «Siguiente» que apunta a una página ya visitada no genera un bucle", async () => {
  const loop = fixture("pagina1.html").replace(PAGE2.replace("https", "http"), BASE);
  const calls = stubWeb({ [BASE]: loop });
  const all = await scrapeComercios();
  assert.equal(all.length, 2);
  assert.equal(calls.length, 1);
});
