# svestats preview 同期ツール

svestats の公開 `https://svestats.cc/data/upcoming.json` を正として、
`public/cards_preview.json` を再生成します。Python標準ライブラリのみを使用します。
リポジトリのルートから実行してください。

```sh
npm run cards:sync:preview -- --dry-run
npm run cards:sync:preview -- --report /tmp/preview-sync-report.json
npm run cards:audit:preview
```

- 追加・変更・削除を反映します。生成JSONへの手動編集は次回上書きされます。
- ローカルの `cards_detailed.json` とIDが一致するカード、`reprint_of` のある再録は除外します。
- 発売日のみでは除外しません。通常カード取得後に再実行して正式移行を反映してください。
- トレジャーを含む分類はルートの `card_metadata.py` を共有します。
- 商品名は `products.json` で補完します。未知の商品は警告し、商品名を省略します。
- タイトルの空欄は推測しません。名前の部分一致による関連付けも行いません。
- 明示された関連IDは正式カード・同期後previewから解決し、再録の参照は元カードへ向けます。
- 出力はID順です。内容が同じならファイルを書き換えません。

## 既存処理への依存

### 専用ツールが直接呼び出す共通処理

| 呼び出し元 | 依存先 | 利用目的 |
| --- | --- | --- |
| `converter.py` | [`card_metadata.py`](../../card_metadata.py) の `derive_card_metadata()` | 種類から `card_kind_normalized`、`deck_section`、トークン・エボルヴ・構築可否のフラグを生成。トレジャーも共通定義で判定する |
| `sync.py` | [`audit_preview_cards.py`](../../audit_preview_cards.py) の `load_cards()` | 正式カードと現在のpreviewをJSON配列として読み込む |
| `sync.py` | 同ファイルの `validate_preview_cards()` | 保存前にID重複、正式カードとのID・表示上の衝突、必須項目、数値形式、種類、分類整合性、関連カード参照を監査する |

`validate_preview_cards()` は今回、既存の監査処理を関数として抽出したものです。
共通監査側も `card_metadata.py` の分類定義を利用します。
新しいカード種類への対応は共通定義を更新し、このツールに分類ルールを複製しません。
このため、ツールはリポジトリ内での実行を前提とし、フォルダ単体で配布する構成ではありません。

### データを介して利用するアプリ側の処理

以下はPythonから呼び出す処理ではなく、生成したJSONをアプリが利用する際の接続先です。

| 接続先 | 役割・今回の変更 |
| --- | --- |
| [`public/cards_detailed.json`](../../public/cards_detailed.json) | 同期時の入力。正式収録済みIDの除外と関連カードの名前解決に使用する。ツールからは更新しない |
| [`public/cards_preview.json`](../../public/cards_preview.json) | 同期結果の出力。既存のカード形式を維持し、出典・取得日時は別の任意レポートに記録する |
| [`src/utils/cardCatalog.ts`](../../src/utils/cardCatalog.ts) | 正式・previewのJSONを読み込み、同じIDでは正式カードを優先する。今回の変更なし |
| [`src/components/CardArtwork.tsx`](../../src/components/CardArtwork.tsx) | 保存された画像URLと既存の代替表示を利用する。今回、画像読み込み失敗時にも代替表示へ切り替える汎用処理を追加 |

依存方向は「専用ツール → 共通の分類・監査処理」と
「専用ツール → 生成JSON → アプリ」です。
`src/` や共通処理から専用ツールをimportすることはありません。

通常カード取得用の [`scraper.py`](../../scraper.py) と
[`scrape_details.py`](../../scrape_details.py) は呼び出しません。
外部サイトからの取得、形式変換、差分計算、同期制御はこのフォルダが所有します。
[`package.json`](../../package.json) の `cards:sync:preview` は明示的な起動入口で、
通常のビルドやアプリ起動からは実行されません。

### 共通処理を変更するときの確認

- 分類やJSON形式を変更した場合は、`converter_test.py` と `sync_test.py` で変換・同期への影響を確認する。
- 監査ルールを変更した場合は、ルートの `audit_preview_cards_test.py` と `sync_test.py` を確認する。
- カタログ統合や画像表示を変更した場合は、既存の `cardCatalog.test.ts` と `CardArtwork.test.tsx` を確認する。

## 失敗・空データ

通信は30秒でタイムアウトします。取得失敗、不正な入力、未知の種類、未解決の参照、
監査エラーでは既存JSONを保持し、終了コード1で終了します。
一時ファイルで書き込みを完了してから置換します。
取得結果が空のときは `--allow-empty` が必要です。
取得した全件が正式収録済みの場合は通常実行で空にできます。

`--dry-run` はカードJSONを変更しません。`--report PATH` を指定した場合は、
dry-runでも取得日時・出典URL・差分・除外理由・警告を記録します。
レポートは同期の計算結果であり、書き込み成功の証明ではありません（終了コードも確認してください）。
レポートの親ディレクトリはあらかじめ作成してください。
`--released PATH` / `--output PATH` で検証用の入出力に変更できます。

## 外部依存と画像

外部仕様はこのフォルダ内に閉じ込めています。アプリ・ビルド・テストは取得元に接続しません。
カード情報は同期時のみ取得し、画像はアプリ実行時に外部配信先を参照します。
画像URLの参照利用が可能という運用上の確認を前提とし、画像の保存・再配布は行いません。

2026-09-19確認時点では、サイトの公開読み込み処理はupcomingカードの画像を
`https://pub-bdbcbaf7e9804fe7a47da87d11c7064c.r2.dev/images/upcoming/<filename>`
に解決しています。商品コードのディレクトリではありません。
URL組み立ては `converter.py` にあり、配信先変更時はここを更新します。
画像が欠損・読み込み失敗した場合はアプリの代替表示を使います。
画像配信が停止してもカード情報は引き続き使用できます。

## 検証

```sh
npm run test:python
npx vitest run src/components/CardArtwork.test.tsx src/utils/cardCatalog.test.ts
```

取得はモック化し、fixtureは架空のカードです。実データ件数や外部接続に依存するテストはありません。
取得・変換・同期のテストはこのフォルダ、共通監査は `audit_preview_cards_test.py` が所有します。

商品名の確認元:
- https://shadowverse-evolve.com/products/bp22/
- https://shadowverse-evolve.com/products/cp05/
