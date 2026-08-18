importScripts("https://www.gstatic.com/firebasejs/9.8.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.8.1/firebase-messaging-compat.js");

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Extract config from registration query string to avoid hardcoding public keys
const urlParams = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: urlParams.get("apiKey"),
  authDomain: urlParams.get("authDomain"),
  projectId: urlParams.get("projectId"),
  storageBucket: urlParams.get("storageBucket"),
  messagingSenderId: urlParams.get("messagingSenderId"),
  appId: urlParams.get("appId"),
};

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message:", payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || "gojags risk";
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || "Ada pembaruan penting di sistem gojags risk.",
      icon: payload.notification?.image || payload.data?.image || "/gojags.png",
      badge: "/gojags.png",
      data: payload.data,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
