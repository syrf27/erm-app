import { prisma } from "./prisma";
import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

function getFirebaseAdminMessaging() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase Admin credentials are not set in environment variables.");
    return null;
  }

  try {
    const apps = getApps();
    const app = apps.length === 0
      ? initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        })
      : getApp();
    return getMessaging(app);
  } catch (e) {
    console.error("Error initializing Firebase Admin:", e);
    return null;
  }
}

export async function sendRtpPushNotification(rtpId: number) {
  try {
    // 1. Fetch RTP with associated Risk (identifikasiRisiko)
    const rtp = await prisma.rencanaPenanganan.findUnique({
      where: { id: rtpId },
      include: {
        identifikasiRisiko: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!rtp || !rtp.identifikasiRisiko) {
      console.warn(`RTP with ID ${rtpId} or its associated Risk not found.`);
      return;
    }

    const penanggungJawabName = rtp.penanggungJawab;
    if (!penanggungJawabName) {
      console.warn(`No Penanggung Jawab team specified on RTP ID ${rtpId}.`);
      return;
    }

    const team = await prisma.team.findFirst({
      where: { nama: penanggungJawabName },
    });

    if (!team) {
      console.warn(`Team named "${penanggungJawabName}" not found in database.`);
      return;
    }

    // 2. Find ALL users belonging to that Team (Tim Kerja) via UserTeam
    const userTeams = await prisma.userTeam.findMany({
      where: { teamId: team.id },
      include: {
        user: {
          include: {
            fcmTokens: true,
          },
        },
      },
    });

    const title = "gojags risk - Pembaruan RTP";
    const body = `RTP "${rtp.rencanaTidakPenanganan || "Tanpa Nama"}" pada Risiko "${rtp.identifikasiRisiko.risiko}" (Tim: ${team.nama}) telah diperbarui.`;
    const url = `/pemantauan-risiko`;

    // 3. Create in-app notifications in the database
    if (userTeams.length > 0) {
      try {
        await prisma.notification.createMany({
          data: userTeams.map((ut) => ({
            userId: ut.userId,
            title,
            body,
            url,
            isRead: false,
          })),
        });
        console.log(`In-app notifications saved to database for ${userTeams.length} users.`);
      } catch (dbErr) {
        console.error("Error creating database notifications:", dbErr);
      }
    }

    // 4. Extract active tokens for push notifications
    const tokens: string[] = [];
    userTeams.forEach((ut) => {
      if (ut.user && ut.user.fcmTokens) {
        ut.user.fcmTokens.forEach((fcm) => {
          if (fcm.token) {
            tokens.push(fcm.token);
          }
        });
      }
    });

    if (tokens.length === 0) {
      console.log(`No active FCM tokens found for members of team: ${team.nama}`);
      return;
    }

    const messaging = getFirebaseAdminMessaging();
    if (!messaging) {
      console.warn("FCM messaging is not initialized.");
      return;
    }

    console.log(`Sending push notifications to ${tokens.length} tokens for team ${team.nama}...`);

    for (const token of tokens) {
      try {
        await messaging.send({
          token,
          notification: {
            title,
            body,
          },
          data: {
            url,
          },
        });
        console.log(`Push notification sent successfully to token starting with "${token.substring(0, 10)}...".`);
      } catch (err) {
        console.error("Error sending push notification to token:", err);
      }
    }
  } catch (error) {
    console.error("Error in sendRtpPushNotification:", error);
  }
}
