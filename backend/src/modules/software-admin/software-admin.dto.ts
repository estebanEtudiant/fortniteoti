import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const VALID_PRODUCTS = ['fortniteclient', 'marvelrivalsclient', 'ngclient', 'rustclient'] as const;
export type CheatProductId = (typeof VALID_PRODUCTS)[number];

// productId used in software-admin storage ↔ the License.product enum-string
export const CHEAT_PRODUCT_TO_LICENSE: Record<CheatProductId, string> = {
  fortniteclient: 'FORTNITE_CLIENT',
  marvelrivalsclient: 'MARVEL_RIVALS_CLIENT',
  ngclient: 'NG_RECUBE_CLIENT',
  rustclient: 'RUST_CLIENT',
};

export const VALID_KINDS = ['driver', 'reader', 'byovd', 'loader'] as const;
export type BinaryKind = (typeof VALID_KINDS)[number];

export class PublishDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() version?: string;
}
