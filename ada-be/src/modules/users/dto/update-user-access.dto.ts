import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums';

export class UpdateUserAccessDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
