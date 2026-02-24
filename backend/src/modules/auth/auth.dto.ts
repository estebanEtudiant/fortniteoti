import { IsString, IsNotEmpty, Length, Matches, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// ── Activation Request ──
export class ActivateDto {
  @ApiProperty({ example: 'A3B5C-D7E9F-G2H4J-K6L8M-N1P3Q' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}$/, {
    message: 'Invalid license key format (expected XXXXX-XXXXX-XXXXX-XXXXX-XXXXX)',
  })
  key: string;

  @ApiProperty({ example: 'a1b2c3d4e5f6...' , description: 'SHA256 hash of machine identifiers' })
  @IsString()
  @IsNotEmpty()
  @Length(64, 64, { message: 'HWID must be a 64-char hex string (SHA256)' })
  @Matches(/^[a-f0-9]{64}$/, { message: 'HWID must be a valid SHA256 hex string' })
  hwid: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  machineInfo?: {
    os?: string;
    cpu?: string;
    hostname?: string;
    appVersion?: string;
  };

  @ApiProperty({ description: 'Anti-replay nonce (unique per request)' })
  @IsString()
  @IsNotEmpty()
  @Length(16, 128)
  nonce: string;

  @ApiProperty({ description: 'Unix timestamp of request' })
  @IsNotEmpty()
  timestamp: number;
}

// ── Heartbeat Request ──
export class HeartbeatDto {
  @IsString()
  @IsNotEmpty()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/)
  hwid: string;
}

// ── Refresh Token Request ──
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

// ── Response Types ──
export class ActivationResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;       // seconds
  licenseExpiresAt: string | null;
  plan: string;
  offlineToken: string;    // Signed token for offline validation
}

export class HeartbeatResponse {
  success: boolean;
  status: 'active' | 'expired' | 'banned';
  serverTime: string;
}
