-- CreateTable
CREATE TABLE "ForwardRule" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "name" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "filterMethod" TEXT,
    "filterBodyKey" TEXT,
    "filterBodyVal" TEXT,
    "destinationUrl" TEXT NOT NULL,
    "retries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForwardRule_pkey" PRIMARY KEY ("id")
);

-- Drop old Delivery foreign key and columns
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_endpointId_fkey";
ALTER TABLE "Delivery" DROP COLUMN "destination";
ALTER TABLE "Delivery" DROP COLUMN "requestId";
ALTER TABLE "Delivery" DROP COLUMN "responseStatus";

-- Add new Delivery columns
ALTER TABLE "Delivery" ADD COLUMN "ruleId" TEXT NOT NULL;
ALTER TABLE "Delivery" ADD COLUMN "requestId" TEXT NOT NULL;
ALTER TABLE "Delivery" ADD COLUMN "targetUrl" TEXT NOT NULL;
ALTER TABLE "Delivery" ADD COLUMN "status" INTEGER;
ALTER TABLE "Delivery" ADD COLUMN "attempt" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "ForwardRule_endpointId_createdAt_idx" ON "ForwardRule"("endpointId", "createdAt" DESC);
CREATE INDEX "Delivery_ruleId_createdAt_idx" ON "Delivery"("ruleId", "createdAt" DESC);
CREATE INDEX "Delivery_requestId_createdAt_idx" ON "Delivery"("requestId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ForwardRule" ADD CONSTRAINT "ForwardRule_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "Endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "Endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ForwardRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
