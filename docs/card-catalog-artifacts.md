# カードカタログの生成・互換性検証

この段階は、将来の読み込み分割に備えた生成・監査のみです。
アプリは引き続き `public/cards_detailed.json` と `public/cards_preview.json` を読みます。
生成物を利用するコード、保存形式、P2P通信形式、通常のビルド処理は変更していません。

## 実行方法

リポジトリのルートで実行します。外部通信・追加のPythonライブラリは不要です。

```sh
npm run cards:audit:all
npm run cards:generate:catalog
npm run cards:check:catalog
```

入力は発売済み・先行公開の既存JSONです。更新ツールを実行した後は、再度生成して検証します。
`cards:check:catalog` は生成物を一切書き換えず、不足・古いデータ・改変を検出すると終了コード1を返します。
初回は生成物がないので、先に `cards:generate:catalog` を実行してください。
生成・検証の正常終了は0、不正な入力やファイル操作の失敗は1です。

出力先はGit管理対象外の `artifacts/card-catalog/` です。
`public/` の外なので、通常のビルド・公開に生成ファイルが混ざりません。
現在の読み込み量・速度を改善する変更ではありません。

入力・出力はオプションで指定できます。

```sh
python3 -m tools.card_data.generate_catalog \
  --released public/cards_detailed.json \
  --preview public/cards_preview.json \
  --output /tmp/card-catalog-review
python3 -m tools.card_data.generate_catalog --output /tmp/card-catalog-review --check
```

入力ファイルを含むディレクトリは出力先に指定できません。
別用途・不正・未対応スキーマのmanifestがある出力先も、上書きせず拒否します。

## ファイル形式（schemaVersion: 1）

```text
artifacts/card-catalog/
  manifest.json
  versions/<catalogVersion>/
    index.json
    details/BP01.json
    details/BP02.json
    ...
```

- `manifest.json`: スキーマ・カタログのバージョン、件数、ファイル参照、SHA-256、サイズを記録します。
- `index.json`: 統合後の並び順を維持した軽量一覧です。各行の `detail_group` からmanifestの詳細参照を引けます。
- `details/*.json`: 各カードの全項目を保持したJSON配列です。現在の弾フィルターと同じIDの先頭部分でグループ化します。
  ファイル名に使えるグループは英数字とアンダースコアのみです。不正な値は明示的に拒否します。

軽量一覧には次の項目を、入力に存在する場合だけ保持します。

| 用途 | 項目 |
| --- | --- |
| 識別・表示 | `id`, `name`, `image`, `catalog_status` |
| フィルター・同一性 | `class`, `title`, `type`, `subtype`, `rarity`, `product_name`, `cost` |
| 判定用情報 | `atk`, `hp`, `card_kind_normalized`, `deck_section`, `is_token`, `is_evolve_card`, `is_deck_build_legal`, `related_cards` |

`ability_text`・`faces`・未知の拡張項目は軽量一覧に含めませんが、詳細にはそのまま保存します。
文字列、数値、真偽値、空文字、未定義項目の有無を意図せず変換・補完しません。
発売済みのIDを優先し、先行公開のみのカードを後ろに追加する既存の統合規則を維持します。
同名の別IDは削除しません。各入力内の重複IDと、統合後の関連カード参照切れはエラーにします。

**軽量一覧は完全なカードデータの代替ではありません。**
そのまま保存・出力・対戦用データとして使わず、必要な詳細を取得・検証してから操作する設計を次段階で行います。
分類・ルールは生成時に再計算せず、既存の正本の値を維持します。分類自体の監査は既存の `cards:audit:all` が担当します。

## 再現性と確定手順

JSONはUTF-8・キー順固定・compact形式です。カード配列の順序は変えません。
カタログバージョンはスキーマと生成データのSHA-256から決まり、生成時刻を含みません。
manifestは決定的なgzip推計値も含むため、同じPython/zlib環境での再実行で同じ内容になります。

1. 入力を読み、形・重複・参照を検証します。
2. メモリ上で一覧・詳細を生成し、再結合が全項目・順序まで一致することを検証します。
3. 出力先と同じファイルシステムの一時ディレクトリに書き、全ファイルを照合します。
4. 検証済みのバージョンディレクトリを確定します。
5. 入力が生成中に変わっていないことを再確認し、最後にmanifestだけを置き換えます。

既存のバージョンは上書きしません。破損があれば自動修復せずエラーにします。
途中失敗時には以前のmanifestと参照先を維持します。manifest更新前の失敗では、参照されない新バージョンが残る場合があります。
旧バージョンや参照されないバージョンを自動削除する処理は含めていません。

`bytes` は実ファイルのバイト数、`gzipBytes` は標準gzipによる推計です。配信時の圧縮設定を確認した値ではありません。
比較基準の `report.fullCatalog` は、統合後の全カードを同じcompact形式で出力したサイズです。
詳細グループをすべて取得すると、分割前より通信量が増える場合があります。
次段階では一覧のみで開始し、必要な詳細だけを取得した実測値で切り替えを判断します。

## テスト所有先

- `tools/card_data/generate_catalog_test.py`: 統合・再結合・再現性・不正入力・破損・途中失敗・入力の同時変更。
- `tools/python_entrypoints_test.py`: モジュール起動、既定パス、読み取り専用の検証、終了コード。
- `src/utils/card/generatedCardCatalogParity.test.ts`: 実データを一時ディレクトリに生成して既存のアプリ関数と比較。
  一覧フィルター・順序・ページング、保存デッキ・下書き・欠損ID、構築制限、関連トークン、能力値、両面、進化・リンク候補を検証します。

```sh
npm run test:python
npx vitest run src/utils/card/generatedCardCatalogParity.test.ts
```

互換性テストは自分専用の一時ディレクトリを生成・削除するため、ローカルの生成物の有無に依存しません。
