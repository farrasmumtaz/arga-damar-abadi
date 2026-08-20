import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findProfile(user.id);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('addresses')
  findAddresses(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findAddresses(user.id);
  }

  @Post('addresses')
  createAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(user.id, dto);
  }

  @Patch('addresses/:addressId')
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addressId', new ParseUUIDPipe()) addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, addressId, dto);
  }

  @Patch('addresses/:addressId/default')
  setDefaultAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addressId', new ParseUUIDPipe()) addressId: string,
  ) {
    return this.usersService.setDefaultAddress(user.id, addressId);
  }

  @Delete('addresses/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addressId', new ParseUUIDPipe()) addressId: string,
  ): Promise<void> {
    return this.usersService.removeAddress(user.id, addressId);
  }
}
