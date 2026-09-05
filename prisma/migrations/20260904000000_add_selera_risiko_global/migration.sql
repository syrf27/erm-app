CREATE TABLE "SeleraRisikoGlobal" (
    "id" SERIAL NOT NULL,
    "nilai" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeleraRisikoGlobal_pkey" PRIMARY KEY ("id")
);
