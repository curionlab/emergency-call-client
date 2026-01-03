// config.js
// Cloudflareのデプロイコマンドで作成し、
// Cloudflareの環境変数にermegency-call-serverのAPI_BASE_URLを設定する。
// echo "window.__APP_CONFIG__ = { API_BASE_URL: '${API_BASE_URL}' };" > config.js
// API_BASE_URL: "https://your-emergency-call-server.com"
window.__APP_CONFIG__ = {
    API_BASE_URL: "http://localhost:3000"
};
  
  