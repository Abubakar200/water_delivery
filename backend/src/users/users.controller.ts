import { Controller, Post, Get, Patch, Delete, Body, HttpCode, HttpStatus, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users
   * Admin-only access to list organisation users
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllUsers(@Req() req: Request) {
    const user = req.user as any;
    return this.usersService.getAllUsers(user.orgId);
  }

  /**
   * POST /users
   * Create a new user in the system and add them to an organisation
   * organisationId is required
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  /**
   * PATCH /users/:id
   * Update user information (requires authentication)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.usersService.updateUser(userId, user.orgId, dto);
  }

  /**
   * DELETE /users/:id
   * Delete/remove user from organisation (requires authentication)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('id', ParseIntPipe) userId: number,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.usersService.deleteUser(userId, user.orgId);
  }
}
