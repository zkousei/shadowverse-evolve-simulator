# 公式カード取得ツール

公式サイトからカード一覧・詳細を取得する管理用ツールです。
取得・変換・リトライの処理は従来のルート配置から変更していません。
分類には `tools.card_data.card_metadata` を利用し、preview同期には依存しません。

リポジトリのルートで実行してください。依存パッケージはルートの `requirements.txt` で管理します。

```sh
python3 -m pip install -r requirements.txt
npm run cards:fetch:official
npm run cards:fetch:official:details
npm run cards:audit
```

| コマンド | 入力 | 出力 |
| --- | --- | --- |
| `cards:fetch:official` | 公式カード一覧ページ | `public/cards.json` |
| `cards:fetch:official:details` | `public/cards.json` と公式カード詳細ページ | `public/cards_detailed.json` |

入出力は従来どおり実行ディレクトリを基準とします。上記npmコマンドはリポジトリのルートから実行します。
Pythonから起動する場合は次のモジュール形式を使ってください。

```sh
python3 -m tools.official_cards.scraper
python3 -m tools.official_cards.scrape_details
```

旧コマンド `python3 scraper.py` / `python3 scrape_details.py` は廃止しています。
リポジトリ外の個人スクリプト等で使用していた場合も新コマンドへ更新してください。

## テスト

`npm run test:python` で全Pythonテストを探索・実行します。
`scrape_details_test.py` がHTML解析、`../python_entrypoints_test.py` がモジュール起動と
従来の入出力先への読み書きを検証します。起動テストは外部通信をモック化し、一時ディレクトリを使用します。
実際のカードデータ取得はビルド・テストから実行しません。
