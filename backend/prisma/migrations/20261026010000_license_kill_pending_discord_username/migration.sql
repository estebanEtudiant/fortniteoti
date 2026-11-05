-- AlterTable
ALTER TABLE "licenses"
  ADD COLUMN "discord_username" VARCHAR(100),
  ADD COLUMN "kill_pending" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "killed_at" TIMESTAMP(3);

CREATE INDEX "licenses_kill_pending_idx" ON "licenses"("kill_pending");
