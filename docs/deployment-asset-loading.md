# 公開更新後のページ用JavaScript読み込み

## 再現した症状

デプロイ前からHomeを開いたままにし、デプロイ後に初めてDeckBuilderを開くと、
「画面を読み込めませんでした」になり、手動再読み込みで復旧する症状です。

PR #205の実デプロイのHome/初期JSを読み、同じ見かけのURLの配信先をPR #207へ切り替えると再現しました。
旧 `DeckBuilder-mRhqTsev.js` に対して、新版は `200 text/html` を返し、ブラウザーのES module読み込みが失敗します。
PR #206と#207のDeckBuilderファイル名は同じで、#207だけでページコードが変わったわけではありません。
報告時のブラウザー通信ログは取得していないため、ユーザーの旧画面の版そのものは断定していません。

既存の新規アクセス・単発取得失敗のE2Eでは、開いた画面を公開更新がまたぐ条件を十分に検証できていませんでした。
カード用JSONの分割取得はまだ画面に接続されておらず、このエラーはページのdynamic import取得で発生します。

## 対策

Vercel上のビルドでは、Viteの `base` を `https://<VERCEL_URL>/` にします。
これはブランチエイリアスや本番ドメインではなく、ビルドを配信するデプロイ固有のホスト名です。
初期JS・遅延JS・依存JS・CSSなどのビルドアセットが同じデプロイへ固定され、
開いた後にエイリアスが新版へ移っても、まだ取得していない旧ページJSを同じ版から取得できます。

通常の開発サーバーとローカルビルドは `/` を使い、Vercelの環境変数がない環境でも動作します。
`VERCEL=1` のビルドでは有効な `.vercel.app` の `VERCEL_URL` を必須にし、不正・欠損ならビルドを停止します。
VercelのカスタムDeployment Suffixを使う場合は、ホスト名検証を別途見直す必要があります。

ルーター・遅延ページ取得処理・保存形式・P2P処理は変更しません。
`/cards_detailed.json`・`/cards_preview.json`・`/api/...` は従来どおり閲覧中のサイトのoriginを使います。
ページ読み込み失敗時の自動再読み込みを追加せず、作業中の状態を保持します。
既存の手動再読み込みUIは、ネットワーク障害やデプロイ削除などに対する復旧手段として残します。

`/assets` 配下はSPA fallbackから外し、存在しないJSにはHTMLの200を返さず404にします。
これはVercelの設定です。Vite previewの全ルーティングをVercelと同一にする変更は含めません。

## 前提と検証

デプロイ固有URLが匿名で取得可能で、cross-origin module取得が許可されることが必要です。
Vercelプレビューでは、エイリアス側URLから実際にアクセスして固定URLへのJS/CSS取得とCORSを確認します。
Deployment Protection、CSP、Deployment Suffixを変更する場合は再検証します。
旧デプロイを削除した場合や、保持設定により削除された場合まで取得を保証するものではありません。
旧デプロイの削除・保持方針を変更する際は、開いたままの画面への影響を確認します。

この対策は、新しい構成で読み込まれた画面に適用されます。
すでに開いている旧構成の画面を書き換えることはできないため、一度だけ手動再読み込みが必要です。

主なテスト所有先:

- `build/deploymentAssetBase.test.ts`: Vercel固定URL・ローカル動作・不正ホスト拒否。
- `build/catalogHosting.test.ts`: asset/catalog/APIの除外と、既存画面ルートの維持。
- `e2e/production/deployment-assets.spec.ts`: 2回の実ビルドと配信先切替を使い、
  旧画面の遅延JSが旧デプロイから取得され、入力状態とdocumentが維持されること。
- 既存の `lazyPage.test.tsx` と本番E2E: 本来の取得失敗では手動復旧UIを保ち、
  正常ロード後の状態保持・直接アクセス・保存デッキ復元を継続確認。

参照:
[Viteのbase設定](https://vite.dev/config/shared-options#base)、
[Viteの動的import失敗](https://vite.dev/guide/build#load-error-handling)、
[Vercelの環境変数](https://vercel.com/docs/environment-variables/system-environment-variables)、
[VercelのデプロイURL](https://vercel.com/docs/deployments/generated-urls)。
