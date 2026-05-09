import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  SelectOrgDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /auth/login ──────────────────────────────────────
  // Step 1: Email + Password
  // Returns: org list (if multiple) OR tokens (if single org)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ── POST /auth/select-organisation ───────────────────────
  // Step 2: Select org from list using tempToken
  // Returns: accessToken + refreshToken
  @Post('select-organisation')
  @HttpCode(HttpStatus.OK)
  selectOrganisation(@Body() dto: SelectOrgDto) {
    return this.authService.selectOrganisation(dto);
  }

  // ── POST /auth/register ───────────────────────────────────
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ── POST /auth/refresh ────────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  // ── POST /auth/logout  🔒 ─────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request) {
    const user = req.user as any;
    return this.authService.logout(user.id, user.orgId);
  }

  // ── GET /auth/me  🔒 ──────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: Request) {
    const user = req.user as any;
    return this.authService.getProfile(user.id, user.orgId);
  }

  // ── PATCH /auth/change-password  🔒 ──────────────────────
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const user = req.user as any;
    return this.authService.changePassword(user.id, user.orgId, dto);
  }
}