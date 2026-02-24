import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// ── Register ──
export class RegisterCustomerDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Adresse email invalide' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'PlayerOne' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Nom d\'utilisateur: 3 caractères minimum' })
  @MaxLength(50, { message: 'Nom d\'utilisateur: 50 caractères maximum' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Nom d\'utilisateur: lettres, chiffres, _ et - uniquement' })
  username: string;

  @ApiProperty({ example: 'SecureP@ss123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Mot de passe: 8 caractères minimum' })
  @MaxLength(128, { message: 'Mot de passe: 128 caractères maximum' })
  password: string;
}

// ── Login ──
export class LoginCustomerDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  login: string; // email or username

  @ApiProperty({ example: 'SecureP@ss123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

// ── Update Profile ──
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  discordId?: string;
}

// ── Change Password ──
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

// ── Forgot Password ──
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Adresse email invalide' })
  @IsNotEmpty()
  email: string;
}

// ── Reset Password ──
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Mot de passe: 8 caractères minimum' })
  @MaxLength(128)
  newPassword: string;
}

// ── Response Types ──
export class CustomerAuthResponse {
  success: boolean;
  token: string;
  customer: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}
