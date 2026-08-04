import {
  IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsNumber,
  IsArray, IsIn, MaxLength, Min, ValidateNested, ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Produits (kits de rénovation) ──
export class CreatePokemonProductDto {
  @IsString() @IsNotEmpty() @MaxLength(60)
  slug: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  nameFr: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  nameEn: string;

  @IsString() @IsOptional()
  descriptionFr?: string;

  @IsString() @IsOptional()
  descriptionEn?: string;

  // prix en centimes
  @IsInt() @Min(0)
  price: number;

  @IsInt() @IsOptional() @Min(0)
  compareAtPrice?: number;

  @IsArray() @IsOptional() @IsString({ each: true }) @ArrayMaxSize(20)
  images?: string[];

  @IsArray() @IsOptional() @IsString({ each: true }) @ArrayMaxSize(30)
  includesFr?: string[];

  @IsArray() @IsOptional() @IsString({ each: true }) @ArrayMaxSize(30)
  includesEn?: string[];

  @IsInt() @IsOptional() @Min(0)
  stock?: number;

  @IsString() @IsOptional() @MaxLength(60)
  sku?: string;

  @IsBoolean() @IsOptional()
  featured?: boolean;

  @IsInt() @IsOptional()
  order?: number;

  @IsBoolean() @IsOptional()
  visible?: boolean;
}

export class UpdatePokemonProductDto extends CreatePokemonProductDto {
  @IsString() @IsOptional() @MaxLength(60)
  declare slug: string;

  @IsString() @IsOptional() @MaxLength(120)
  declare nameFr: string;

  @IsString() @IsOptional() @MaxLength(120)
  declare nameEn: string;

  @IsInt() @IsOptional() @Min(0)
  declare price: number;
}

// ── Réglages boutique (livraison, hero) ──
export class UpdatePokemonSettingsDto {
  @IsString() @IsOptional() @MaxLength(500)
  heroImage?: string;

  @IsInt() @IsOptional() @Min(0)
  freeShippingThresholdCents?: number;

  @IsInt() @IsOptional() @Min(0)
  flatShippingCents?: number;

  @IsArray() @IsOptional() @IsString({ each: true }) @ArrayMaxSize(50)
  allowedCountries?: string[];
}

// ── Panier / checkout ──
export class PokemonCartItemDto {
  @IsString() @IsNotEmpty()
  slug: string;

  @IsInt() @Min(1)
  qty: number;
}

export class CreatePokemonCheckoutDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => PokemonCartItemDto) @ArrayMaxSize(20)
  items: PokemonCartItemDto[];

  @IsString() @IsNotEmpty() @MaxLength(200)
  shippingName: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  shippingLine1: string;

  @IsString() @IsOptional() @MaxLength(255)
  shippingLine2?: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  shippingCity: string;

  @IsString() @IsNotEmpty() @MaxLength(20)
  shippingPostalCode: string;

  @IsString() @IsNotEmpty() @MaxLength(2)
  shippingCountry: string;

  @IsString() @IsOptional() @MaxLength(30)
  shippingPhone?: string;
}

// ── Admin: gestion des commandes ──
const ORDER_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

export class UpdatePokemonOrderDto {
  @IsIn(ORDER_STATUSES) @IsOptional()
  status?: string;

  @IsString() @IsOptional() @MaxLength(60)
  carrier?: string;

  @IsString() @IsOptional() @MaxLength(120)
  trackingNumber?: string;

  @IsString() @IsOptional() @MaxLength(500)
  trackingUrl?: string;
}
