/** Stable field order for the versioned wire encoding, not the app's card model. */
export const CARD_INDEX_FIELDS = [
  'id', 'name', 'image', 'class', 'title', 'type', 'subtype', 'rarity',
  'product_name', 'cost', 'atk', 'hp', 'card_kind_normalized', 'deck_section',
  'is_token', 'is_evolve_card', 'is_deck_build_legal', 'catalog_status', 'related_cards',
] as const;

const columns = [...CARD_INDEX_FIELDS, 'detail_group'];
const invalid = (): never => { throw new Error('Invalid generated card catalog: invalid compact index'); };

/** Expand the wire format before existing card, graph and projection checks. */
export const decodeGeneratedCardIndex = (value: unknown, schemaVersion: number): unknown[] => {
  if (schemaVersion === 1) return Array.isArray(value) ? value : invalid();
  if (schemaVersion !== 2 || !value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== 3 || data.encoding !== 'rows-v1' ||
      !Array.isArray(data.fields) || data.fields.length !== columns.length ||
      data.fields.some((field, i) => field !== columns[i]) || !Array.isArray(data.rows)) return invalid();
  const required = 3 + 2 ** (columns.length - 1); // id, name, detail_group
  return data.rows.map(row => {
    if (!Array.isArray(row)) return invalid();
    const mask: unknown = row[0];
    if (typeof mask !== 'number' || !Number.isSafeInteger(mask) || mask < 0 ||
        mask >= 2 ** columns.length || (mask & required) !== required) return invalid();
    const present = columns.filter((_field, bit) => (mask & 2 ** bit) !== 0);
    if (row.length !== present.length + 1) return invalid();
    return Object.fromEntries(present.map((field, i) => [field, row[i + 1]]));
  });
};
