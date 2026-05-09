import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { StringValue } from 'ms';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Organisation } from './organisations/entities/organisation.entity';
import { OrganisationMember } from './organisations/entities/organisation-member.entity';

import {
  LoginDto,
  SelectOrgDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
  CreateOrganisationDto,
  UpdateOrganisationDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,

    @InjectRepository(Organisation)
    private readonly orgRepo: Repository<Organisation>,

    @InjectRepository(OrganisationMember)
    private readonly memberRepo: Repository<OrganisationMember>,

    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // STEP 1: Email + Password verify → return org list or token
  // ──────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    // Load user with password
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid email or password');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid email or password');

    // Fetch all active organisations this user belongs to
    const memberships = await this.memberRepo.find({
      where: { user: { id: user.id }, isActive: true },
      relations: ['organisation', 'role'],
    });

    const activeOrgs = memberships.filter((m) => m.organisation.isActive);

    if (activeOrgs.length === 0) {
      throw new ForbiddenException('You are not a member of any active organisation');
    }

    // Single org → direct login, no selection needed
    if (activeOrgs.length === 1) {
      const membership = activeOrgs[0];
      const tokens = await this.generateTokens(user, membership);
      return {
        requiresOrgSelection: false,
        user: this.sanitizeUser(user),
        organisation: this.sanitizeOrg(membership.organisation),
        role: membership.role.name,
        ...tokens,
      };
    }

    // Multiple orgs → issue temp token, return org list for selection
    const tempToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'org_selection' },
      { expiresIn: '5m' as StringValue, secret: this.config.get<string>('JWT_SECRET') },
    );

    return {
      requiresOrgSelection: true,
      tempToken,
      organisations: activeOrgs.map((m) => ({
        id: m.organisation.id,
        name: m.organisation.name,
        slug: m.organisation.slug,
        logo: m.organisation.logo,
        role: m.role.name,
      })),
    };
  }

  // ──────────────────────────────────────────────────────────
  // STEP 2: User selects organisation → issue full tokens
  // ──────────────────────────────────────────────────────────
  async selectOrganisation(dto: SelectOrgDto) {
    // Verify temp token
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.tempToken, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired selection token');
    }

    if (payload.type !== 'org_selection') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Verify user is actually member of selected org
    const membership = await this.memberRepo.findOne({
      where: {
        user: { id: user.id },
        organisation: { id: dto.organisationId },
        isActive: true,
      },
      relations: ['organisation', 'role'],
    });

    if (!membership || !membership.organisation.isActive) {
      throw new ForbiddenException('You are not a member of this organisation');
    }

    const tokens = await this.generateTokens(user, membership);

    return {
      requiresOrgSelection: false,
      user: this.sanitizeUser(user),
      organisation: this.sanitizeOrg(membership.organisation),
      role: membership.role.name,
      ...tokens,
    };
  }

  // ──────────────────────────────────────────────────────────
  // Register new user into an organisation
  // ──────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const org = await this.orgRepo.findOne({
      where: { id: dto.organisationId, isActive: true },
    });
    if (!org) throw new NotFoundException('Organisation not found');

    // Check email globally
    let user = await this.userRepo.findOne({ where: { email: dto.email } });

    if (user) {
      // User exists — check if already in this org
      const exists = await this.memberRepo.findOne({
        where: { user: { id: user.id }, organisation: { id: org.id } },
      });
      if (exists) throw new ConflictException('User already in this organisation');
    } else {
      // Create new user
      const hashed = await bcrypt.hash(dto.password, 10);
      user = this.userRepo.create({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password: hashed,
      });
      await this.userRepo.save(user);
    }

    // Add to organisation as rider by default
    const role = await this.roleRepo.findOne({ where: { name: 'rider' } });
    if (!role) throw new NotFoundException('Default role not found');

    const member = this.memberRepo.create({ user, organisation: org, role });
    await this.memberRepo.save(member);

    return { message: 'Registration successful' };
  }

  // ──────────────────────────────────────────────────────────
  // Refresh Token
  // ──────────────────────────────────────────────────────────
  async refreshToken(dto: RefreshTokenDto) {
    const stored = await this.refreshTokenRepo.findOne({
      where: { token: dto.refreshToken, isRevoked: false },
      relations: ['user', 'organisation'],
    });

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (new Date() > stored.expiresAt) {
      await this.refreshTokenRepo.update(stored.id, { isRevoked: true });
      throw new UnauthorizedException('Refresh token expired, please login again');
    }

    // Find membership to get role
    const membership = await this.memberRepo.findOne({
      where: {
        user: { id: stored.user.id },
        organisation: { id: stored.organisation.id },
        isActive: true,
      },
      relations: ['organisation', 'role'],
    });

    if (!membership) throw new ForbiddenException('Membership not found');

    // Revoke old, issue new
    await this.refreshTokenRepo.update(stored.id, { isRevoked: true });
    const tokens = await this.generateTokens(stored.user, membership);
    return tokens;
  }

  // ──────────────────────────────────────────────────────────
  // Logout
  // ──────────────────────────────────────────────────────────
  async logout(userId: number, orgId: number) {
    await this.refreshTokenRepo
      .createQueryBuilder()
      .update()
      .set({ isRevoked: true })
      .where(
        'user_id = :userId AND organisation_id = :orgId AND is_revoked = false',
        { userId, orgId },
      )
      .execute();

    return { message: 'Logged out successfully' };
  }

  // ──────────────────────────────────────────────────────────
  // Get Profile
  // ──────────────────────────────────────────────────────────
  async getProfile(userId: number, orgId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const membership = await this.memberRepo.findOne({
      where: { user: { id: userId }, organisation: { id: orgId } },
      relations: ['organisation', 'role'],
    });

    return {
      ...this.sanitizeUser(user),
      organisation: membership ? this.sanitizeOrg(membership.organisation) : null,
      role: membership?.role?.name ?? null,
    };
  }

  // ──────────────────────────────────────────────────────────
  // Change Password
  // ──────────────────────────────────────────────────────────
  async changePassword(userId: number, orgId: number, dto: ChangePasswordDto) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(userId, { password: hashed });

    // Revoke all refresh tokens for this user + org
    await this.refreshTokenRepo
      .createQueryBuilder()
      .update()
      .set({ isRevoked: true })
      .where('user_id = :userId AND organisation_id = :orgId', { userId, orgId })
      .execute();

    return { message: 'Password changed successfully' };
  }

  // ──────────────────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────────────────
  private async generateTokens(user: User, membership: OrganisationMember) {
    const payload = {
      sub: user.id,
      email: user.email,
      orgId: membership.organisation.id,
      role: membership.role.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') || '15m') as StringValue,
    });

    const refreshTokenValue = this.jwtService.sign(payload, {
      expiresIn: '7d' as StringValue,
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const rt = this.refreshTokenRepo.create({
      user,
      organisation: membership.organisation,
      token: refreshTokenValue,
      expiresAt,
    });
    await this.refreshTokenRepo.save(rt);

    return { accessToken, refreshToken: refreshTokenValue };
  }

  private sanitizeUser(user: User) {
    const { password, ...rest } = user as any;
    return rest;
  }

  private sanitizeOrg(org: Organisation) {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
    };
  }
}