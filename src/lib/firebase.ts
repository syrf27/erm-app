import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, MessagePayload, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// FCM support check
export const isFcmSupported = () => {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  );
};

export const getFirebaseApp = () => {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
};

export const getFcmToken = async () => {
  if (!isFcmSupported()) return null;
  try {
    const app = getFirebaseApp();
    const messaging = getMessaging(app);

    // Dynamic config registration query params
    const configQuery = new URLSearchParams(firebaseConfig as any).toString();
    const reg = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${configQuery}`,
      { scope: "/" }
    );

    // Wait for the service worker to become fully active
    const serviceWorker = reg.active || reg.waiting || reg.installing;
    if (serviceWorker && serviceWorker.state !== "activated") {
      await new Promise<void>((resolve) => {
        serviceWorker.addEventListener("statechange", (e) => {
          if ((e.target as ServiceWorker).state === "activated") {
            resolve();
          }
        });
        setTimeout(resolve, 2000); // 2 second timeout guard
      });
    }

    const token = await getToken(messaging, {
      serviceWorkerRegistration: reg,
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    return token;
  } catch (error) {
    console.error("Error registering service worker or fetching FCM token:", error);
    return null;
  }
};

export const onMessageListener = (callback: (payload: MessagePayload) => void) => {
  if (!isFcmSupported()) return () => {};
  try {
    const app = getFirebaseApp();
    const messaging = getMessaging(app);
    return onMessage(messaging, callback);
  } catch (error) {
    console.error("Error setting up onMessageListener:", error);
    return () => {};
  }
};
