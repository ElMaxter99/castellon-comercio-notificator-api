// Origen de los datos que sirven las rutas: Redis (normal) o los datos de demostración (MOCK_MODE).
const { isMockMode } = require("../utils/mockMode");

const MOCK = isMockMode();
const source = MOCK ? require("./mockData") : require("./redisService");

module.exports = {
  MOCK,
  getComercios: source.getComercios,
  getHistory: source.getHistory,
  getSectors: source.getSectors,
  getLastUpdate: source.getLastUpdate,
};
