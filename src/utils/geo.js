/**
 * Saneado geográfico del catálogo. La web oficial geocodifica mal algunos comercios
 * (p. ej. una avenida de Castelló situada en Alicante) y hay alguna entrada ajena
 * (el proveedor de la web, en León). Un solo punto lejano rompe el mapa del front.
 *
 * - Coordenadas fuera de la zona → se sustituye `mapsUrl` por una búsqueda por dirección
 *   (el comercio sigue en la lista y "Cómo llegar" funciona; solo se omite su marcador).
 * - Coordenadas fuera de la zona Y código postal de otra provincia → se excluye del catálogo.
 *
 * Configurable: GEO_CENTER_LAT, GEO_CENTER_LNG, GEO_RADIUS_KM, GEO_CITY.
 */
const DEFAULT_CENTER = { lat: 39.986359, lng: -0.037652 }; // Castelló de la Plana
const DEFAULT_RADIUS_KM = 30;
const DEFAULT_CITY = "Castelló de la Plana";
const HOME_POSTAL_PREFIX = "12"; // provincia de Castellón

function config(env = process.env) {
  const num = (value, fallback) => (Number.isFinite(Number(value)) && value !== undefined && value !== "" ? Number(value) : fallback);
  return {
    center: {
      lat: num(env.GEO_CENTER_LAT, DEFAULT_CENTER.lat),
      lng: num(env.GEO_CENTER_LNG, DEFAULT_CENTER.lng),
    },
    radiusKm: num(env.GEO_RADIUS_KM, DEFAULT_RADIUS_KM),
    city: env.GEO_CITY || DEFAULT_CITY,
  };
}

/** Extrae [lat, lng] del parámetro `query=lat,lng` de la URL de Google Maps. */
function parseMapsCoords(url) {
  if (!url) return null;
  try {
    const query = new URL(url).searchParams.get("query");
    if (!query) return null;
    const [lat, lng] = query.split(",").map((part) => Number(part.trim()));
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
  } catch {
    return null;
  }
}

function distanceKm([lat1, lng1], [lat2, lng2]) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Código postal español (01xxx–52xxx) que no es de la provincia de origen. */
function hasForeignPostalCode(address) {
  const match = String(address || "").match(/\b(0[1-9]|[1-4]\d|5[0-2])\d{3}\b/);
  return Boolean(match) && !match[0].startsWith(HOME_POSTAL_PREFIX);
}

/**
 * @returns {{ commerce: object|null, action: "ok"|"fixed"|"excluded" }}
 */
function sanitizeGeo(commerce, cfg = config()) {
  const coords = parseMapsCoords(commerce.mapsUrl);
  if (!coords) return { commerce, action: "ok" };

  const km = distanceKm([cfg.center.lat, cfg.center.lng], coords);
  if (km <= cfg.radiusKm) return { commerce, action: "ok" };

  if (hasForeignPostalCode(commerce.address)) {
    return { commerce: null, action: "excluded", km };
  }

  const query = encodeURIComponent(`${commerce.address}, ${cfg.city}`);
  return {
    commerce: { ...commerce, mapsUrl: `https://www.google.com/maps/search/?api=1&query=${query}` },
    action: "fixed",
    km,
  };
}

/** Aplica sanitizeGeo a una lista y resume lo ocurrido. */
function sanitizeAll(commerces, cfg = config()) {
  const kept = [];
  const fixed = [];
  const excluded = [];
  for (const commerce of commerces) {
    const result = sanitizeGeo(commerce, cfg);
    if (result.action === "excluded") {
      excluded.push({ name: commerce.name, km: Math.round(result.km) });
      continue;
    }
    if (result.action === "fixed") {
      fixed.push({ name: commerce.name, km: Math.round(result.km) });
    }
    kept.push(result.commerce);
  }
  return { commerces: kept, fixed, excluded };
}

module.exports = { config, parseMapsCoords, distanceKm, hasForeignPostalCode, sanitizeGeo, sanitizeAll };
