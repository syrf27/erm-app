import { initializeApp, cert } from "firebase-admin";
import { getMessaging } from "firebase-admin/messaging";
import { prisma } from "../src/lib/prisma";
import * as dotenv from "dotenv";

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Firebase Admin variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY) not found in .env");
  process.exit(1);
}

// Initialise Firebase Admin
initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

async function sendTestPush() {
  const targetEmail = process.argv[2] || "admin@erm.com";
  console.log(`Searching for tokens of user: ${targetEmail}`);

  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
    include: { fcmTokens: true },
  });

  if (!user) {
    console.error("User not found!");
    process.exit(1);
  }

  if (user.fcmTokens.length === 0) {
    console.error("No registered FCM tokens found for this user. Please log in, allow notifications, and try again.");
    process.exit(1);
  }

  console.log(`Found ${user.fcmTokens.length} token(s). Sending test notifications...`);

  for (const fcm of user.fcmTokens) {
    try {
      const response = await getMessaging().send({
        token: fcm.token,
        notification: {
          title: "ERM Push Notification Test",
          body: "Halo! Ini adalah notifikasi pengujian dari Firebase Cloud Messaging Admin SDK.",
        },
        data: {
          url: "/manajemen-risiko/risk-appetite",
        },
      });
      console.log(`Notification successfully sent to token starting with "${fcm.token.substring(0, 10)}...". Message ID: ${response}`);
    } catch (error) {
      console.error(`Failed to send notification to token:`, error);
    }
  }

  await prisma.$disconnect();
}

sendTestPush();
