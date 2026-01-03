<div align="center">

[日本語](README.md) | [English](README_EN.md)

</div>

# 緊急コールシステム - Webクライアント（emergency-call-client）

このリポジトリは、Web Push（VAPID）で通知を受け取り、通知タップを起点に通話UIへ遷移できる **PWA（Webアプリ）** です。  
バックエンド（通知API）とセットで動作する前提です。

- Client（このリポジトリ）: https://github.com/curionlab/emergency-call-client
- Server（通知API）: https://github.com/curionlab/emergency-call-server

---

## クイックスタート（最短で動かす）

ローカルで「client + server」を揃えて動かす場合、server側の `CLIENT_URL` デフォルトが `http://localhost:5173` になっている前提で、clientは **5173番で起動** するのが最も迷いません。

### 1) Serverを起動する
まず、バックエンド（emergency-call-server）を起動してください。  
詳細な手順は serverリポジトリのREADMEを参照してください。

https://github.com/curionlab/emergency-call-server

（serverはデフォルトで `http://localhost:3000` で起動します）

### 2) Clientを起動する（このリポジトリ）
```bash
# 例）5173で起動する
npx serve -l 5173
# または（環境により）
python3 -m http.server 5173
```

### 3) ブラウザでアクセス
`http://localhost:5173` を開き、Sender（発信者）またはReceiver（受信者）として動作確認してください。

---

## このリポジトリの構成（役割分担）

### index.html
アプリ本体（UI + 主要ロジック）です。

- Sender（発信者）/ Receiver（受信者）の画面を持ちます
- backend server URL を入力して各API（`/login`, `/register`, `/send-notification` など）を呼びます
- 受信者は Push購読（PushSubscription）を作ってサーバへ登録します
- 通知タップ後に開かれたとき、URLクエリ（`autoAnswer`, `sessionId`, `senderId`）を見て自動応答フローへ入ります

### sw.js（Service Worker）
バックグラウンドで Push を受け取り、通知を表示し、通知クリック時の挙動を制御します。

- `push` イベントで payload を読み取り、通知を表示
- `notificationclick` で `autoAnswer=true` を付けて `CLIENT_URL`（通知payloadの `url`）を開きます  
  その際 `sessionId` / `senderId` もクエリに付与し、index.html 側が通話フローに入れるようにします
- `pushsubscriptionchange` イベントで購読情報が変更された場合、自動的にserverへ `/update-subscription` を送ります

### manifest.webmanifest
PWAとして「ホーム画面に追加」されたときのメタ情報です。

- アプリアイコン、名前、表示モードなどを定義します
- `index.html` から `<link rel="manifest" href="manifest.webmanifest">` として参照されます
- 位置づけとしては「インストール可能なPWAとして扱ってもらうための定義ファイル」です

---

## Web Push運用の注意（重要）

### localhost運用は例外として成立します
開発・検証目的なら、同じPC上で client（静的配信）と server（API）を動かし、同じPCのブラウザでPushを受信することは可能です（ブラウザ対応・通知許可が前提）。

### PCでもWeb Pushは受け取れます
このシステムは iPhone 専用ではなく、対応ブラウザであれば PC（デスクトップ）でもPush通知を受信できます。

### iPhoneが外出先でも通知したい場合だけ外部サーバが必要です
iPhoneがモバイル回線など「LAN外」にいる状態でも確実に通知を届けたい場合、ローカルPCのserverでは到達できないため、インターネットから到達可能なserverが必要になります（固定URL、HTTPS、CORS等の整備が必要）。

---

## WebRTC接続の注意（モバイル回線）

### モバイル回線ではIPv6接続を推奨

モバイル回線のIPv4接続では、キャリアグレードNAT（CGNAT）により通話が確立できない場合があります。

**確認方法**  
受信者のスマートフォンで https://test-ipv6.com/ にアクセスし、「IPv6接続性: あり」と表示されることを確認してください。

**IPv4のみの場合の対処**  
- Y!mobileユーザー：APN設定でIPv6対応プロファイルを使用（詳細は[ドキュメント](https://github.com/curionlab/emergency-call-docs)参照）
- 他キャリア：通常はIPv6自動適用（追加設定不要）

詳細は [emergency-call-docs](https://github.com/curionlab/emergency-call-docs) の「トラブルシューティング」を参照してください。

---

## 設定（backend server URL）

このクライアントは「どのserverへ接続するか」を設定して使います。

### 設定方法（基本）
UI上の `serverUrl` 入力欄に server のURLを設定します。

- ローカル開発: `http://localhost:3000`
- 本番環境: `https://your-server.example.com`

### config.example.js について
`config.example.js` は「バックエンドURLなどの設定方法」を示すテンプレートです。

- デフォルトで server は `http://localhost:3000` を想定します
- 運用時は、このテンプレートに従って backend URL を設定してください

※このリポジトリは基本的に静的配信（index.html）なので、最終的な設定の持たせ方は「UI入力」か「ビルド時に埋め込み」かをプロジェクト方針で選べます。

---

## 使い方（serverとセット）

ここでは「client+serverを繋いで通知まで」最小の流れだけ書きます。  
緊急コール（ビデオ/電話あり）の運用設計や詳細な手順は別ドキュメント側で管理する想定です。

### Sender（発信者）の使い方
1. `serverUrl` を設定（例：`http://localhost:3000`）
2. serverにログイン（`/login`）
3. receiverId を指定
4. （必要なら）認証コードを発行（`/generate-auth-code`）※有効期限30分
5. 緊急通知を送信（`/send-notification`）

### Receiver（受信者）の使い方
1. `serverUrl` を設定（例：`http://localhost:3000`）
2. 通知を許可
3. receiverId と authCode（**有効期限30分**）を入力して登録（`/register`）
4. 登録成功後、アクセストークン（有効期限15分）とリフレッシュトークン（有効期限30日）が発行されます
5. Pushを受け取り、通知タップでPWAが開く（sw.jsがURLにパラメータ付与）
6. 自動応答（autoAnswer）フローへ

---

## 購読情報の自動更新（重要）

Push購読情報（subscription）は、ブラウザ/OS都合で更新・失効することがあります。

### 現在の実装
Service Worker で `pushsubscriptionchange` イベントを監視し、購読情報が変更された場合は自動的に server の `/update-subscription` へ更新を送ります。

### 推奨対応
定期的に「疎通確認通知」を送り、購読が生きているか確認することをおすすめします。  
購読が完全に失効している場合は、再度 receiverとして登録（authCodeの再発行→再登録）が必要になる場合があります。

---

## よくあるローカル構成のつまずき

### serverのCLIENT_URLと、clientの起動ポートがズレる
serverの `CLIENT_URL` は「CORS許可」や「通知クリック時に開くURL」に使われます。  
serverのデフォルトが `CLIENT_URL=http://localhost:5173` の場合、clientも 5173番で起動するのが安全です。

推奨構成:
- client: `http://localhost:5173`
- server: `http://localhost:3000`
- server環境変数: `CLIENT_URL=http://localhost:5173`

### Service Workerのキャッシュが残っている
開発中にコードを変更しても反映されない場合、Service Workerのキャッシュが原因の可能性があります。  
開発者ツールで Application > Service Workers から「Unregister」して再読み込みしてください。

---

## トラブルシュート

### 通知が届かない
1. **通知許可を確認**：ブラウザの設定で通知が許可されているか
2. **PWAとして追加されているか**：iPhoneの場合、Safariではなく「ホーム画面に追加したPWA」で開いているか
3. **Service Workerが登録されているか**：開発者ツールで Application > Service Workers を確認
4. **serverのURLが正しいか**：`serverUrl` の入力ミス（http/httpsの違い、ポート番号など）がないか
5. **CORS設定**：serverの `CLIENT_URL` がこのclientのURLと一致しているか

### 急に届かなくなった
- 購読情報が失効している可能性があります。自動更新が失敗している場合は、再登録してください。
- serverのログで送信失敗（HTTP 410など）を確認してください。

### ローカル開発で通知が来ない
- `http://localhost` は通知が動作しますが、`http://192.168.x.x`（ローカルIP）では動作しない場合があります。
- Service Workerのキャッシュが残っている場合、開発者ツールから「Unregister」して再読み込みしてください。

### 認証コードが使えない
- 認証コードの有効期限は **30分** です。期限切れの場合は再発行してください。

---

## ICEサーバー設定（WebRTC）

- **現在**：クライアント関数 `getIceServers()` が STUN のみを返却
- **将来（実装予定）**：serverの `/ice-config` から短期TURN資格を取得する設計（現在未実装）
- PeerJS生成時に `config: { iceServers }` を渡す（RTCPeerConnectionへ伝播）

---

## 技術スタック

- Web Push API + VAPID（通知）
- Service Worker（push受信/通知クリック/購読自動更新）
- WebRTC（通話）
- PeerJS（WebRTCシグナリング）

---

## デプロイ時の注意

### HTTPS必須
iPhoneでのPush運用を本格的にする場合、HTTPSで配信してください（PWA + Service Worker + Push の前提）。

### ファイル配置
- `manifest.webmanifest` と各種アイコン（`icons/icon-192.png` など）が正しく配置されているか確認してください
- `sw.js` は **ルートディレクトリ** に配置することを推奨します（Service Workerのscopeがルートになります）

### 静的ホスティング推奨
このリポジトリは静的サイトなので、Cloudflare Pages、GitHub Pages、Netlifyなどに向いています。

---

## セキュリティ注意

- **localStorage使用について**：このクライアントはアクセストークン・リフレッシュトークンを `localStorage` に保存します。XSS攻撃への対策として、外部スクリプトの埋め込みや信頼できないコンテンツの表示は避けてください。
- **VAPID秘密鍵はserverのみ**：クライアントは公開鍵のみを扱います。秘密鍵は絶対にクライアント側に配置しないでください。
- **認証コードの管理**：認証コードは第三者に漏れないよう注意してください（有効期限30分）。

---

## ドキュメント

詳細: https://github.com/curionlab/emergency-call-docs

---

## ライセンス

このプロジェクトは MIT License のもとで公開されています。詳細は `LICENSE` を参照してください。
