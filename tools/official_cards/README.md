# 公式カード取得ツール

公式サイトからカード一覧・詳細を取得する管理用ツールです。
取得・変換・リトライの処理は従来のルート配置から変更していません。
分類には `tools.card_data.card_metadata` を利用し、preview同期には依存しません。

リポジトリのルートで実行してください。依存パッケージはルートの `requirements.txt` で管理します。

```sh
python3 -m pip install -r requirements.txt
npm run cards:fetch:official
npm run cards:fetch:official:details
npm run cards:fetch:official:incremental
npm run cards:audit
```

| コマンド | 入力 | 出力 |
| --- | --- | --- |
| `cards:fetch:official` | 公式カード一覧ページ | `public/cards.json` |
| `cards:fetch:official:details` | `public/cards.json` と公式カード詳細ページ | `public/cards_detailed.json` |
| `cards:fetch:official:incremental` | 公式カード一覧と既存の2つのカードJSON | 新規カードを追加した2つのカードJSON |

## 差分追加取得

通常のカード追加では、差分コマンドを利用できます。

```sh
npm run cards:fetch:official:incremental
```

公式一覧は全ページ確認しますが、詳細ページは
`public/cards_detailed.json` に存在しないカードIDだけ取得します。
既存カードの詳細情報は維持し、一覧で確認できた最新のカード名と画像URLだけ更新します。
詳細カタログのカード名は全件詳細取得と同じ空白正規化を適用するため、
全件取得と差分取得を切り替えても半角・全角スペースだけの差分は発生しません。
公式一覧から見えなくなったローカルカードは自動削除せず、警告を表示して保持します。

変更内容だけを確認する場合は `--dry-run` を指定します。この場合、詳細取得とファイル更新は行いません。

```sh
npm run cards:fetch:official:incremental -- --dry-run
```

既存カードの能力、関連カード、ステータスなどの変更は差分追加取得では更新されません。
エラッタ反映や全件再同期が必要な場合は、従来どおり一覧取得と詳細取得を順番に実行してください。

入出力は従来どおり実行ディレクトリを基準とします。上記npmコマンドはリポジトリのルートから実行します。
Pythonから起動する場合は次のモジュール形式を使ってください。

```sh
python3 -m tools.official_cards.scraper
python3 -m tools.official_cards.scrape_details
python3 -m tools.official_cards.sync_incremental
```

旧コマンド `python3 scraper.py` / `python3 scrape_details.py` は廃止しています。
リポジトリ外の個人スクリプト等で使用していた場合も新コマンドへ更新してください。

## テスト

`npm run test:python` で全Pythonテストを探索・実行します。
`scraper_test.py` が一覧の完全性、`scrape_details_test.py` がHTML解析、
`sync_incremental_test.py` が差分同期、`../python_entrypoints_test.py` がモジュール起動と
従来の入出力先への読み書きを検証します。起動テストは外部通信をモック化し、一時ディレクトリを使用します。
実際のカードデータ取得はビルド・テストから実行しません。
