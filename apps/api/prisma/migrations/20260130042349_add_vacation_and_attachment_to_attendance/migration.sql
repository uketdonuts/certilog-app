/*
  Warnings:

  - A unique constraint covering the columns `[cedula]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicTrackingToken]` on the table `deliveries` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('ATTENDANCE', 'ABSENCE', 'VACATION', 'DISABILITY', 'TARDY');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "TireCondition" AS ENUM ('GOOD', 'WARNING', 'REPLACE');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'HELPER';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "cedula" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "publicTrackingToken" TEXT,
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "videoUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "basePhone" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "insurancePolicy" TEXT,
ADD COLUMN     "insurerName" TEXT,
ADD COLUMN     "insurerPhone" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "licensePlate" TEXT,
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "nextWeightReview" TIMESTAMP(3),
ADD COLUMN     "personalPhone" TEXT,
ADD COLUMN     "secondLastName" TEXT;

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "vin" TEXT,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "driverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gas_reports" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "reportedBy" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liters" DECIMAL(10,2) NOT NULL,
    "cost" DECIMAL(12,2),
    "odometer" INTEGER,
    "fuelType" TEXT,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gas_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "AttendanceType" NOT NULL,
    "minutesLate" INTEGER,
    "reason" TEXT,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "reportedBy" TEXT,
    "approvedBy" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_maintenance_reports" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "reportedBy" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "severity" TEXT,
    "attachments" JSONB,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_maintenance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preventive_maintenances" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "performedAt" TIMESTAMP(3),
    "type" TEXT,
    "performedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preventive_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repairs" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedBy" TEXT,
    "description" TEXT NOT NULL,
    "cost" DECIMAL(12,2),
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_semaphore" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "inspectorId" TEXT,
    "frontLeft" "TireCondition" NOT NULL DEFAULT 'GOOD',
    "frontRight" "TireCondition" NOT NULL DEFAULT 'GOOD',
    "rearLeft" "TireCondition" NOT NULL DEFAULT 'GOOD',
    "rearRight" "TireCondition" NOT NULL DEFAULT 'GOOD',
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_semaphore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_licensePlate_key" ON "vehicles"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE INDEX "gas_reports_vehicleId_date_idx" ON "gas_reports"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "attendance_records_userId_date_idx" ON "attendance_records"("userId", "date");

-- CreateIndex
CREATE INDEX "fleet_maintenance_reports_vehicleId_status_idx" ON "fleet_maintenance_reports"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "preventive_maintenances_vehicleId_scheduledAt_idx" ON "preventive_maintenances"("vehicleId", "scheduledAt");

-- CreateIndex
CREATE INDEX "repairs_vehicleId_date_idx" ON "repairs"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "tire_semaphore_vehicleId_recordedAt_idx" ON "tire_semaphore"("vehicleId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "customers_cedula_key" ON "customers"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_publicTrackingToken_key" ON "deliveries"("publicTrackingToken");

-- CreateIndex
CREATE INDEX "deliveries_publicTrackingToken_idx" ON "deliveries"("publicTrackingToken");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_reports" ADD CONSTRAINT "gas_reports_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_reports" ADD CONSTRAINT "gas_reports_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_maintenance_reports" ADD CONSTRAINT "fleet_maintenance_reports_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_maintenance_reports" ADD CONSTRAINT "fleet_maintenance_reports_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenances" ADD CONSTRAINT "preventive_maintenances_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_semaphore" ADD CONSTRAINT "tire_semaphore_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_semaphore" ADD CONSTRAINT "tire_semaphore_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
