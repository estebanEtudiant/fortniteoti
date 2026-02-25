import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyLicenseDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  discordId: string;
}
