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

    const recipients = [...userTeams] as Array<{
      userId: number;
      user: { fcmTokens: Array<{ token: string }> };
    }>;
    if (team.ketuaTim) {
      const ketua = await prisma.user.findFirst({
        where: {
          OR: [{ email: team.ketuaTim }, { name: team.ketuaTim }],
        },
        include: { fcmTokens: true },
      });
      if (ketua && !recipients.some((recipient) => recipient.userId === ketua.id)) {
        recipients.push({ userId: ketua.id, user: ketua });
      }
    }

    const title = "gojags risk - Pengingat Penanganan Risiko";
    const evidenceUrl =
      process.env.EVIDENCE_DRIVE_URL ||
      "https://drive.google.com/drive/my-drive";
    const targetWaktu = rtp.targetWaktu || "belum ditentukan";
    const rencana = rtp.rencanaTidakPenanganan || "belum diisi";
    const ketuaTim = team.ketuaTim || "Ketua Tim";
    const body = [
      `Yth. Tim ${team.nama},`,
      "",
      "Mohon menindaklanjuti rencana penanganan risiko berikut:",
      `Risiko: ${rtp.identifikasiRisiko.risiko}`,
      `Rencana penanganan: ${rencana}`,
      `Target waktu: ${targetWaktu}`,
      `Ketua Tim: ${ketuaTim}`,
      "",
      "Setelah penanganan dilaksanakan, mohon lengkapi realisasi dan unggah bukti pendukung melalui tautan berikut:",
      evidenceUrl,
      "",
      "Terima kasih atas tindak lanjutnya.",
      "gojags risk",
    ].join("\n");
    const url = `/pemantauan-risiko`;

    // 3. Create in-app notifications in the database
    if (recipients.length > 0) {
      try {
        await prisma.notification.createMany({
          data: recipients.map((ut) => ({
            userId: ut.userId,
            title,
            body,
            url,
            isRead: false,
          })),
        });
        console.log(`In-app notifications saved to database for ${recipients.length} users.`);
      } catch (dbErr) {
        console.error("Error creating database notifications:", dbErr);
      }
    }

    // 4. Extract active tokens for push notifications
    const tokens: string[] = [];
    recipients.forEach((ut) => {
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

    console.log(`Sending push notifications to ${tokens.length} recipients for team ${team.nama}...`);

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
