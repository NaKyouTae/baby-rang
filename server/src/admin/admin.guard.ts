import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['x-admin-token'];
    const expected = process.env.ADMIN_TOKEN;
    if (!expected) throw new UnauthorizedException('ADMIN_TOKEN not configured');
    if (token !== expected) throw new UnauthorizedException('Invalid admin token');
    return true;
  }
}
