const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeGeo, sanitizeAll, parseMapsCoords, hasForeignPostalCode, distanceKm, config } = require("../src/utils/geo");

const maps = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
const cfg = config({});

test("parseMapsCoords extrae lat/lng y devuelve null si no hay", () => {
  assert.deepEqual(parseMapsCoords(maps(39.97, -0.03)), [39.97, -0.03]);
  assert.equal(parseMapsCoords("https://www.google.com/maps/search/?api=1&query=Calle%20Mayor,%20Castell%C3%B3"), null);
  assert.equal(parseMapsCoords(undefined), null);
  assert.equal(parseMapsCoords("no es una url"), null);
});

test("distanceKm: Castelló–Valencia ronda los 60 km", () => {
  const km = distanceKm([39.986359, -0.037652], [39.4699, -0.3763]);
  assert.ok(km > 55 && km < 70, `km=${km}`);
});

test("hasForeignPostalCode solo marca códigos de otra provincia", () => {
  assert.equal(hasForeignPostalCode("CARRER MAJOR 5, 12001"), false);
  assert.equal(hasForeignPostalCode("Calle X, León, Castilla y León, 24005, España"), true);
  assert.equal(hasForeignPostalCode("AVENIDA ALCORA Nº100"), false); // "100" no es un código postal
  assert.equal(hasForeignPostalCode(""), false);
});

test("un comercio dentro de la zona no se toca", () => {
  const commerce = { name: "A", address: "Carrer Major, 1", mapsUrl: maps(39.99, -0.04) };
  const result = sanitizeGeo(commerce, cfg);
  assert.equal(result.action, "ok");
  assert.equal(result.commerce, commerce);
});

test("coordenadas lejanas con dirección local: se sustituye mapsUrl por búsqueda por dirección", () => {
  const commerce = { name: "B", address: "AVENIDA ALCORA Nº100", mapsUrl: maps(38.53, -0.19) };
  const result = sanitizeGeo(commerce, cfg);
  assert.equal(result.action, "fixed");
  assert.equal(parseMapsCoords(result.commerce.mapsUrl), null);
  assert.match(decodeURIComponent(result.commerce.mapsUrl), /AVENIDA ALCORA Nº100, Castelló de la Plana/);
  assert.equal(result.commerce.name, "B"); // el resto de campos se conserva
});

test("coordenadas lejanas y código postal de otra provincia: se excluye", () => {
  const commerce = { name: "C", address: "Prolongación Ingeniero Sáenz de Miera, León, 24005, España", mapsUrl: maps(42.57, -5.57) };
  assert.equal(sanitizeGeo(commerce, cfg).action, "excluded");
});

test("sanitizeAll resume lo corregido y lo excluido", () => {
  const list = [
    { name: "ok", address: "x", mapsUrl: maps(39.98, -0.03) },
    { name: "fix", address: "Plaza Y 1", mapsUrl: maps(40.49, 0.02) },
    { name: "out", address: "Calle Z, 24005", mapsUrl: maps(42.57, -5.57) },
    { name: "sin coords", address: "w", mapsUrl: "" },
  ];
  const { commerces, fixed, excluded } = sanitizeAll(list, cfg);
  assert.deepEqual(commerces.map((c) => c.name), ["ok", "fix", "sin coords"]);
  assert.deepEqual(fixed.map((c) => c.name), ["fix"]);
  assert.deepEqual(excluded.map((c) => c.name), ["out"]);
});

test("el radio y el centro se pueden configurar", () => {
  const wide = config({ GEO_RADIUS_KM: "100" });
  const commerce = { name: "D", address: "x", mapsUrl: maps(40.49, 0.02) }; // ~56 km
  assert.equal(sanitizeGeo(commerce, wide).action, "ok");
});
