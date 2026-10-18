# 共通カードデータ処理

公式取得とpreview同期が共有する分類・監査処理です。外部通信や取得元固有の処理を持ちません。

- `card_metadata.py`: 種類から分類・デッキ区分・各フラグを生成します。
- `audit_cards.py`: 正式カードの整合性を監査します。
- `audit_preview_cards.py`: previewを監査します。同期ツールは `load_cards()` と `validate_preview_cards()` を利用します。
- `generate_catalog.py`: 軽量一覧・詳細グループ・manifestをオフラインで生成・検証します。
  ビルドと開発配信から利用します。形式と安全策は
  [`../../docs/card-catalog-artifacts.md`](../../docs/card-catalog-artifacts.md) を参照してください。

- `measure_catalog.py`: ビルドと同じ生成処理から、初回・選択デッキ・全詳細のファイルサイズと一覧項目別の値のサイズを計測します。
  正本・生成物を書き換えず、標準出力へJSONを返します。`--check-output`で既存生成物の一致も検証できます。

- `compare_partitions.py`: 枚数・UTF-8サイズ上限による詳細分割をメモリー内で比較します。配信用artifactは作りません。
  [比較条件と結果](../../docs/card-catalog-partition-comparison.md)を参照してください。

リポジトリのルートで実行してください。

```sh
npm run cards:audit
npm run cards:audit:preview
npm run cards:audit:all
npm run cards:measure:catalog -- --deck public/sample-decks/constructed-royal-sample.json
npm run test:python
```

監査は従来どおり実行ディレクトリの `public/cards_detailed.json` と
`public/cards_preview.json` を読みます。ファイルを書き換えません。
内部の起動方法は `python3 -m tools.card_data.audit_cards` と
`python3 -m tools.card_data.audit_preview_cards` です。
旧ルート配置へのimportや `python3 audit_cards.py` などの直接実行は使用しません。

依存方向は `official_cards → card_data`、`svestats_preview → card_data` です。
共通処理から取得ツールへは依存しません。分類・preview監査のテストを同じフォルダに配置しています。

監査のモジュール起動・終了コード（正常0、不整合1）・入力ファイルを変更しないことは
`../python_entrypoints_test.py` で検証しています。
