import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../auth/entities/user.entity';
import { Organisation } from '../auth/organisations/entities/organisation.entity';
import { OrganisationMember } from '../auth/organisations/entities/organisation-member.entity';
import { Role } from '../auth/entities/role.entity';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Organisation)
    private readonly orgRepo: Repository<Organisation>,

    @InjectRepository(OrganisationMember)
    private readonly memberRepo: Repository<OrganisationMember>,

    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  /**
   * Create a new user in the system and add them to an organisation
   * @param dto - Contains user info and organisation ID (required)
   * @returns User and membership details
   */
  async createUser(dto: CreateUserDto) {
    // Validate organisation exists and is active
    const org = await this.orgRepo.findOne({
      where: { id: dto.organisationId, isActive: true },
    });

    if (!org) {
      throw new NotFoundException(
        `Organisation with ID ${dto.organisationId} not found or is inactive`,
      );
    }

    // Check if email already exists
    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      // Check if user already in this organisation
      const existingMember = await this.memberRepo.findOne({
        where: {
          user: { id: existingUser.id },
          organisation: { id: org.id },
        },
      });

      if (existingMember) {
        throw new ConflictException(
          'User with this email already exists in this organisation',
        );
      }

      // User exists globally but not in this org - add them to this organisation
      const role = await this.getRole(dto.role || 'rider');
      const member = this.memberRepo.create({
        user: existingUser,
        organisation: org,
        role,
      });

      await this.memberRepo.save(member);

      return {
        message: 'User added to organisation successfully',
        user: this.sanitizeUser(existingUser),
        organisation: this.sanitizeOrg(org),
        role: role.name,
      };
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const newUser = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      password: hashedPassword,
    });

    await this.userRepo.save(newUser);

    // Add user to organisation with specified role (default: rider)
    const role = await this.getRole(dto.role || 'rider');
    const member = this.memberRepo.create({
      user: newUser,
      organisation: org,
      role,
    });

    await this.memberRepo.save(member);

    return {
      message: 'User created successfully',
      user: this.sanitizeUser(newUser),
      organisation: this.sanitizeOrg(org),
      role: role.name,
    };
  }

  async getAllUsers(organisationId: number) {
    const memberships = await this.memberRepo.find({
      where: { organisation: { id: organisationId }, isActive: true },
      relations: ['user', 'role'],
    });

    return {
      total: memberships.length,
      users: memberships.map((membership) => ({
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        phone: membership.user.phone,
        isActive: membership.user.isActive,
        role: membership.role?.name,
        joinedAt: membership.joinedAt,
      })),
    };
  }

  /**
   * Update user by ID
   * @param userId - User ID to update
   * @param organisationId - Organisation ID (to verify membership)
   * @param dto - Update data
   * @returns Updated user and membership details
   */
  async updateUser(userId: number, organisationId: number, dto: UpdateUserDto) {
    // Verify user exists
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verify user is member of organisation
    const membership = await this.memberRepo.findOne({
      where: {
        user: { id: userId },
        organisation: { id: organisationId },
      },
      relations: ['organisation', 'role'],
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this organisation');
    }

    // Check if new email conflicts with another user (if email is being updated)
    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (emailExists) {
        throw new ConflictException('Email already in use by another user');
      }
    }

    // Update user fields
    if (dto.name) user.name = dto.name;
    if (dto.email) user.email = dto.email;
    if (dto.phone) user.phone = dto.phone;

    await this.userRepo.save(user);

    // Update role if provided
    if (dto.role) {
      const role = await this.getRole(dto.role);
      membership.role = role;
      await this.memberRepo.save(membership);
    }

    return {
      message: 'User updated successfully',
      user: this.sanitizeUser(user),
      organisation: this.sanitizeOrg(membership.organisation),
      role: membership.role.name,
    };
  }

  /**
   * Delete user (soft delete - mark as inactive)
   * @param userId - User ID to delete
   * @param organisationId - Organisation ID (to verify membership)
   * @returns Success message
   */
  async deleteUser(userId: number, organisationId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const membership = await this.memberRepo.findOne({
      where: {
        user: { id: userId },
        organisation: { id: organisationId },
      },
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this organisation');
    }

    membership.isActive = false;
    await this.memberRepo.save(membership);

    const remainingActiveMemberships = await this.memberRepo.count({
      where: { user: { id: userId }, isActive: true },
    });

    if (remainingActiveMemberships === 0) {
      user.isActive = false;
      await this.userRepo.save(user);
    }

    return {
      message: 'User removed from organisation successfully',
    };
  }

  /**
   * Get a role by name, throw error if not found
   */
  private async getRole(roleName: string) {
    const role = await this.roleRepo.findOne({ where: { name: roleName } });

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    return role;
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: User) {
    const { password, ...rest } = user;
    return rest;
  }

  /**
   * Remove sensitive data from organisation object
   */
  private sanitizeOrg(org: Organisation) {
    const { ...rest } = org;
    return rest;
  }
}
