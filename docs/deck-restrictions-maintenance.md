# Deck Restriction Maintenance

DeckBuilder の枚数制限は、現在 3 層で決まります。

1. 基本ルール
- `mainDeck` / `evolveDeck` の同一カードは 3 枚まで

2. カード固有特例
- カード能力によって 3 枚を超えて投入できるもの
- 例: `ラピッドファイア` 6 枚、`オニオン軍団` 50 枚

3. 禁止 / 制限
- 構築戦 / クロスオーバーごとの運営ルール
- `banned = 0枚`
- `limited = 1枚`

優先順位は `禁止 / 制限 > カード固有特例 > 基本ルール` です。

## 管理ファイル

- カード固有特例: [`../src/data/intrinsicDeckExceptions.ts`](../src/data/intrinsicDeckExceptions.ts)
- 禁止 / 制限: [`../src/data/policyRestrictions.ts`](../src/data/policyRestrictions.ts)
- 最終判定ロジック: [`../src/utils/deckRestrictionRules.ts`](../src/utils/deckRestrictionRules.ts)
- DeckBuilder への適用: [`../src/utils/deckBuilderRules.ts`](../src/utils/deckBuilderRules.ts)

## 判定キーの考え方

カードの枚数判定は `id` ではなく、次の組み合わせで行います。

- `name`
- `deck_section`
- `type`
- `class`

つまり、レアリティ違い・再録・プロモ違いでも、上の 4 つが同じなら同一カードとして扱います。

実装上は [`../src/models/deckBuilderCard.ts`](../src/models/deckBuilderCard.ts) の `getDisplayDedupKey` と同じキーです。

## 1. カード固有特例を追加する

対象:
- カードテキストに「デッキに n 枚まで入れることができる」とあるもの

編集先:
- [`../src/data/intrinsicDeckExceptions.ts`](../src/data/intrinsicDeckExceptions.ts)

追加例:

```ts
{
  key: createExceptionKey('カード名', 'main', 'スペル', 'ウィッチ'),
  copyLimit: 6,
  reason: 'Card text allows up to 6 copies in the deck.',
}
```

### 手順

1. 対象カードの `name / deck_section / type / class` を [`../public/cards_detailed.json`](../public/cards_detailed.json) で確認する
2. `createExceptionKey(...)` でキーを作る
3. `copyLimit` に能力テキスト上の枚数を入れる
4. `reason` を追記する
5. テストと build を実行する

### ability から候補を探す方法

```bash
python3 - <<'PY'
import json, re
from pathlib import Path
cards = json.loads(Path('public/cards_detailed.json').read_text())
pat = re.compile(r'(?:デッキに|これは(?:メインデッキ|エボルヴデッキ)に)(\d+)枚まで入れることができる')
for c in cards:
    text = c.get('ability_text') or ''
    m = pat.search(text)
    if m:
        print(c['id'], c['name'], c.get('deck_section'), c.get('type'), c.get('class'), m.group(1))
PY
```

## 2. 禁止 / 制限を更新する

対象:
- 運営ルールによる `banned` / `limited`
- `constructed` 用と `crossover` 用は別管理

編集先:
- [`../src/data/policyRestrictions.ts`](../src/data/policyRestrictions.ts)

追加例:

```ts
createPolicyRestriction(
  'constructed',
  'limited',
  'カード名',
  'main',
  'フォロワー',
  'ロイヤル',
  'Limited to 1 copy in constructed.'
)
```

### ステータスの意味

- `banned`
  - 0 枚
- `limited`
  - 1 枚

### 注意点

- `天下の大泥棒・ジエモン(main deck)` のように特定 deck のみ制限したい場合は、`deck_section` を正確に指定する
- 同名で `main` と `evolve` があるカードは、それぞれ別キーになる
- 文言は短くてもよいが、どのフォーマット向けの制限か分かるようにする

## 3. キーの確認方法

カード名だけでは不安なときは、次のように JSON から実データを確認します。

```bash
python3 - <<'PY'
import json
from pathlib import Path
target = '運命への反逆'
cards = json.loads(Path('public/cards_detailed.json').read_text())
for c in cards:
    if c.get('name') == target:
        print(c['id'], c['name'], c.get('deck_section'), c.get('type'), c.get('class'))
PY
```

## 4. 更新後の確認

最低限、次を実行します。

```bash
npm test -- --run src/utils/deckBuilderRules.test.ts src/pages/DeckBuilder.test.tsx src/models/deckBuilderCard.test.ts
npm run build
```

確認したい挙動:
- 追加ボタンで上限超過カードが入らない
- import 時に banned が落ち、limited が 1 枚に丸められる
- illegal メッセージが正しく出る
- legal になるまで export が無効のままになる

## 5. 改定時の運用メモ

- 禁止制限改定は不定期なので、日付管理の仕組みは持っていません
- 現在有効な最新ルールだけを [`../src/data/policyRestrictions.ts`](../src/data/policyRestrictions.ts) に保持します
- 過去ルールを残したい場合は、git の履歴で追跡します
