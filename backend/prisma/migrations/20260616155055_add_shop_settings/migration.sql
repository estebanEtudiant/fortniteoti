CREATE TABLE "shop_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "hero_image" VARCHAR(500) NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shop_settings_pkey" PRIMARY KEY ("id")
);
INSERT INTO "shop_settings" ("id", "hero_image", "updated_at") VALUES (1, '', NOW()) ON CONFLICT ("id") DO NOTHING;
