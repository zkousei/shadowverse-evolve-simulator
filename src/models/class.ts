
export const CLASS = {
    ELF: 'エルフ',
    ROYAL: 'ロイヤル',
    WITCH: 'ウィッチ',
    DRAGON: 'ドラゴン',
    NIGHTMARE: 'ナイトメア',
    BISHOP: 'ビショップ',
    NEUTRAL: 'ニュートラル',
} as const;

export type CardClass = typeof CLASS[keyof typeof CLASS];
export type ClassFilter = 'All' | CardClass;

export const CLASS_ORDER: (keyof typeof CLASS)[] = [
    'ELF', 'ROYAL', 'WITCH', 'DRAGON', 'NIGHTMARE', 'BISHOP', 'NEUTRAL',
];

// UI用（表示順固定の values）
export const CLASS_VALUES: CardClass[] = CLASS_ORDER.map(k => CLASS[k]);

// All込みの選択肢
export const CLASS_FILTER_VALUES: readonly ClassFilter[] = ['All', ...CLASS_VALUES];
