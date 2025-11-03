import Redis from "ioredis";

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

console.log(`[${NODE_ENV}] 🔧 Conectando a Redis → ${connectionUri}`);

export const redis = new Redis(connectionUri, {
  db: NODE_ENV === "prod" ? 0 : NODE_ENV === "staging" ? 1 : 2,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on("connect", () => {
  console.log(`✅ Redis conectado correctamente (${REDIS_HOST}:${REDIS_PORT}) [namespace: ${REDIS_NAMESPACE}]`);
});

redis.on("error", (err) => {
  console.error(`❌ Error de conexión a Redis:`, err.message);
});

export const ENV = NODE_ENV;
export const NAMESPACE = REDIS_NAMESPACE;
