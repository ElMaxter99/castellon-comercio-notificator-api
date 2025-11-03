const Redis = require("ioredis");
const logger = require("../utils/logger");

const {
  REDIS_URL,
  REDIS_HOST = "redis",
  REDIS_PORT = 6379,
  REDIS_PASSWORD,
  REDIS_NAMESPACE = "bonos",
  NODE_ENV = "dev",
} = process.env;

const connectionUri =
  REDIS_URL ||
  `redis://default${REDIS_PASSWORD ? `:${REDIS_PASSWORD}` : ""}@${REDIS_HOST}:${REDIS_PORT}`;

logger.info("Conectando a Redis", {
  context: "REDIS",
  meta: {
    environment: NODE_ENV,
    host: REDIS_HOST,
    port: REDIS_PORT,
    hasPassword: Boolean(REDIS_PASSWORD),
  },
});

const redis = new Redis(connectionUri, {
  db: NODE_ENV === "prod" ? 0 : NODE_ENV === "staging" ? 1 : 2,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on("connect", () => {
  logger.success("Redis conectado correctamente", {
    context: "REDIS",
    meta: { host: REDIS_HOST, port: REDIS_PORT, namespace: REDIS_NAMESPACE },
  });
});

redis.on("error", (err) => {
  logger.error("Error de conexión a Redis", { context: "REDIS", meta: err });
});

const ENV = NODE_ENV;
const NAMESPACE = REDIS_NAMESPACE;

module.exports = {
  redis,
  ENV,
  NAMESPACE,
};
