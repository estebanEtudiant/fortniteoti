import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const VALID_PRODUCTS = ['fortniteclient'] as const;
export type CheatProductId = (typeof VALID_PRODUCTS)[number];

export const VALID_KINDS = ['driver', 'reader', 'byovd', 'loader'] as const;
export type BinaryKind = (typeof VALID_KINDS)[number];

export class PublishDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() version?: string;
}
