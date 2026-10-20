const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { configureQueryParser } = require("../src/utils/expressSetup");

async function getJson(port, path) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  return res.json();
}

test("el parseador de query 'extended' mantiene name[] / sector[a] como array / objeto (validación del filtro)", async () => {
  const app = express();
  configureQueryParser(app);
  app.get("/echo", (req, res) => res.json(req.query));

  const server = app.listen(0);
  try {
    const { port } = server.address();
    const query = await getJson(port, "/echo?name[]=x&sector[a]=1&q=hola");

    assert.ok(Array.isArray(query.name), "name[]=x debe llegar como array");
    assert.equal(typeof query.sector, "object", "sector[a]=1 debe llegar como objeto");
    assert.equal(query.q, "hola");
  } finally {
    server.close();
  }
});

test("un valor repetido llega como array (también debe rechazarse)", async () => {
  const app = express();
  configureQueryParser(app);
  app.get("/echo", (req, res) => res.json(req.query));

  const server = app.listen(0);
  try {
    const query = await getJson(server.address().port, "/echo?name=a&name=b");
    assert.ok(Array.isArray(query.name));
  } finally {
    server.close();
  }
});
