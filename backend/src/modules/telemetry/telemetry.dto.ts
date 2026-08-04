import { IsString, IsNotEmpty, IsOptional, Length, Matches, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

const HWID_RE = /^[a-f0-9]{64}$/i;
const SAFE_TEXT_RE = /^[a-zA-Z0-9_.\- ]*$/;

export class CrashDumpQueryDto {
  @IsString() @IsNotEmpty() @Length(64, 64)
  @Matches(HWID_RE, { message: 'hwid must be a 64-char hex string (SHA256)' })
  hwid: string;

  @IsOptional() @IsString() @Length(0, 100)
  @Matches(SAFE_TEXT_RE, { message: 'os contains invalid characters' })
  os?: string;

  @IsString() @IsNotEmpty() @Length(1, 255)
  @Matches(/^[a-zA-Z0-9_.\- ]+\.dmp$/i, { message: 'filename must be a .dmp file with a safe name' })
  filename: string;

  @IsString() @IsNotEmpty() @Length(40, 40)
  @Matches(/^[a-f0-9]{40}$/i, { message: 'sha1 must be a 40-char hex string' })
  sha1: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(50 * 1024 * 1024)
  bytes: number;
}

export class TelemetryLogQueryDto {
  @IsString() @IsNotEmpty() @Length(64, 64)
  @Matches(HWID_RE, { message: 'hwid must be a 64-char hex string (SHA256)' })
  hwid: string;

  @IsOptional() @IsString() @Length(0, 100)
  @Matches(SAFE_TEXT_RE, { message: 'os contains invalid characters' })
  os?: string;

  @IsString() @IsNotEmpty() @Length(1, 40)
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'kind must be alphanumeric' })
  kind: string;

  @Type(() => Number) @IsInt() @Min(0) @Max(5 * 1024 * 1024)
  bytes: number;
}
