# Shadowverse Evolve Web Sandbox

このプロジェクトは、PeerJS を使った P2P 同期で「Shadowverse Evolve」をブラウザ上で遊ぶためのサンドボックスです。

README は入口に絞り、詳細はユーザ向け / 管理者向けのドキュメントへ分けています。

## ドキュメント案内

### ユーザ向け

- [`./docs/gameboard-user-guide.md`](./docs/gameboard-user-guide.md)
  - GameBoard の見方、準備、基本操作

### 管理者・開発者向け

- [`./docs/admin-guide.md`](./docs/admin-guide.md)
  - セットアップ、ローカル起動、カード更新、管理系ドキュメントの入口
- [`./docs/deck-restrictions-maintenance.md`](./docs/deck-restrictions-maintenance.md)
  - カード固有特例、構築戦 / クロスオーバーの禁止・制限更新
- [`./docs/manual-p2p-sync-checklist.md`](./docs/manual-p2p-sync-checklist.md)
  - P2P 手動確認チェックリスト

## クイックスタート

### 画像表示について

- Vercel で公開しているサイトは、カード画像をダミー表示にしたバージョンです
- 公式カード画像付きでプレイしたい場合は、このリポジトリをローカルで起動して利用してください

### ローカルで起動する

必要な環境:
- Node.js `v20` 以降
- npm
- Python `3.9` 以降
  - カード更新機能を使う場合のみ

```bash
npm install
npm run dev
```

表示された `http://localhost:5173/` をブラウザで開いてください。

終了時は、起動したターミナルで `Ctrl + C` を押します。

### プレイヤーとして使う

GameBoard の操作方法は [`./docs/gameboard-user-guide.md`](./docs/gameboard-user-guide.md) を参照してください。

### 管理者としてメンテナンスする

セットアップ、カード更新、制限ルール更新は [`./docs/admin-guide.md`](./docs/admin-guide.md) を参照してください。
