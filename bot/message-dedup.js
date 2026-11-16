function createMessageDeduper({ capacity = 5000 } = {}) {
  const seen = new Set();

  return {
    claim(messageID) {
      if (!messageID) return true;
      const key = String(messageID);
      if (seen.has(key)) return false;
      seen.add(key);
      if (seen.size > capacity) seen.delete(seen.values().next().value);
      return true;
    },
    size: () => seen.size,
  };
}

module.exports = { createMessageDeduper };
