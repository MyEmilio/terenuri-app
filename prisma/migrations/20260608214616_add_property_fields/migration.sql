-- AlterTable
ALTER TABLE "Land" ADD COLUMN     "areaM2" DOUBLE PRECISION,
ADD COLUMN     "floor" INTEGER,
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "marketPrice" DOUBLE PRECISION,
ADD COLUMN     "propertyType" TEXT NOT NULL DEFAULT 'teren-intravilan',
ADD COLUMN     "rooms" INTEGER,
ADD COLUMN     "thumbnailIdx" INTEGER NOT NULL DEFAULT 0;
