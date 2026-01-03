// emergency-call-client/sw.js

self.addEventListener('push', function(event) {
    console.log('[Service Worker] Push Received:', event);
    
    try {
        const data = event.data ? event.data.json() : {};
        
        const options = {
            body: data.body || '緊急通話が開始されました',
            // icon: '/icon-192.png', // アイコンファイルが存在する場合にコメントを外してください
            // badge: '/badge-72.png', // バッジファイルが存在する場合にコメントを外してください
            vibrate: [200, 100, 200, 100, 200],
            tag: 'emergency-call',
            requireInteraction: true, // ユーザーが操作するまで通知を消さない
            data: {
                sessionId: data.sessionId,
                senderId: data.senderId,
                url: data.url || self.location.origin
            }
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || '🚨 緊急コール', options)
        );

    } catch (e) {
        console.error('[Service Worker] Error processing push event:', e);
        // フォールバック通知
        const fallbackOptions = { body: '新しい通知があります。' };
        event.waitUntil(
            self.registration.showNotification('通知', fallbackOptions)
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close();
    
    if (!event.notification.data || !event.notification.data.url) {
        console.error('[Service Worker] Notification data or URL is missing.');
        return;
    }
    
    const sessionId = event.notification.data.sessionId;
    const senderId = event.notification.data.senderId;
    const urlToOpen = new URL(event.notification.data.url);
    
    // URLパラメータを追加
    urlToOpen.searchParams.append('autoAnswer', 'true');
    if (sessionId) {
        urlToOpen.searchParams.append('sessionId', sessionId);
    }
    if (senderId) {
        urlToOpen.searchParams.append('senderId', senderId)
    }    
    // クライアント（ブラウザのタブ）を開く
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
            // 既に同じページが開いているかチェック
            const hadWindowToFocus = clientsArr.some(windowClient => {
                if (windowClient.url === urlToOpen.href) {
                    windowClient.focus();
                    return true;
                }
                return false;
            });

            // 開いていなければ新しいタブで開く
            if (!hadWindowToFocus) {
                clients.openWindow(urlToOpen.href).then(windowClient => windowClient ? windowClient.focus() : null);
            }
        })
    );
});
// ... 既存の push / notificationclick イベントハンドラ ...

// ---- tiny IndexedDB helper ----
const DB_NAME = 'emergency-call-sw';
const STORE = 'kv';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ページ側から設定を受け取って保存
self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'SW_CONFIG') {
    // serverUrl, vapidPublicKey, receiverId を保存
    event.waitUntil((async () => {
      if (msg.serverUrl) await idbSet('serverUrl', msg.serverUrl);
      if (msg.vapidPublicKey) await idbSet('vapidPublicKey', msg.vapidPublicKey);
      if (msg.receiverId) await idbSet('receiverId', msg.receiverId);
    })());
  }
  if (msg.type === 'SW_AUTH') {
    // refreshToken を保存
    event.waitUntil((async () => {
      if (msg.refreshToken) await idbSet('refreshToken', msg.refreshToken);
    })());
  }
});

// base64url(VAPID公開鍵) -> Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = self.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// 購読が更新/失効したときに呼ばれる
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const serverUrl = await idbGet('serverUrl');
    const vapidPublicKey = await idbGet('vapidPublicKey');
    const receiverId = await idbGet('receiverId');
    const refreshToken = await idbGet('refreshToken');

    // 必要情報が揃わない場合は、ユーザーに通知して再登録を促す
    if (!serverUrl || !vapidPublicKey || !receiverId || !refreshToken) {
      await self.registration.showNotification('設定の更新が必要です', {
        body: 'アプリを開いて受信者登録をやり直してください。',
        tag: 'emergency-call-maintenance',
        requireInteraction: true,
      });
      return;
    }

    try {
      // 再購読
      const newSub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // サーバに購読更新を通知
      const res = await fetch(`${serverUrl}/update-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId,
          refreshToken,
          subscription: newSub,
        }),
      });

      if (!res.ok) throw new Error('Server update failed');
      
      console.log('[Service Worker] Subscription updated successfully');
    } catch (e) {
      console.error('[Service Worker] Failed to update subscription:', e);
      await self.registration.showNotification('購読の更新に失敗しました', {
        body: 'アプリを開いて再登録してください。',
        tag: 'emergency-call-maintenance',
        requireInteraction: true,
      });
    }
  })());
});