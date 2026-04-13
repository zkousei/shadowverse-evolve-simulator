import { CONSTRUCTED_CLASS_VALUES, type CardClass } from '../models/class';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { CardKindNormalized } from '../models/cardClassification';
import type { DeckRuleConfig } from '../models/deckRule';
import { createEmptyDeckState, type DeckState } from '../models/deckState';

const DECKLOG_VIEW_API_BASE = '/api/decklog/view/';
const DECKLOG_CARD_IMAGE_BASE = 'https://shadowverse-evolve.com/wordpress/wp-content/images/cardlist/';
const DECKLOG_SVE_GAME_TITLE_ID = 6;

export class DeckLogImportError extends Error {
  code:
    | 'invalid-input'
    | 'fetch-failed'
    | 'not-found'
    | 'unsupported-game'
    | 'invalid-response';

  constructor(
    code: DeckLogImportError['code'],
    message: string,
  ) {
    super(message);
    this.name = 'DeckLogImportError';
    this.code = code;
  }
}

type DeckLogCardEntry = {
  card_number: string;
  num?: number;
  card_kind?: string;
  name: string;
  img?: string;
  rare?: string;
  cost?: string;
  custom_param?: {
    class_name?: string;
  };
};

type DeckLogViewResponse = {
  id: number;
  title: string;
  game_title_id: number;
  deck_param1?: string;
  deck_param2?: string;
  list?: DeckLogCardEntry[];
  sub_list?: DeckLogCardEntry[];
  p_list?: DeckLogCardEntry[];
};

export type DeckLogImportResult = {
  deckName: string;
  ruleConfig: DeckRuleConfig;
  deckState: DeckState;
  missingCardIds: string[];
};

type DeckLogResolvedCard = {
  card: DeckBuilderCardData;
  resolvedFromCatalog: boolean;
};

type DeckLogResolvedSection = {
  cards: DeckBuilderCardData[];
  missingCardIds: string[];
};

const isConstructedClass = (value: string): value is CardClass => (
  CONSTRUCTED_CLASS_VALUES.includes(value as CardClass)
);

const normalizeCardType = (value?: string): string | undefined => {
  if (!value) return undefined;

  const parts = value
    .split('・')
    .map(part => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join('・') : undefined;
};

const DECKLOG_TYPE_TO_CARD_KIND: Record<string, CardKindNormalized> = {
  'フォロワー': 'follower',
  'フォロワー・エボルヴ': 'evolve_follower',
  'スペル': 'spell',
  'アミュレット': 'amulet',
  'リーダー': 'leader',
  'フォロワー・トークン': 'token_follower',
  'スペル・トークン': 'token_spell',
  'アミュレット・トークン': 'token_amulet',
  'イクイップメント・トークン': 'token_equipment',
  'フォロワー・アドバンス': 'advance_follower',
  'スペル・アドバンス': 'advance_spell',
  'アミュレット・アドバンス': 'advance_amulet',
  'アミュレット・エボルヴ': 'evolve_amulet',
  'スペル・エボルヴ': 'evolve_spell',
};

const getDeckLogCardKind = (entry: DeckLogCardEntry): CardKindNormalized | undefined => {
  const normalizedType = normalizeCardType(entry.card_kind);
  if (!normalizedType) return undefined;
  return DECKLOG_TYPE_TO_CARD_KIND[normalizedType];
};

const buildDeckLogCard = (entry: DeckLogCardEntry): DeckBuilderCardData => {
  const image = entry.img ? `${DECKLOG_CARD_IMAGE_BASE}${entry.img}` : '';

  return {
    id: entry.card_number,
    name: entry.name,
    image,
    class: isConstructedClass(entry.custom_param?.class_name ?? '')
      ? entry.custom_param?.class_name as CardClass
      : undefined,
    type: normalizeCardType(entry.card_kind),
    rarity: entry.rare,
    cost: entry.cost,
  };
};

const pickDeckLogFallbackCard = (
  entry: DeckLogCardEntry,
  availableCards: DeckBuilderCardData[],
): DeckBuilderCardData | null => {
  const normalizedType = normalizeCardType(entry.card_kind);
  if (!normalizedType) return null;

  const normalizedKind = getDeckLogCardKind(entry);
  const entryClass = isConstructedClass(entry.custom_param?.class_name ?? '')
    ? entry.custom_param?.class_name as CardClass
    : undefined;

  const candidates = availableCards
    .filter(card => card.name === entry.name)
    .filter(card => card.type === normalizedType)
    .filter(card => normalizedKind === undefined || card.card_kind_normalized === normalizedKind)
    .filter(card => entryClass === undefined || card.class === entryClass)
    .sort((left, right) => left.id.localeCompare(right.id, 'ja'));

  return candidates[0] ?? null;
};

const expandDeckLogSection = (
  entries: DeckLogCardEntry[] | undefined,
  availableCards: DeckBuilderCardData[],
): DeckLogResolvedSection => {
  const missingCardIds = new Set<string>();

  const cards = (entries ?? []).flatMap((entry) => {
    const count = Math.max(0, entry.num ?? 0);
    const exactMatch = availableCards.find(card => card.id === entry.card_number);
    const fallbackMatch = exactMatch ?? pickDeckLogFallbackCard(entry, availableCards);
    const resolvedCard: DeckLogResolvedCard = fallbackMatch
      ? { card: fallbackMatch, resolvedFromCatalog: true }
      : { card: buildDeckLogCard(entry), resolvedFromCatalog: false };

    if (!resolvedCard.resolvedFromCatalog) {
      missingCardIds.add(entry.card_number);
    }

    return Array.from({ length: count }, () => ({ ...resolvedCard.card }));
  });

  return {
    cards,
    missingCardIds: Array.from(missingCardIds),
  };
};

export const extractDeckLogCode = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const fromUrl = trimmed.match(/decklog\.bushiroad\.com\/view\/([^/?#]+)/i);
  const candidate = fromUrl?.[1] ?? trimmed;

  return /^[A-Za-z0-9-]+$/.test(candidate) ? candidate.toUpperCase() : null;
};

export const getDeckLogRuleConfig = (
  deckParam1?: string,
  deckParam2?: string,
): DeckRuleConfig => {
  if (deckParam1 === 'O') {
    return {
      format: 'other',
      identityType: 'class',
      selectedClass: null,
      selectedTitle: null,
      selectedClasses: [null, null],
    };
  }

  if (deckParam1 === 'X') {
    const [firstClass, secondClass] = (deckParam2 ?? '')
      .split('/')
      .map(value => value.trim())
      .filter(Boolean);

    return {
      format: 'crossover',
      identityType: 'class',
      selectedClass: null,
      selectedTitle: null,
      selectedClasses: [
        isConstructedClass(firstClass ?? '') ? firstClass as CardClass : null,
        isConstructedClass(secondClass ?? '') ? secondClass as CardClass : null,
      ],
    };
  }

  if (isConstructedClass(deckParam2 ?? '')) {
    return {
      format: 'constructed',
      identityType: 'class',
      selectedClass: deckParam2 as CardClass,
      selectedTitle: null,
      selectedClasses: [null, null],
    };
  }

  return {
    format: 'constructed',
    identityType: 'title',
    selectedClass: null,
    selectedTitle: deckParam2 && deckParam2 !== 'none' ? deckParam2 : null,
    selectedClasses: [null, null],
  };
};

export const convertDeckLogResponse = (
  payload: DeckLogViewResponse,
  availableCards: DeckBuilderCardData[],
): DeckLogImportResult => {
  if (payload.game_title_id !== DECKLOG_SVE_GAME_TITLE_ID) {
    throw new DeckLogImportError('unsupported-game', 'Only Shadowverse EVOLVE decks are supported.');
  }

  const mainDeck = expandDeckLogSection(payload.list, availableCards);
  const evolveDeck = expandDeckLogSection(payload.sub_list, availableCards);
  const leaderCards = expandDeckLogSection(payload.p_list, availableCards);

  const deckState: DeckState = {
    ...createEmptyDeckState(),
    mainDeck: mainDeck.cards,
    evolveDeck: evolveDeck.cards,
    leaderCards: leaderCards.cards,
    tokenDeck: [],
  };

  const missingCardIds = Array.from(
    new Set(
      [
        ...mainDeck.missingCardIds,
        ...evolveDeck.missingCardIds,
        ...leaderCards.missingCardIds,
      ]
    )
  );

  return {
    deckName: payload.title?.trim() || 'DeckLog Import',
    ruleConfig: getDeckLogRuleConfig(payload.deck_param1, payload.deck_param2),
    deckState,
    missingCardIds,
  };
};

export const fetchDeckLogImport = async (
  input: string,
  availableCards: DeckBuilderCardData[],
  fetchImpl: typeof fetch = fetch,
): Promise<DeckLogImportResult> => {
  const deckCode = extractDeckLogCode(input);
  if (!deckCode) {
    throw new DeckLogImportError('invalid-input', 'Enter a valid DeckLog code or URL.');
  }

  let response: Response;
  try {
    response = await fetchImpl(`${DECKLOG_VIEW_API_BASE}${deckCode}`, {
      method: 'POST',
    });
  } catch {
    throw new DeckLogImportError('fetch-failed', 'Could not reach DeckLog.');
  }

  if (!response.ok) {
    let detail = '';

    try {
      const errorPayload = await response.json() as { error?: string };
      if (typeof errorPayload?.error === 'string' && errorPayload.error.trim()) {
        detail = ` ${errorPayload.error.trim()}`;
      }
    } catch {
      // Ignore secondary parsing issues and fall back to the status-only message.
    }

    throw new DeckLogImportError('fetch-failed', `DeckLog responded with ${response.status}.${detail}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new DeckLogImportError('invalid-response', 'DeckLog returned invalid JSON.');
  }

  if (Array.isArray(payload) && payload.length === 0) {
    throw new DeckLogImportError('not-found', 'DeckLog deck was not found.');
  }

  if (!payload || typeof payload !== 'object' || !('id' in payload)) {
    throw new DeckLogImportError('invalid-response', 'DeckLog returned an unexpected payload.');
  }

  return convertDeckLogResponse(payload as DeckLogViewResponse, availableCards);
};
