function diffComercios(oldList, newList) {
  const oldNames = new Set(oldList.map((c) => c.name));
  const newNames = new Set(newList.map((c) => c.name));

  const added = newList.filter((c) => !oldNames.has(c.name));
  const removed = oldList.filter((c) => !newNames.has(c.name));

  return { added, removed };
}

module.exports = { diffComercios };
