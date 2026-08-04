-- CreateTable
CREATE TABLE "crash_dumps" (
    "id" TEXT NOT NULL,
    "hwid" VARCHAR(64) NOT NULL,
    "os" VARCHAR(100) NOT NULL DEFAULT '',
    "filename" VARCHAR(255) NOT NULL,
    "sha1" VARCHAR(40) NOT NULL,
    "bytes" INTEGER NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "user_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crash_dumps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_logs" (
    "id" TEXT NOT NULL,
    "hwid" VARCHAR(64) NOT NULL,
    "os" VARCHAR(100) NOT NULL DEFAULT '',
    "kind" VARCHAR(40) NOT NULL,
    "bytes" INTEGER NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "user_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crash_dumps_hwid_sha1_key" ON "crash_dumps"("hwid", "sha1");

-- CreateIndex
CREATE INDEX "crash_dumps_hwid_created_at_idx" ON "crash_dumps"("hwid", "created_at");

-- CreateIndex
CREATE INDEX "telemetry_logs_hwid_created_at_idx" ON "telemetry_logs"("hwid", "created_at");
