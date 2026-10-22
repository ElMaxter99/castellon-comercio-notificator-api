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

/** Campos cuyo cambio se notifica como «modificado» (la imagen se ignora: su URL cambia sin avisar). */
const TRACKED_FIELDS = ["sector", "phone", "address", "mapsUrl"];

function changedFields(before, after) {
  return TRACKED_FIELDS.filter((field) => normalize(before[field]) !== normalize(after[field]));
}

/**
 * Empareja los comercios de un mismo nombre: primero por dirección y, con lo que sobre, por
 * orden (una dirección corregida). Lo que quede sin pareja es alta (nuevos) o baja (antiguos).
 */
function pairGroup(olds, news) {
  const oldByAddress = new Map();
  for (const old of olds) {
    const addr = normalize(old.address);
    if (!oldByAddress.has(addr)) oldByAddress.set(addr, []);
    oldByAddress.get(addr).push(old);
  }

  const pairs = [];
  const unpairedNew = [];
  for (const item of news) {
    const candidates = oldByAddress.get(normalize(item.address));
    if (candidates?.length) pairs.push([candidates.shift(), item]);
    else unpairedNew.push(item);
  }

  const paired = new Set(pairs.map(([old]) => old));
  const unpairedOld = olds.filter((old) => !paired.has(old));

  const shared = Math.min(unpairedNew.length, unpairedOld.length);
  for (let i = 0; i < shared; i++) pairs.push([unpairedOld[i], unpairedNew[i]]);

  return {
    pairs,
    added: unpairedNew.slice(shared),
    removed: unpairedOld.slice(shared),
  };
}

/**
 * Altas, bajas y modificaciones entre dos listados.
 * - Se compara por nombre (sin mayúsculas, acentos ni espacios repetidos).
 * - Si un nombre aparece varias veces (comercios homónimos), la dirección sirve para emparejarlos.
 * - Un comercio emparejado cuyo sector, teléfono, dirección o enlace de mapa han cambiado es una
 *   modificación (`{ name, before, after, changes }`), no una alta ni una baja.
 */
function diffComercios(oldList, newList) {
  const oldGroups = groupByName(oldList);
  const newGroups = groupByName(newList);
  const added = new Set();
  const removed = new Set();
  const modified = new Map();

  for (const key of new Set([...oldGroups.keys(), ...newGroups.keys()])) {
    const group = pairGroup(oldGroups.get(key) || [], newGroups.get(key) || []);
    group.added.forEach((item) => added.add(item));
    group.removed.forEach((item) => removed.add(item));
    for (const [before, after] of group.pairs) {
      const changes = changedFields(before, after);
      if (changes.length) modified.set(after, { name: after.name, before, after, changes });
    }
  }

  return {
    added: newList.filter((c) => added.has(c)),
    removed: oldList.filter((c) => removed.has(c)),
    modified: newList.filter((c) => modified.has(c)).map((c) => modified.get(c)),
  };
}

module.exports = { diffComercios, TRACKED_FIELDS };
