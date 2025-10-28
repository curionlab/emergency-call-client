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
