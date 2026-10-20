const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const { configureQueryParser } = require("../src/utils/expressSetup");

function getJson(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get({ port, path }, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(JSON.parse(body)));
      })
      .on("error", reject);
  });
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
