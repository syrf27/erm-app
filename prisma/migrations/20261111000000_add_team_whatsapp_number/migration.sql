ALTER TABLE "Team" ADD COLUMN "whatsappNumber" TEXT;

CREATE UNIQUE INDEX "Team_whatsappNumber_key" ON "Team"("whatsappNumber");
