-- CreateTable
CREATE TABLE "delivery_route_points" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "accuracy" DECIMAL(5,2),
    "speed" DECIMAL(5,2),
    "batteryLevel" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_route_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_route_points_deliveryId_recordedAt_idx" ON "delivery_route_points"("deliveryId", "recordedAt" ASC);

-- CreateIndex
CREATE INDEX "delivery_route_points_courierId_recordedAt_idx" ON "delivery_route_points"("courierId", "recordedAt" DESC);

-- AddForeignKey
ALTER TABLE "delivery_route_points" ADD CONSTRAINT "delivery_route_points_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_route_points" ADD CONSTRAINT "delivery_route_points_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
