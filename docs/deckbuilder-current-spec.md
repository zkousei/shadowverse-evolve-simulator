# DeckBuilder Current Spec

このドキュメントは、**現在の `DeckBuilder` の挙動**を整理したものです。

特に次の点で認識がずれやすいため、仕様を明文化しています。

- `Saved / Unsaved changes / Not saved to My Decks` の意味
- `Resume Previous Session` の表示条件
- `Reset Deck` / `Reset Builder` / `Make Unsaved Copy` の役割の違い
- `My Decks`・`Import`・session 保存の関係

これは「今の実装がどう動くか」を説明するドキュメントです。
将来の理想仕様ではなく、現在コードベースに入っている挙動を基準にしています。

## 1. 基本用語

### Current builder state

今 `DeckBuilder` 画面に表示されている状態です。

含むもの:

- deck name
- deck rule settings
- main / evolve / leader / token の内容

### Saved deck

`My Decks` に保存されている deck です。

### Saved baseline

現在の builder が、どの saved deck を基準にしているかを表す内部状態です。

- `My Decks` から `Load` した時
- `Save` した時

に、その時点の snapshot が baseline になります。

### Browser session

このブラウザに保存される、DeckBuilder の前回状態です。

これは `Saved` とは別概念です。

- `Saved` は「My Decks に保存済みか、または保存済み deck と一致しているか」
- `Browser session` は「前回このブラウザで何が builder に残っていたか」

を表します。

### Pristine builder state

完全にまっさらな初期状態です。

現在の実装では、次を満たすものを pristine とみなします。

- deck name が内部的に `My Deck`
- rule がデフォルト
- deck 内容が空

補足:

- 画面上の deck name 入力欄は空でも、比較用 snapshot では `My Deck` に正規化されます
- そのため「入力欄が空 + デフォルト rule + 空 deck」は pristine 扱いです

## 2. 保存状態表示

DeckBuilder 右側の状態表示は、現在次のルールです。

### `Saved`

次を満たす時に表示されます。

- `selectedSavedDeckId` がある
- current builder state が saved baseline と一致している

つまり意味は:

- 「今見えている current は、My Decks にある saved deck と一致している」

です。

### `Unsaved changes`

次を満たす時に表示されます。

- `selectedSavedDeckId` がある
- current builder state が saved baseline と一致しない

つまり意味は:

- 「今は saved deck を読み込んでいるが、その current に変更差分がある」

です。

### `Not saved to My Decks`

次を満たす時に表示されます。

- `selectedSavedDeckId` がない

この文言は広めの意味を持ちます。

具体的には次のどれでも表示されます。

- まだ一度も `Save` していない新規 deck
- `Import` した deck
- `Make Unsaved Copy` 後の current
- `Reset Builder` 後のまっさらな builder

つまり意味は:

- 「今の current は、My Decks の saved deck と紐づいていない」

です。

### `Session restored from this browser`

これは保存状態ではありません。

次の時にだけ補助表示として出ます。

- `Resume Previous Session` で `Continue` を押して session を復元した後

## 3. Session 保存ルール

### Session を保存する条件

現在の builder state が pristine でない時だけ、browser session を保存します。

判定は `currentSnapshot !== pristineSnapshot` です。

そのため、次の状態は session 保存対象です。

- `My Decks` から `Load` しただけの状態
- `Import` しただけの状態
- deck name だけ変えた状態
- rule だけ変えた状態
- カードを 1 枚以上追加した状態
- `Reset Deck` 後でも、name または rule が残っていて pristine でない状態

### Session を保存しない条件

次は session を保存しません。

- 完全にまっさらな初期状態
- `Reset Builder` 後の状態
- `Start Fresh` で前回 session を破棄した直後の状態

### 保存のタイミング

- カードデータ読み込み後
- `pendingDraftRestore` がない
- current builder state が pristine でない

という条件を満たすと、約 400ms 後に draft 保存します。

### Session の破棄

次の時に `clearDraft()` が呼ばれます。

- current builder state が pristine に戻った時
- `Start Fresh`
- `Reset Builder`

## 4. DeckBuilder に入った時の挙動

### session がない時

- 何も確認を出しません
- そのまま current builder を表示します

### session がある時

自動復元はしません。

代わりに次のダイアログを表示します。

- `Resume Previous Session`
- `Continue`
- `Start Fresh`

### `Continue`

前回保存されていた browser session を current builder に復元します。

復元されるもの:

- deck name
- deck rule settings
- deck contents
- `selectedSavedDeckId`
- saved baseline snapshot

### `Start Fresh`

前回保存されていた browser session を破棄して、空の builder から始めます。

実行内容:

- `clearDraft()`
- builder state を初期化

## 5. 各操作の意味

### `Save`

`Save` は current builder を `My Decks` に保存します。

- `selectedSavedDeckId` がある時
  - その saved deck を更新
- `selectedSavedDeckId` がない時
  - 新しい saved deck を作成

保存成功時は通知を表示します。

例:

- `"My Deck" was saved.`
- `"My Deck" was saved as a new deck.`

### 空の builder の保存

完全に pristine な builder は保存できません。

保存を押しても拒否され、warning を出します。

文言:

- `The builder is empty. Add cards or adjust the setup before saving.`

### `Load`

`My Decks` 内の saved deck を current builder に読み込みます。

実行内容:

- current builder を saved deck の内容で置き換える
- `selectedSavedDeckId` をその saved deck に設定
- saved baseline をその snapshot に設定

この結果、通常は状態表示は `Saved` になります。

### `Import`

JSON import は current builder を imported deck で置き換えます。

実行内容:

- current builder を imported deck で置き換える
- `selectedSavedDeckId` を `null` にする
- saved baseline を `null` にする

つまり import 後は `Not saved to My Decks` になります。

### `Make Unsaved Copy`

`Saved` 状態の current を、内容を保ったまま saved deck との紐付けだけ外します。

実行内容:

- current builder の中身はそのまま
- `selectedSavedDeckId = null`
- `savedBaselineSnapshot = null`

結果:

- 状態表示は `Not saved to My Decks`
- 以後 `Save` は新規保存として扱われる

この操作は、次のような用途を想定しています。

- saved deck を元に別バージョンを作りたい
- 元の deck を上書きせずに分岐したい

### `Reset Deck`

deck 内容だけ空にします。

残るもの:

- deck name
- deck rule settings
- card library filter 状態

消えるもの:

- Main Deck
- Evolve Deck
- Leader
- Token Deck

補足:

- `Reset Deck` 後も、name や rule が残っていれば pristine ではないため、session 保存対象になりえます

### `Reset Builder`

builder 全体を初期化します。

消えるもの:

- deck contents
- deck name
- rule settings
- browser session
- saved deck tracking (`selectedSavedDeckId`)

結果:

- まっさらな builder に戻る
- 次回再訪時の `Resume Previous Session` も出ない

## 6. 代表的な遷移例

### 例1: `My Decks` から `Load` してそのまま離脱

1. `Load`
2. 状態は `Saved`
3. builder は pristine ではない
4. browser session が保存される
5. 再訪時は `Resume Previous Session` が出る
6. `Continue` すると、その loaded state で再開する

### 例2: `Import` して何も編集せず離脱

1. `Import`
2. 状態は `Not saved to My Decks`
3. imported deck が builder に残るため pristine ではない
4. browser session が保存される
5. 再訪時は `Resume Previous Session` が出る

### 例3: `Saved` 状態から `Make Unsaved Copy`

1. saved deck を開く
2. `Make Unsaved Copy`
3. current の内容はそのまま
4. 状態は `Not saved to My Decks`
5. 元の saved deck とは切り離される

### 例4: `Reset Deck`

1. current builder で `Reset Deck`
2. deck 内容だけ空になる
3. deck name と rule は残る
4. 状態表示は current と saved baseline の関係によって決まる
5. name / rule が残っていて pristine でなければ session 保存対象になりうる

### 例5: `Reset Builder`

1. current builder で `Reset Builder`
2. name / rule / contents / session を全部クリア
3. 次回再訪しても `Resume Previous Session` は出ない

## 7. 実装上の重要ポイント

### `Saved` と `Session` は別概念

ここが一番混乱しやすい点です。

- `Saved`
  - My Decks との一致状態
- `Session`
  - このブラウザで前回 builder に何が残っていたか

そのため、次の状態は両立します。

- 表示は `Saved`
- でも再訪時には `Resume Previous Session` が出る

これは現在仕様として意図された挙動です。

### pristine 判定は `My Deck` を基準にしている

空の deck name 入力欄でも、snapshot 比較では `My Deck` に正規化されます。

そのため「入力欄は空だが、比較上は `My Deck`」という内部挙動があります。

ただし、現在は完全に空の builder を `Save` できないため、
「空の `My Deck` を保存して session と矛盾する」という以前の違和感はかなり減っています。

## 8. 現状のトレードオフ

現在仕様はかなり一貫していますが、次の特徴があります。

### 良い点

- まっさらな状態では `Draft restored...` が出ない
- 自動復元しない
- `Load` / `Import` / 編集済みを、同じ session ルールで扱える
- `Reset Deck` と `Reset Builder` の役割が分かれている

### 理解が必要な点

- `Saved` 状態でも再訪時に `Resume Previous Session` が出ることがある
- `Not saved to My Decks` は未保存 current 全般を含む、広めの文言
- `Reset Deck` は「内容だけ空」であり、builder 全体の初期化ではない

## 9. 今後この仕様を変える時の注意点

次を変えると、DeckBuilder の意味づけ全体に影響します。

1. pristine 判定
2. `selectedSavedDeckId` と save state message の関係
3. session 保存条件
4. `Reset Deck` と `Reset Builder` の役割分担

特に、

- `Saved`
- `Not saved to My Decks`
- `Resume Previous Session`

はそれぞれ別概念なので、どれか1つだけを変えると再び分かりにくくなりやすいです。
