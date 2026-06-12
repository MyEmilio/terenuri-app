-- CreateTable
CREATE TABLE "MarketListing" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "locality" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "link" TEXT,
    "description" TEXT,
    "areaM2" DOUBLE PRECISION,
    "propertyType" TEXT NOT NULL DEFAULT 'teren-intravilan',
    "imageUrl" TEXT,
    "rooms" INTEGER,
    "floor" INTEGER,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "MarketListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketListing_link_key" ON "MarketListing"("link");
