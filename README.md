# 緊急コールシステム - Webクライアント（emergency-call-client）

本クライアントは Web Push（VAPID）と WebRTC（PeerJS）を組み合わせた、プライバシー優先の緊急ビデオコールUIです。

## 仕様方針
- 機密はクライアントに置かず、環境変数でサーバ側管理（12-Factor 原則）
- 現状は STUN のみで動作し、将来は /ice-config に切替えて TURN を短期資格で配布予定
- VAPID は公開鍵のみクライアント利用、秘密鍵はサーバ側に限定

## 開発/動作手順
1. 静的サーバで index.html を配信（例: `python3 -m http.server 8000`）
2. 受信者ページで通知許可 → 購読登録（サーバに登録APIあり）
3. 発信者ページで受信者IDとサーバURLを指定 → 緊急コール実行

## ICEサーバー切替
- 現在: クライアント関数 `getIceServers()` が STUN のみを返却
- 将来: サーバ `/ice-config` から `iceServers` を取得（短期TURN資格＋STUN）
- PeerJS 生成時に `config: { iceServers }` を渡す（RTCPeerConnectionへ伝播）

## 設定ファイル（テンプレート）
- `config.example.yaml` は参考テンプレートで、クライアントでは読み込みません（機密は不可）
- 実体の `config.yaml` や `.env` はコミットせず、将来サーバ側に移譲します（12-Factor）

## セキュリティ
- TURN 資格の固定配布はしない（短期資格のサーバ配布へ）
- Web Push の VAPID 秘密鍵はサーバ限定（公開鍵のみ配布）

## 技術スタック
- **PeerJS** - WebRTCシグナリング
- **Web Push API** - VAPID標準プロトコル
- **Service Worker API** - バックグラウンド通知

## 機能
- ✓ 発信者モード（緊急ボタン）
- ✓ 受信者モード（プッシュ通知受信）
- ✓ WebRTC P2P通話
- ✓ オートアンサー機能
- ✓ 認証コードによるセキュリティ

## ローカル開発
```
任意のHTTPサーバーで起動
python3 -m http.server 8000

または
npx serve
```

## デプロイ
Cloudflare Pagesに自動デプロイ

## ドキュメント
詳細: https://github.com/curionlab/emergency-call-docs