import Redis from "ioredis";

const {
  REDIS_HOST = "localhost",
  REDIS_PORT = 6379,
  REDIS_PASSWORD,
  REDIS_NAMESPACE = "bonos",
  NODE_ENV = "dev",
} = process.env;

console.log(`~ [${NODE_ENV}] Inicializando Redis...`);

export const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD || undefined,
  db: NODE_ENV === "prod" ? 0 : NODE_ENV === "staging" ? 1 : 2,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on("connect", () => {
  console.log(`OK Redis conectado (${REDIS_HOST}:${REDIS_PORT}) [${REDIS_NAMESPACE}]`);
});

redis.on("error", (err) => {
  console.error("KO Error de conexión a Redis:", err.message);
});
