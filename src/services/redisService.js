import Redis from "ioredis";

const {
  NODE_ENV = "dev",
  REDIS_HOST = "localhost",
  REDIS_PORT = 6379,
  REDIS_PASSWORD,
  REDIS_NAMESPACE = "bonos",
} = process.env;

console.log(`[${NODE_ENV}] 🔧 Inicializando conexión a Redis (${REDIS_HOST}:${REDIS_PORT})...`);

const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD || undefined,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on("connect", () => {
  console.log(`OK Redis conectado correctamente (${REDIS_HOST}:${REDIS_PORT}) [namespace: ${REDIS_NAMESPACE}]`);
});

redis.on("error", (err) => {
  console.error("KO Error al conectar con Redis:", err.message);
});

const ENV = NODE_ENV;
const NAMESPACE = REDIS_NAMESPACE;

/**
 * Genera una clave con el entorno primero.
 * Ejemplo: dev:bonos:comercios
 */
function key(name) {
  return `${ENV}:${NAMESPACE}:${name}`;
}

export async function saveComercios(comercios) {
  await redis.set(key("comercios"), JSON.stringify(comercios));
}

export async function getComercios() {
  const data = await redis.get(key("comercios"));
  return data ? JSON.parse(data) : [];
}

export async function deleteComercios() {
  await redis.del(key("comercios"));
}

export async function saveLastUpdate(date = new Date()) {
  await redis.set(key("last-update"), date.toISOString());
}

export async function getLastUpdate() {
  const date = await redis.get(key("last-update"));
  return date ? new Date(date) : null;
}

export function getRedisKeyBase() {
  return `${ENV}:${NAMESPACE}`;
}

export async function addHistoryEntry({ added, removed, total }) {
  const entry = {
    timestamp: new Date().toISOString(),
    added: added.map(c => c.name),
    removed: removed.map(c => c.name),
    countAfter: total,
  };

  const keyHistory = key("history");
  const existing = await redis.get(keyHistory);
  const history = existing ? JSON.parse(existing) : [];

  history.unshift(entry); // añadimos al principio
  await redis.set(keyHistory, JSON.stringify(history));
}

export async function getHistory() {
  const data = await redis.get(key("history"));
  return data ? JSON.parse(data) : [];
}


export default redis;
