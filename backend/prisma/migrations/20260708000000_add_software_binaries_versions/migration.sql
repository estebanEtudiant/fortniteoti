-- CreateTable
CREATE TABLE "software_binaries" (
    "id" TEXT NOT NULL,
    "product_id" VARCHAR(50) NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "size" INTEGER NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" VARCHAR(100),

    CONSTRAINT "software_binaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_versions" (
    "id" TEXT NOT NULL,
    "product_id" VARCHAR(50) NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "bundle_path" VARCHAR(500) NOT NULL,
    "bundle_sha256" VARCHAR(64) NOT NULL,
    "bundle_size" INTEGER NOT NULL,
    "driver_id" TEXT NOT NULL,
    "reader_id" TEXT NOT NULL,
    "byovd_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100),

    CONSTRAINT "software_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "software_binaries_product_id_kind_uploaded_at_idx" ON "software_binaries"("product_id", "kind", "uploaded_at");

-- CreateIndex
CREATE INDEX "software_versions_product_id_created_at_idx" ON "software_versions"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "software_versions_product_id_is_active_idx" ON "software_versions"("product_id", "is_active");
