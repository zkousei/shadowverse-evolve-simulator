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

カード更新スクリプトを使う場合のみ必要です。

```bash
python3 -m venv .venv
source .venv/bin/activate
pip3 install -r requirements.txt
```

## 3. ローカル起動

```bash
npm run dev
```

ブラウザで表示された `http://localhost:5173/` を開いてください。

終了時は、起動したターミナルで `Ctrl + C` を押します。

## 4. 管理者向けドキュメント一覧

### カードデータ / 制限ルール

- [`./deck-restrictions-maintenance.md`](./deck-restrictions-maintenance.md)
  - デッキ制限ルールの更新手順

### 動作確認

- [`./manual-p2p-sync-checklist.md`](./manual-p2p-sync-checklist.md)
  - P2P の手動確認チェックリスト

### ユーザ向け操作確認

- [`./gameboard-user-guide.md`](./gameboard-user-guide.md)
  - 実際の画面操作を確認したいときの利用者向けガイド

## 5. カードデータ更新の基本手順

```bash
python3 scraper.py
python3 scrape_details.py
npm run cards:audit
```

更新後はブラウザをリロードすると、Deck Builder と GameBoard の両方に反映されます。

## 6. デッキ制限ルール更新の基本手順

更新対象:
- 能力由来の枚数特例
- 構築戦 / クロスオーバーの禁止・制限

詳細は [`./deck-restrictions-maintenance.md`](./deck-restrictions-maintenance.md) を参照してください。

## 7. 変更後の最低限の確認

```bash
npm test -- --run src/utils/deckBuilderRules.test.ts src/pages/DeckBuilder.test.tsx src/models/deckBuilderCard.test.ts
npm run build
```
