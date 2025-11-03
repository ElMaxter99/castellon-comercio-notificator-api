const { getComercios } = require("./redisService");

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];
const DISPLAY_WINDOW = 1; // páginas adyacentes al indicador actual

function normalizeText(value) {
  return value ? value.toString().trim().toLowerCase() : "";
}

function normalizeSector(sector) {
  return sector ? sector.toString().trim() : "Sin sector";
}

function parseSectors({ sector, sectors }) {
  const raw = [];

  if (sector) {
    raw.push(sector);
  }

  if (Array.isArray(sectors)) {
    raw.push(...sectors);
  } else if (typeof sectors === "string") {
    raw.push(...sectors.split(","));
  }

  const cleaned = raw
    .map((item) => item && item.toString().trim())
    .filter(Boolean);

  return [...new Set(cleaned)];
}

function filterComercios(comercios, { name, street, sectors }) {
  const normalizedName = normalizeText(name);
  const normalizedStreet = normalizeText(street);
  const normalizedSectors = sectors.map(normalizeSector);

  return comercios.filter((comercio) => {
    const comercioName = normalizeText(comercio.name);
    const comercioStreet = normalizeText(comercio.address);
    const comercioSector = normalizeSector(comercio.sector);

    const matchesName = normalizedName
      ? comercioName.includes(normalizedName)
      : true;
    const matchesStreet = normalizedStreet
      ? comercioStreet.includes(normalizedStreet)
      : true;
    const matchesSector = normalizedSectors.length
      ? normalizedSectors.includes(comercioSector)
      : true;

    return matchesName && matchesStreet && matchesSector;
  });
}

function paginate(comercios, { page = 1, pageSize = DEFAULT_PAGE_SIZE }) {
  const totalItems = comercios.length;
  const safePageSize = Math.min(
    Math.max(parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );
  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / safePageSize)
  );
  const safePage = Math.min(
    Math.max(parseInt(page, 10) || 1, 1),
    totalPages
  );

  const start = (safePage - 1) * safePageSize;
  const end = start + safePageSize;
  const items = comercios.slice(start, end);

  return {
    items,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      totalItems,
      totalPages,
      hasPrevious: safePage > 1,
      hasNext: safePage < totalPages,
      previousPage: safePage > 1 ? safePage - 1 : null,
      nextPage: safePage < totalPages ? safePage + 1 : null,
      firstItemIndex: totalItems === 0 ? 0 : start + 1,
      lastItemIndex: Math.min(end, totalItems),
      displayPages: buildDisplayPages(safePage, totalPages, DISPLAY_WINDOW),
    },
  };
}

function buildDisplayPages(currentPage, totalPages, windowSize) {
  if (totalPages <= 1) {
    return [1];
  }

  const pages = new Set([1, totalPages]);

  for (let offset = -windowSize; offset <= windowSize; offset += 1) {
    const candidate = currentPage + offset;
    if (candidate >= 1 && candidate <= totalPages) {
      pages.add(candidate);
    }
  }

  const sortedPages = [...pages].sort((a, b) => a - b);
  const display = [];

  sortedPages.forEach((page, index) => {
    if (index > 0) {
      const previous = sortedPages[index - 1];
      if (page - previous > 1) {
        display.push(null); // null representará la elipsis en el frontend
      }
    }
    display.push(page);
  });

  return display;
}

function buildLegend(comercios, activeSectors) {
  const counts = comercios.reduce((acc, comercio) => {
    const sector = normalizeSector(comercio.sector);
    acc[sector] = (acc[sector] || 0) + 1;
    return acc;
  }, {});

  const sortedSectors = Object.entries(counts).sort((a, b) =>
    a[0].localeCompare(b[0], "es", { sensitivity: "base" })
  );

  const activeSet = new Set(activeSectors.map(normalizeSector));

  return sortedSectors.map(([sector, total]) => ({
    sector,
    total,
    active: activeSet.size === 0 ? true : activeSet.has(sector),
  }));
}

async function searchComercios({
  name,
  street,
  sector,
  sectors,
  page,
  pageSize,
  includeLegend = true,
} = {}) {
  const comercios = await getComercios();
  const selectedSectors = parseSectors({ sector, sectors });

  const filtered = filterComercios(comercios, {
    name,
    street,
    sectors: selectedSectors,
  });

  const { items, pagination } = paginate(filtered, { page, pageSize });

  return {
    totalAvailable: comercios.length,
    totalFiltered: filtered.length,
    filters: {
      name: name || null,
      street: street || null,
      sectors: selectedSectors,
    },
    pagination,
    items,
    legend: includeLegend ? buildLegend(comercios, selectedSectors) : null,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };
}

module.exports = {
  searchComercios,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
};
