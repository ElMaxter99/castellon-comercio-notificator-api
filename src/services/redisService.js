import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

const ENV = process.env.NODE_ENV || "dev";
const NAMESPACE = process.env.REDIS_NAMESPACE || "bonos";

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

export default redis;
