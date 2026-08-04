-- CreateEnum
CREATE TYPE "PokemonOrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "pokemon_products" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "name_fr" VARCHAR(120) NOT NULL,
    "name_en" VARCHAR(120) NOT NULL,
    "description_fr" TEXT NOT NULL DEFAULT '',
    "description_en" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "compare_at_price" INTEGER,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "includes_fr" TEXT[],
    "includes_en" TEXT[],
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku" VARCHAR(60) NOT NULL DEFAULT '',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pokemon_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pokemon_orders" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "items" JSONB NOT NULL,
    "amount" INTEGER NOT NULL,
    "shipping_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "status" "PokemonOrderStatus" NOT NULL DEFAULT 'PENDING',
    "shipping_name" VARCHAR(200) NOT NULL DEFAULT '',
    "shipping_line1" VARCHAR(255) NOT NULL DEFAULT '',
    "shipping_line2" VARCHAR(255) NOT NULL DEFAULT '',
    "shipping_city" VARCHAR(120) NOT NULL DEFAULT '',
    "shipping_postal_code" VARCHAR(20) NOT NULL DEFAULT '',
    "shipping_country" VARCHAR(2) NOT NULL DEFAULT '',
    "shipping_phone" VARCHAR(30),
    "carrier" VARCHAR(60),
    "tracking_number" VARCHAR(120),
    "tracking_url" VARCHAR(500),
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "stripe_session_id" VARCHAR(255),
    "stripe_payment_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "pokemon_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pokemon_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "hero_image" VARCHAR(500) NOT NULL DEFAULT '',
    "free_shipping_threshold_cents" INTEGER NOT NULL DEFAULT 0,
    "flat_shipping_cents" INTEGER NOT NULL DEFAULT 0,
    "allowed_countries" TEXT[] DEFAULT ARRAY['FR', 'BE', 'CH', 'LU']::TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pokemon_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pokemon_products_slug_key" ON "pokemon_products"("slug");

-- CreateIndex
CREATE INDEX "pokemon_orders_customer_id_idx" ON "pokemon_orders"("customer_id");

-- CreateIndex
CREATE INDEX "pokemon_orders_status_idx" ON "pokemon_orders"("status");

-- CreateIndex
CREATE INDEX "pokemon_orders_stripe_session_id_idx" ON "pokemon_orders"("stripe_session_id");

-- AddForeignKey
ALTER TABLE "pokemon_orders" ADD CONSTRAINT "pokemon_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seed default settings row
INSERT INTO "pokemon_settings" ("id", "hero_image", "free_shipping_threshold_cents", "flat_shipping_cents", "allowed_countries", "updated_at")
VALUES (1, '', 0, 0, ARRAY['FR','BE','CH','LU']::TEXT[], NOW())
ON CONFLICT ("id") DO NOTHING;
