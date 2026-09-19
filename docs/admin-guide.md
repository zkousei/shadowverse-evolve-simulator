# Admin Guide

このドキュメントは、管理者・開発者向けの入口です。

対象:
- ローカルでアプリを起動したい
- カードデータを更新したい
- デッキ制限ルールを更新したい
- P2P の手動確認をしたい

## 1. 必要な環境

- Node.js `v20` 以降
- npm
- Python `3.9` 以降

## 2. 初回セットアップ

### Node.js 依存関係

```bash
npm install
```

### Python 環境

Vitest の分類整合性テストは `python3` を実行します（Python 標準ライブラリのみ使用）。
カード更新スクリプトや Python テスト全体を実行する場合は、以下の依存関係も準備してください。

```bash
python3 -m venv .venv
source .venv/bin/activate
pip3 install -r requirements.txt
```

### カード分類の検証

```bash
npm run test:python
npx vitest run src/utils/cardMetadataParity.test.ts src/utils/gameBoard/gameBoardDeckActions.test.ts
npm run cards:audit:all
```

カード種別を追加したら、Python のメタデータ生成とアプリの分類・セクション判定が
一致することを確認してください。分類整合性テストは通常の Vitest 実行にも含まれます。

## 3. ローカル起動

```bash
npm run dev
```

ブラウザで表示された `http://localhost:5173/` を開いてください。

終了時は、起動したターミナルで `Ctrl + C` を押します。

### ダミー画像版をローカル確認する

```bash
npm run dev:dummy
```

## 4. Vercel デプロイ設定

Vercel で公開する版をダミー画像表示にしたい場合は、Environment Variables に次を設定してください。

必須:

- `VITE_CARD_ART_MODE=dummy`

任意:

- `APP_VERSION=v0.0.4`

推奨設定:

- Build Command: `npm run build`
- Framework Preset: `Vite`

補足:

- `VITE_CARD_ART_MODE=dummy`
  - 公開版のカード画像をダミー表示に切り替えます
- `APP_VERSION=v0.0.4`
  - Home 画面の version 表示に使います
  - ダミー画像への切り替えには影響しません
- ローカルは env 未設定のままで `official` 表示になります

## 5. 管理者向けドキュメント一覧

### カードデータ / 制限ルール

- [`./deck-restrictions-maintenance.md`](./deck-restrictions-maintenance.md)
  - デッキ制限ルールの更新手順

### 動作確認

- [`./manual-p2p-sync-checklist.md`](./manual-p2p-sync-checklist.md)
  - P2P の手動確認チェックリスト

### ユーザ向け操作確認

- [`./gameboard-user-guide.md`](./gameboard-user-guide.md)
  - 実際の画面操作を確認したいときの利用者向けガイド

## 6. カードデータ更新の基本手順

リポジトリのルートで実行してください。
取得ツールは [`tools/official_cards/`](../tools/official_cards/README.md)、
共通の分類・監査は [`tools/card_data/`](../tools/card_data/README.md) に配置しています。

```bash
npm run cards:fetch:official
npm run cards:fetch:official:details
npm run cards:audit
```

更新後はブラウザをリロードすると、Deck Builder と GameBoard の両方に反映されます。

### プレビューカードを同期する

`public/cards_preview.json` は svestats の公開データから生成します。直接編集した内容は次回同期で上書きされます。

```bash
npm run cards:sync:preview -- --dry-run
npm run cards:sync:preview
npm run cards:audit:preview
```

取得元の追加・更新・削除を反映し、正式データと同じIDおよび再録指定を除外します。
正式カードの取得後にも同期を実行してください。通信・検証失敗時は既存JSONを保持します。
画像は外部配信URLを参照するため、表示時に外部アクセスが発生します。

空データの扱い、出典レポート、商品名対応表、テストについては
[専用ツールのREADME](../tools/svestats_preview/README.md) を参照してください。
入力形式の例は [サンプル](./preview-card-data-sample.json) にあります。

## 7. デッキ制限ルール更新の基本手順

更新対象:
- 能力由来の枚数特例
- 構築戦 / クロスオーバーの禁止・制限

詳細は [`./deck-restrictions-maintenance.md`](./deck-restrictions-maintenance.md) を参照してください。

## 8. 変更後の最低限の確認

Pythonツール・分類・監査を変更した場合:

```bash
npm run test:python
npm run cards:audit:all
npx vitest run src/utils/cardMetadataParity.test.ts
```

アプリ側の変更を含む場合:

```bash
npm test -- --run src/utils/deckBuilder/deckBuilderRules.test.ts src/pages/DeckBuilder.test.tsx src/models/deckBuilderCard.test.ts
npm run build
```
