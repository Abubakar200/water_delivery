import {
  Injectable,
  ExecutionContext,
  CanActivate,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

// ── JWT Guard ─────────────────────────────────────────────
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// ── Roles Decorator ───────────────────────────────────────
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// ── Roles Guard ───────────────────────────────────────────
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user?.role) throw new ForbiddenException('Access denied');

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Access denied. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}