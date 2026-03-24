import { CONSTRUCTED_CLASS_VALUES, type CardClass } from '../models/class';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
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

const expandDeckLogSection = (
  entries: DeckLogCardEntry[] | undefined,
): DeckBuilderCardData[] => (
  (entries ?? []).flatMap((entry) => {
    const count = Math.max(0, entry.num ?? 0);
    const image = entry.img ? `${DECKLOG_CARD_IMAGE_BASE}${entry.img}` : '';
    const baseCard: DeckBuilderCardData = {
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

    return Array.from({ length: count }, () => ({ ...baseCard }));
  })
);

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

  const deckState: DeckState = {
    ...createEmptyDeckState(),
    mainDeck: expandDeckLogSection(payload.list),
    evolveDeck: expandDeckLogSection(payload.sub_list),
    leaderCards: expandDeckLogSection(payload.p_list),
    tokenDeck: [],
  };

  const availableCardIds = new Set(availableCards.map(card => card.id));
  const missingCardIds = Array.from(
    new Set(
      [
        ...deckState.mainDeck,
        ...deckState.evolveDeck,
        ...deckState.leaderCards,
      ]
        .map(card => card.id)
        .filter(cardId => !availableCardIds.has(cardId))
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
    throw new DeckLogImportError('fetch-failed', `DeckLog responded with ${response.status}.`);
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
