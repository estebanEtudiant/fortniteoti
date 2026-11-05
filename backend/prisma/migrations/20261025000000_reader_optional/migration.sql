-- Make reader_id nullable so products like 404SPOOFER_V2 (driver + byovd only) can publish
ALTER TABLE "software_versions" ALTER COLUMN "reader_id" DROP NOT NULL;
