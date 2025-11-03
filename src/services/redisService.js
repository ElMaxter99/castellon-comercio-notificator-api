import { redis, ENV, NAMESPACE } from "../config/redis";

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

export async function addHistoryEntry({ added, removed, total }) {
  const entry = {
    timestamp: new Date().toISOString(),
    added: added.map((c) => c.name),
    removed: removed.map((c) => c.name),
    countAfter: total,
  };

  const keyHistory = key("history");
  const existing = await redis.get(keyHistory);
  const history = existing ? JSON.parse(existing) : [];

  history.unshift(entry);
  await redis.set(keyHistory, JSON.stringify(history));
}

export async function getHistory() {
  const data = await redis.get(key("history"));
  return data ? JSON.parse(data) : [];
}

export default redis;
