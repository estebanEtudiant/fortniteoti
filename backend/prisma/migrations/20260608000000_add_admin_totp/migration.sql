-- Add TOTP (2FA) fields to admins
ALTER TABLE "admins" ADD COLUMN "totp_secret" VARCHAR(255);
ALTER TABLE "admins" ADD COLUMN "totp_enabled" BOOLEAN NOT NULL DEFAULT false;
