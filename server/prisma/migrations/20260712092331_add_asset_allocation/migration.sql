-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "allocatedToId" TEXT;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_allocatedToId_fkey" FOREIGN KEY ("allocatedToId") REFERENCES "users"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
