import { describe, expect, it } from 'vitest';
import { getFieldLinkGroupId } from './fieldLinkRules';

describe('fieldLinkRules', () => {
  it('matches drive point cards to the vanguard link group', () => {
    expect(getFieldLinkGroupId({
      name: 'ドライブポイント',
      title: 'カードファイト!! ヴァンガード',
      card_kind_normalized: 'evolve_spell',
      deck_section: 'evolve',
    })).toBe('vanguard-drive-point');
  });

  it('matches carrot-like cards to the umamusume link group', () => {
    expect(getFieldLinkGroupId({
      name: '開催大成功！',
      title: 'ウマ娘 プリティーダービー',
      card_kind_normalized: 'evolve_spell',
      deck_section: 'evolve',
    })).toBe('umamusume-carrot-like');
  });
});
