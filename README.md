# TailSight Device Preview 🕶️

**Rokid Glasses / Even Realities G2 のHUD見え方を、実機なしで確認するスタンドアロン・シミュレータ。**
夜の街の一人称視界に、両デバイスのHUD（配置・行構成）を実際のパケット形式で重ねて表示します。

*Rreview how your HUD card looks on Rokid Glasses and Even Realities G2 — first-person view, device-accurate HUD placement (Rokid = center card, Even G2 = top-center 4-line strip), no hardware needed.*

## 使い方

`index.html` をブラウザで開くだけ（依存なし・ビルドなし・CDNなし）。

1. **デバイス選択**（視界内のラベルをクリックしても切替）
   - Rokid Glasses — 中央下のカード型HUD（方位矢印・距離・ETA・予測）
   - Even Realities G2 — 上部中央の短文4行HUD（実機の設計ガイドラインどおり）
2. 右パネルで **距離・対象方位・状態・予測テキスト** を変更 → HUDとARピン（赤いTARGETマーカー）が即座に追従
3. **ドラッグで首振り**（HUDは頭に固定、ARピンは世界に固定＝実際のARグラスの挙動）、ダブルクリックで対象を正面に
4. 画面下の **packet JSON** が `device-adapters.js` から生成される実際の送信データ。HUDを変えたければ `packet()` を書き換えるだけ

## 独自HUDのプレビュー方法

`device-adapters.js` の該当デバイスの `packet(state)` を編集すると、HUD表示と packet JSON が同時に変わります。
TailSight 本体 ([toriumib/tailsight](https://github.com/toriumib/tailsight)) と同じ共通I/F（`caps` / `photoActor` / `packet()`）なので、そのまま本システムへ持ち込み可能です。

## ファイル

| パス | 内容 |
|---|---|
| `index.html` | UI（視界+コントロール+パケット表示） |
| `preview.js` | パノラマ生成・首振り・ARピン・HUD描画 |
| `device-adapters.js` | デバイスアダプタ（Rokid / Even G2 共通I/F） |

## 注意

- シミュレーション専用ツールです。位置・対象はすべて仮想データです
- Rokid・Even Realities の商標は各権利者に帰属します（非公式・無関係）
- MIT License
