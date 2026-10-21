/** Clave de comparación: sin mayúsculas, acentos ni espacios repetidos. */
function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function groupByName(list) {
  const groups = new Map();
  for (const item of list) {
    const key = normalize(item.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

/**
 * De `items` (mismo nombre) elige los `count` que no tienen pareja en `others` por dirección.
 * Así, con dos comercios homónimos, se detecta cuál es el nuevo.
 */
function pickUnmatched(items, others, count) {
  const remaining = new Map();
  for (const o of others) {
    const addr = normalize(o.address);
    remaining.set(addr, (remaining.get(addr) || 0) + 1);
  }
  const unmatched = [];
  for (const item of items) {
    const addr = normalize(item.address);
    if (remaining.get(addr) > 0) remaining.set(addr, remaining.get(addr) - 1);
    else unmatched.push(item);
  }
  return unmatched.slice(0, count);
}

/**
 * Altas y bajas entre dos listados.
 * - Se compara por nombre (sin mayúsculas, acentos ni espacios repetidos).
 * - Si un nombre aparece varias veces (comercios homónimos), cuenta cuántos hay y usa la
 *   dirección solo para decidir cuál es el alta o la baja. Corregir la dirección de un comercio
 *   no genera una alta ni una baja.
 */
function diffComercios(oldList, newList) {
  const oldGroups = groupByName(oldList);
  const newGroups = groupByName(newList);
  const added = new Set();
  const removed = new Set();

  for (const [key, news] of newGroups) {
    const olds = oldGroups.get(key) || [];
    if (news.length > olds.length) {
      for (const item of pickUnmatched(news, olds, news.length - olds.length)) added.add(item);
    }
  }
  for (const [key, olds] of oldGroups) {
    const news = newGroups.get(key) || [];
    if (olds.length > news.length) {
      for (const item of pickUnmatched(olds, news, olds.length - news.length)) removed.add(item);
    }
  }

  return {
    added: newList.filter((c) => added.has(c)),
    removed: oldList.filter((c) => removed.has(c)),
  };
}

module.exports = { diffComercios };
