import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const VALID_PRODUCTS = ['fortniteclient', 'marvelrivalsclient', 'ngclient', 'rustclient', 'spoofer'] as const;
export type CheatProductId = (typeof VALID_PRODUCTS)[number];

// productId used in software-admin storage ↔ the License.product enum-string
export const CHEAT_PRODUCT_TO_LICENSE: Record<CheatProductId, string> = {
  fortniteclient: 'FORTNITE_CLIENT',
  marvelrivalsclient: 'MARVEL_RIVALS_CLIENT',
  ngclient: 'NG_RECUBE_CLIENT',
  rustclient: 'RUST_CLIENT',
  spoofer: '404SPOOFER_V2',
};

export const VALID_KINDS = ['driver', 'reader', 'byovd', 'loader', 'manager'] as const;
export type BinaryKind = (typeof VALID_KINDS)[number];

// Kinds required to publish a bundle. Default = all four. Spoofer runs on driver + byovd only.
export const REQUIRED_PUBLISH_KINDS: Record<string, BinaryKind[]> = {
  spoofer: ['driver', 'byovd'],
};
export function requiredKindsFor(productId: string): BinaryKind[] {
  return REQUIRED_PUBLISH_KINDS[productId] ?? ['driver', 'reader', 'byovd', 'loader'];
}

export class PublishDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() version?: string;
}
