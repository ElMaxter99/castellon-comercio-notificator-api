// Datos de demostración (ficticios) para MOCK_MODE: nada sale de Redis ni de la web oficial.
const comercios = require("../mock/comercios.json");
const history = require("../mock/history.json");

/** Fecha fija de la «última actualización» de la demostración. */
const MOCK_LAST_UPDATE = new Date("2026-11-20T00:00:00Z");

async function getComercios() {
  return comercios;
}

async function getHistory() {
  return history;
}

async function getSectors() {
  return [...new Set(comercios.map((c) => c.sector || "Sin sector"))];
}

async function getLastUpdate() {
  return MOCK_LAST_UPDATE;
}

module.exports = { getComercios, getHistory, getSectors, getLastUpdate, MOCK_LAST_UPDATE };
