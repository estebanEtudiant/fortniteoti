-- CreateEnum
CREATE TYPE "LicensePlan" AS ENUM ('DAYS_30', 'DAYS_90', 'DAYS_365', 'LIFETIME');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'BANNED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "ActivationStatus" AS ENUM ('SUCCESS', 'HWID_MISMATCH', 'EXPIRED', 'BANNED', 'INVALID_KEY', 'RATE_LIMITED');

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" UUID NOT NULL,
    "license_key" VARCHAR(29) NOT NULL,
    "plan" "LicensePlan" NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "hwid" VARCHAR(64),
    "hwid_bound_at" TIMESTAMP(3),
    "email" VARCHAR(255),
    "discord_id" VARCHAR(50),
    "stripe_sub_id" VARCHAR(255),
    "stripe_customer_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "banned_at" TIMESTAMP(3),
    "ban_reason" TEXT,
    "last_heartbeat" TIMESTAMP(3),
    "activation_count" INTEGER NOT NULL DEFAULT 0,
    "max_activations" INTEGER NOT NULL DEFAULT 1,
    "last_ip" VARCHAR(45),
    "metadata" JSONB,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activations" (
    "id" UUID NOT NULL,
    "license_id" UUID NOT NULL,
    "hwid" VARCHAR(64) NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "machine_info" JSONB,
    "user_agent" VARCHAR(500),
    "status" "ActivationStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activation_logs" (
    "id" UUID NOT NULL,
    "license_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "ip_address" VARCHAR(45),
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "license_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_ips" (
    "id" UUID NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "reason" VARCHAR(255),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "blocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocked_ips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_license_key_key" ON "licenses"("license_key");

-- CreateIndex
CREATE INDEX "licenses_license_key_idx" ON "licenses"("license_key");

-- CreateIndex
CREATE INDEX "licenses_hwid_idx" ON "licenses"("hwid");

-- CreateIndex
CREATE INDEX "licenses_status_idx" ON "licenses"("status");

-- CreateIndex
CREATE INDEX "licenses_expires_at_idx" ON "licenses"("expires_at");

-- CreateIndex
CREATE INDEX "activations_license_id_idx" ON "activations"("license_id");

-- CreateIndex
CREATE INDEX "activations_hwid_idx" ON "activations"("hwid");

-- CreateIndex
CREATE INDEX "activations_created_at_idx" ON "activations"("created_at");

-- CreateIndex
CREATE INDEX "activation_logs_license_id_idx" ON "activation_logs"("license_id");

-- CreateIndex
CREATE INDEX "activation_logs_action_idx" ON "activation_logs"("action");

-- CreateIndex
CREATE INDEX "activation_logs_created_at_idx" ON "activation_logs"("created_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_license_id_idx" ON "refresh_tokens"("license_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_ips_ip_address_key" ON "blocked_ips"("ip_address");

-- CreateIndex
CREATE INDEX "blocked_ips_ip_address_idx" ON "blocked_ips"("ip_address");

-- CreateIndex
CREATE INDEX "blocked_ips_expires_at_idx" ON "blocked_ips"("expires_at");

-- AddForeignKey
ALTER TABLE "activations" ADD CONSTRAINT "activations_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activation_logs" ADD CONSTRAINT "activation_logs_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
