-- CreateTable
CREATE TABLE "Land" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "link" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "score" INTEGER NOT NULL,
    "negotiatedPrice" DOUBLE PRECISION,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Land_pkey" PRIMARY KEY ("id")
);
