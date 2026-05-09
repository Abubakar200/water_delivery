import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

// ── Step 1: Email + Password ──────────────────────────────
export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

// ── Step 2: Select Organisation ───────────────────────────
export class SelectOrgDto {
  @IsNotEmpty()
  @IsString()
  tempToken: string;        // short-lived token from step 1

  @IsNumber()
  organisationId: number;   // user selected org id
}

// ── Register ──────────────────────────────────────────────
export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Password must contain at least one uppercase letter and one number',
  })
  password: string;

  @IsNumber()
  organisationId: number;   // which org to register in
}

// ── Refresh Token ─────────────────────────────────────────
export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}

// ── Change Password ───────────────────────────────────────
export class ChangePasswordDto {
  @IsNotEmpty()
  currentPassword: string;

  @IsNotEmpty()
  @MinLength(8)
  @Matches(/(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Password must contain at least one uppercase letter and one number',
  })
  newPassword: string;
}