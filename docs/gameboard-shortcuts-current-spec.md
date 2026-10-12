# GameBoard ショートカットの現在仕様

更新日: 2026-10-12

現在の作業ツリーで実装されているキーボード・修飾キー・マウス操作を記録する。新しいショートカットの提案や実装予定は含まない。公開済みアプリの状態は、デプロイされているコードに依存する。

## Mac / Windows の対応表

| 操作 | Mac | Windows | 条件 |
| --- | --- | --- | --- |
| 通常の操作Undo | ⌘＋Z | Ctrl＋Z | 通常Undoボタンと同じ履歴・権限条件。入力中・ダイアログ等の表示中・ドラッグ中は無効 |
| 複数選択を開始してカードを選択する | ⌘＋クリック | Ctrl＋クリック | 対戦中、複数選択が利用できる状態で、場・EXのカードをクリック |
| 複数選択中に選択・解除する | カードをクリック | カードをクリック | 複数選択中。修飾キーを押し続ける必要はない |
| 複数選択中にキーボードで選択・解除する | カードにフォーカスしてEnter／Space | カードにフォーカスしてEnter／Space | 複数選択中の場・EXのカード |
| 複数選択を終了する | Esc | Esc | 選択モードと選択内容を解除 |
| 攻撃モードを終了する | Esc | Esc | 攻撃元を選択している状態 |
| カード詳細を閉じる | Esc | Esc | カード詳細が開いている状態 |
| タッチ向けカード操作メニューを閉じる | Esc | Esc | タッチ操作メニューが開いている状態 |
| レスト／スタンドする | 右クリック／副クリック | 右クリック | 操作可能なカード。複数選択中やスタック下のカードなどは対象外 |
| キーボードでドラッグを開始する | カードにフォーカスしてEnter／Space | カードにフォーカスしてEnter／Space | ドラッグ可能なカード。複数選択中は選択・解除が優先 |
| キーボードでドラッグ位置を動かす | 矢印キー | 矢印キー | キーボードドラッグ中 |
| キーボードドラッグを確定する | Enter／Space／Tab | Enter／Space／Tab | キーボードドラッグ中。移動先の判定は既存のドラッグ規則に従う |
| キーボードドラッグを中止する | Esc | Esc | キーボードドラッグ中 |

複数選択の修飾キーは、実装上は`ctrlKey`と`metaKey`のどちらも受け付ける。MacではCtrl＋クリックも対象だが、OSの副クリックとの競合を避けるため、複数選択には⌘＋クリックを使う。

通常のボタンにフォーカスしてEnter／Spaceで押す操作や、Tabによるフォーカス移動は、ブラウザやコンポーネントの通常操作であり、ゲーム専用のショートカットではない。

## 通常Undoのショートカット

- Macは⌘＋Z、WindowsはCtrl＋Zを使用する。実装はどちらの修飾キーも受け付けるが、同時押し・Shift／Altとの組み合わせは対象外。
- 通常Undoボタンが有効な場合だけ、同じ処理を1回実行する。ターン終了Undoを実行したり、その確認を開いたりしない。
- オンラインでは自分の有効な履歴が対象。相手ターン中もボタンと同じ条件で使える。ソロでは最新履歴の操作主体に従い、現在ターンのプレイヤーに固定しない。
- 複数選択中も使用でき、ボタンと同様に選択モードを終了してから取り消す。
- 入力欄・選択欄・編集可能領域では発火させず、ブラウザの文字編集Undoを維持する。日本語変換中・キー長押し・既に他の処理が消費したキーも対象外。
- サーチ、ルック、確認、トークン生成、保存デッキなどのダイアログ、ゾーン操作メニュー、カード詳細、攻撃モード、タッチ操作メニュー、ナビゲーションメニューを表示中は発火させない。
- ポインター／キーボードでカードをドラッグ中も発火させない。
- 数値調整のまとめ方、状態の復元、相手操作後の履歴失効、公開・非公開情報、ログ・一時通知はボタン経由と同じ。
- ボタンには`aria-keyshortcuts`を付ける。画面にボタンや行を追加しない。

## 複数選択の対象と制限

- 自分・相手の場（Field）とEXが対象。両側を混在して選択できる。
- 手札・メインデッキ・エボルヴデッキ・墓場・除外・リーダーは対象外。
- リンク・エボルヴなどの重なりは、既存のカードまとまりとして選択する。関連カードをクリックしても同じまとまりの選択・解除になる。
- オンラインでは接続済みで、操作可能な状態であることが必要。観戦者は使用できない。ソロでは両プレイヤーの対象カードを選択できる。
- サーチ、ルック、数値入力、トークン生成、確認などの関連ダイアログ表示中や攻撃モード中は、複数選択を開始できない。
- ターン・ゲーム状態・操作権限・ダイアログの状態が変わると、既存の境界規則により選択を解除する。
- 「全選択」はゾーンごとの既存ボタンで行う。Ctrl／⌘＋Aは割り当てていない。
- Ctrl／⌘＋クリックによる選択が成立すると、同じ入力でカード詳細を開いたりレストしたりしない。対象外などで選択が成立しなければ、既存のカード操作が適用される。

## Escの扱い

Escの処理は各機能が個別に登録している。上記のほか、画面上部のPlayメニュー・言語メニューもEscで閉じる。

すべてのダイアログを共通で閉じる仕組みや、「最前面のUIだけを1つ閉じる」共通の優先順位は実装していない。Undo確認、Reset確認、サーチなどについて、Escで一律に閉じられるとは扱わない。

## キーボードドラッグの位置付け

`GameBoard`は`DndContext`の既定センサーを使用し、カードはドラッグリスナーを受け取る。キーボードドラッグは、現在導入されている`@dnd-kit/core`の標準動作に由来する。

- 開始: Enter／Space
- 移動: 矢印キーで25pxずつ座標を変更
- 確定: Enter／Space／Tab
- 中止: Esc

特定のキーで場・墓場などのゾーンへ直接送る仕組みではない。複数選択中はカードのEnter／Spaceを選択切り替えに使い、ドラッグを無効にする。操作ロックや既存の移動先制限も維持する。

これは実装と導入済みライブラリから確認した動作であり、ゲームボード専用に最適化・案内したキーボード移動ではない。キーボードドラッグの全ゾーン・Mac／Windows実機での操作は専用E2Eで網羅していない。

## 未実装のゲーム専用ショートカット

以下は両OSとも未実装。表のキーは一般的な候補表記であり、現在割り当てているキーではない。

| 操作 | Mac | Windows |
| --- | --- | --- |
| 全選択 | ⌘＋Aの割り当てなし | Ctrl＋Aの割り当てなし |
| 複数選択モードの開始 | 専用キーなし | 専用キーなし |
| ドロー・サーチ・ルック・シャッフル | 専用キーなし | 専用キーなし |
| ライフ・PP・カード数値の調整 | 専用キーなし | 専用キーなし |
| 選択カードの墓場送り・除外など | 専用キーなし | 専用キーなし |
| ターン終了・ターン終了Undo | 専用キーなし | 専用キーなし |

入力欄などでの⌘／Ctrl＋Zはゲーム操作として捕捉しない。⌘／Ctrl＋Aにもゲーム専用の割り当てはない。

## 実装・テストの参照先

| 契約 | 実装 | 主なテスト |
| --- | --- | --- |
| 通常Undoキーの判定・入力保護・長押し・IME・オーバーレイ・ドラッグ | [useGameBoardUndoShortcut.ts](../src/hooks/gameBoard/useGameBoardUndoShortcut.ts) | [useGameBoardUndoShortcut.test.tsx](../src/hooks/gameBoard/useGameBoardUndoShortcut.test.tsx)、[GameBoard.test.tsx](../src/pages/GameBoard.test.tsx)、[solo-undo-shortcut.spec.ts](../e2e/solo-undo-shortcut.spec.ts) |
| 修飾キークリック、Enter／Spaceでの選択、右クリック | [Card.tsx](../src/components/Card.tsx) | [Card.test.tsx](../src/components/Card.test.tsx) |
| 複数選択の条件、対象、Esc終了 | [useGameBoardMultiSelection.ts](../src/hooks/gameBoard/useGameBoardMultiSelection.ts)、[GameBoard.tsx](../src/pages/GameBoard.tsx) | [useGameBoardMultiSelection.test.tsx](../src/hooks/gameBoard/useGameBoardMultiSelection.test.tsx)、[solo-multi-selection.spec.ts](../e2e/solo-multi-selection.spec.ts) |
| 詳細・攻撃モードのEsc | [useGameBoardInspectorUi.ts](../src/hooks/gameBoard/useGameBoardInspectorUi.ts)、[useGameBoardAttackUi.ts](../src/hooks/gameBoard/useGameBoardAttackUi.ts) | [GameBoard.test.tsx](../src/pages/GameBoard.test.tsx)、[gameBoardDismissals.test.ts](../src/utils/gameBoard/gameBoardDismissals.test.ts) |
| タッチ操作メニューのEsc | [GameBoardTouchActionSheet.tsx](../src/components/gameBoard/GameBoardTouchActionSheet.tsx) | 全OS・実機のキー操作を網羅する専用テストはなし |

## 検証記録（通常Undoショートカット追加時）

- Vitest全2,535件、lint、アプリ型チェック、ビルドは成功。
- Chromium E2E全37件は成功。Ctrl／Metaキー、数値グループと移動の復元、長押し、ダイアログ／数値入力、キーボードドラッグ中と中止後の挙動を含む。
- Mac／Windowsそれぞれの実キーボードとSafari、日本語IMEの実環境は未確認。IMEは合成イベントによるフックテストで確認している。
- オンラインの操作権限は既存のUndo判定・処理を再利用する。ページテストではホスト・ゲストの相手ターン中のキー操作を確認し、実機間のWebRTC確認は今回行っていない。

## 関連文書

- [ゲームボードのユーザーガイド](gameboard-user-guide.md)
- [Undoの現在仕様](gameboard-undo-current-spec.md)
