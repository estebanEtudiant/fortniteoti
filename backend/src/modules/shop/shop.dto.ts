import {
  IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsNumber,
  IsArray, IsEnum, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GameStatus } from '@prisma/client';

// ── Section (catégorie éditable de la page jeu) ──
export class GameSectionDto {
  @IsString() @IsOptional() @MaxLength(120)
  titleFr?: string;

  @IsString() @IsOptional() @MaxLength(120)
  titleEn?: string;

  @IsArray() @IsOptional() @IsString({ each: true })
  itemsFr?: string[];

  @IsArray() @IsOptional() @IsString({ each: true })
  itemsEn?: string[];
}

// ── Game ──
export class CreateGameDto {
  @IsString() @IsNotEmpty() @MaxLength(60)
  slug: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  name: string;

  @IsString() @IsNotEmpty() @MaxLength(60)
  chip: string;

  @IsString() @IsOptional() @MaxLength(60)
  logo?: string;

  @IsString() @IsOptional() @MaxLength(500)
  image?: string;

  // galerie d'images de la page produit
  @IsArray() @IsOptional() @IsString({ each: true })
  images?: string[];

  @IsEnum(GameStatus) @IsOptional()
  status?: GameStatus;

  @IsString() @IsOptional() @MaxLength(60)
  sinceFr?: string;

  @IsString() @IsOptional() @MaxLength(60)
  sinceEn?: string;

  @IsNumber() @IsOptional() @Min(0)
  rating?: number;

  @IsInt() @IsOptional() @Min(0)
  members?: number;

  @IsInt() @IsOptional() @Min(0)
  tipsCount?: number;

  @IsInt() @IsOptional()
  hue?: number;

  @IsString() @IsOptional()
  taglineFr?: string;

  @IsString() @IsOptional()
  taglineEn?: string;

  @IsArray() @IsOptional() @IsString({ each: true })
  includesFr?: string[];

  @IsArray() @IsOptional() @IsString({ each: true })
  includesEn?: string[];

  // sections éditables : [{ titleFr, titleEn, itemsFr[], itemsEn[] }]
  @IsArray() @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => GameSectionDto)
  sections?: GameSectionDto[];

  @IsInt() @IsOptional()
  order?: number;

  @IsBoolean() @IsOptional()
  visible?: boolean;
}

export class UpdateGameDto extends CreateGameDto {
  @IsString() @IsOptional() @MaxLength(60)
  declare slug: string;

  @IsString() @IsOptional() @MaxLength(120)
  declare name: string;

  @IsString() @IsOptional() @MaxLength(60)
  declare chip: string;
}

// ── Plan ──
export class CreatePlanDto {
  @IsString() @IsNotEmpty() @MaxLength(60)
  slug: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  nameFr: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  nameEn: string;

  @IsNumber() @IsOptional() @Min(0)
  price?: number;

  @IsString() @IsOptional() @MaxLength(60)
  perFr?: string;

  @IsString() @IsOptional() @MaxLength(60)
  perEn?: string;

  @IsBoolean() @IsOptional()
  featured?: boolean;

  @IsArray() @IsOptional() @IsString({ each: true })
  perksFr?: string[];

  @IsArray() @IsOptional() @IsString({ each: true })
  perksEn?: string[];

  @IsInt() @IsOptional()
  order?: number;

  @IsBoolean() @IsOptional()
  visible?: boolean;
}

export class UpdatePlanDto extends CreatePlanDto {
  @IsString() @IsOptional() @MaxLength(60)
  declare slug: string;

  @IsString() @IsOptional() @MaxLength(120)
  declare nameFr: string;

  @IsString() @IsOptional() @MaxLength(120)
  declare nameEn: string;
}

// ── Settings (boutique) ──
export class UpdateShopSettingsDto {
  @IsString() @IsOptional() @MaxLength(500)
  heroImage?: string;
}
