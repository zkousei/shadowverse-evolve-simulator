# DeckBuilder User Guide

このドキュメントは、`DeckBuilder` を利用する人向けの簡易ガイドです。

内部実装の説明ではなく、

- 何が保存されるのか
- 画面上の表示が何を意味するのか
- どのボタンを押すと何が起きるのか

を分かりやすく整理しています。

## 1. DeckBuilder でできること

`DeckBuilder` では次のことができます。

- カードを検索して deck を作る
- `My Decks` に保存する
- 保存済み deck を読み込む
- JSON から deck を import / export する
- 前回このブラウザで編集中だった状態を再開する

## 2. 保存状態の見方

右側には、現在の deck の状態を表す表示があります。

### `Saved`

今見えている deck が、`My Decks` に保存されている deck と一致している状態です。

### `Unsaved changes`

`My Decks` から読み込んだ deck に対して、現在の内容が変わっている状態です。

例:

- 保存済み deck を読み込んだ後にカードを追加した
- deck name を変えた
- rule を変えた

### `Not saved to My Decks`

今の deck が、`My Decks` に保存済みの deck と紐づいていない状態です。

例:

- 新しく deck を作っている途中
- JSON import した deck
- `Make Unsaved Copy` を押した後

### `Session restored from this browser`

これは保存状態ではありません。

前回このブラウザで使っていた DeckBuilder の状態を、`Continue` で再開した時だけ出る補助表示です。

## 3. DeckBuilder を開いた時

### 何も続きがない時

そのまま空の DeckBuilder が開きます。

### 前回の続きがある時

`Resume Previous Session` が表示されます。

選べるのは次の 2 つです。

- `Continue`
  - 前回の続きから再開します
- `Start Fresh`
  - 前回の続きは使わず、空の DeckBuilder で始めます

補足:

- 前回の状態は自動では復元されません
- 必ず確認してから再開する形です

## 4. 主なボタンの意味

### `Save`

現在の deck を `My Decks` に保存します。

- すでに保存済み deck を開いている場合は上書き保存
- 保存済みでない場合は新しく保存

保存が成功すると、画面上部に通知が出ます。

### 空の状態での Save

完全に空の状態では保存できません。

その場合は warning が出て、保存は拒否されます。

## 5. `My Decks`

`My Decks` ボタンを押すと、保存済み deck の一覧が開きます。

ここでは次の操作ができます。

- `Load`
- `Export`
- `Duplicate`
- `Delete`

### `Load`

選んだ saved deck を現在の DeckBuilder に読み込みます。

### `Export`

選んだ saved deck を JSON で書き出します。

### `Duplicate`

保存済み deck を複製します。

### `Delete`

保存済み deck を削除します。

## 6. `Import`

JSON ファイルから deck を読み込みます。

import した deck は、そのままでは `My Decks` に保存された状態にはなりません。  
必要なら `Save` してください。

## 7. `Make Unsaved Copy`

`Saved` 状態の時だけ表示される補助ボタンです。

意味:

- 今見えている deck の内容はそのまま残す
- ただし、`My Decks` にある saved deck との紐付けを外す

こうすると、元の saved deck を上書きせずに別バージョンを作れます。

使いどころ:

- 保存済み deck をベースに、新しい案を試したい
- 元の deck を残したまま分岐したい

押した後の状態表示は `Not saved to My Decks` になります。

## 8. `Reset Deck`

deck の**内容だけ**を空にします。

残るもの:

- deck name
- rule 設定

消えるもの:

- Main Deck
- Evolve Deck
- Leader
- Token Deck

つまり、今の作業の枠組みは残したまま、中身だけ作り直したい時に使います。

## 9. `Reset Builder`

DeckBuilder 全体を初期化します。

消えるもの:

- deck 内容
- deck name
- rule 設定
- このブラウザに保存されている前回の続き

`Reset Deck` より強い初期化です。

「完全に最初からやり直したい」時はこちらを使います。

## 10. よくある使い方

### 保存済み deck を少し直したい

1. `My Decks` から `Load`
2. 編集する
3. `Save`

### 保存済み deck をベースに別案を作りたい

1. `My Decks` から `Load`
2. `Make Unsaved Copy`
3. 編集する
4. 必要なら別名で `Save`

### import した deck を使いたい

1. `Import`
2. 必要なら内容を修正
3. `Save`

### 中身だけ空にして作り直したい

1. `Reset Deck`

### 全部最初からやり直したい

1. `Reset Builder`

## 11. 補足

- `Saved` と `Resume Previous Session` は別の意味です
  - `Saved` は保存状態
  - `Resume Previous Session` は、このブラウザで前回見ていた builder 状態を再開するかどうか

- 保存済み deck を読み込んだだけの状態でも、次回開いた時に `Resume Previous Session` が出ることがあります
  - これは「前回この builder に何か残っていた」ためです

- 逆に、完全に空の状態では `Resume Previous Session` は出ません
