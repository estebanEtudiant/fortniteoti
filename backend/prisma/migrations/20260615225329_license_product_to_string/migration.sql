-- Convert licenses.product from enum "Product" to free-form TEXT, preserving existing values.
ALTER TABLE "licenses" ALTER COLUMN "product" DROP DEFAULT;
ALTER TABLE "licenses" ALTER COLUMN "product" TYPE TEXT USING "product"::text;
ALTER TABLE "licenses" ALTER COLUMN "product" SET DEFAULT 'FTN_OPTIMIZER';

-- The enum type is no longer referenced.
DROP TYPE "Product";
