-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('NEW', 'UPDATED', 'UPDATING');

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "chip" VARCHAR(60) NOT NULL,
    "logo" VARCHAR(60) NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'UPDATED',
    "since_fr" VARCHAR(60) NOT NULL DEFAULT '',
    "since_en" VARCHAR(60) NOT NULL DEFAULT '',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "members" INTEGER NOT NULL DEFAULT 0,
    "tips_count" INTEGER NOT NULL DEFAULT 0,
    "hue" INTEGER NOT NULL DEFAULT 26,
    "tagline_fr" TEXT NOT NULL DEFAULT '',
    "tagline_en" TEXT NOT NULL DEFAULT '',
    "includes_fr" TEXT[],
    "includes_en" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_plans" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "name_fr" VARCHAR(120) NOT NULL,
    "name_en" VARCHAR(120) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "per_fr" VARCHAR(60) NOT NULL DEFAULT '',
    "per_en" VARCHAR(60) NOT NULL DEFAULT '',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "perks_fr" TEXT[],
    "perks_en" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "shop_plans_slug_key" ON "shop_plans"("slug");

