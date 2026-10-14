CREATE TABLE "spoofer_plans" (
  "plan" "LicensePlan" PRIMARY KEY,
  "price" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE "spoofer_keys" (
  "id" UUID PRIMARY KEY,
  "key" VARCHAR(29) NOT NULL UNIQUE,
  "plan" "LicensePlan" NOT NULL,
  "order_id" UUID REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "license_id" UUID UNIQUE REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sold_at" TIMESTAMP(3)
);
CREATE INDEX "spoofer_keys_plan_order_id_license_id_idx" ON "spoofer_keys"("plan", "order_id", "license_id");
INSERT INTO "spoofer_plans" ("plan", "price", "enabled") VALUES
  ('DAYS_1', 0, false), ('DAYS_7', 899, true), ('DAYS_14', 1699, true), ('DAYS_30', 2999, true);
