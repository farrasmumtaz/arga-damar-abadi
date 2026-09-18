import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AccountTokenPurpose } from '../../generated/prisma/enums';
import { AccountRecoveryService } from './account-recovery.service';
import {
  AccountTokenDto,
  ChangePasswordDto,
  RecoveryEmailDto,
  ResetPasswordDto,
} from './dto/account-recovery.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './interfaces/jwt-payload.interface';

@Controller('auth')
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class AccountRecoveryController {
  constructor(private readonly recovery: AccountRecoveryService) {}

  @Post('forgot-password')
  @HttpCode(200)
  async forgot(@Body() dto: RecoveryEmailDto) {
    await this.recovery.request(dto.email, AccountTokenPurpose.RESET_PASSWORD);
    return {
      message: 'Jika akun memenuhi syarat, tautan akan dikirim ke email Anda.',
    };
  }

  @Post('verification/request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async requestVerification(@CurrentUser() user: AuthenticatedUser) {
    await this.recovery.request(user.email, AccountTokenPurpose.VERIFY_EMAIL);
    return {
      message:
        'Jika email belum terverifikasi, tautan akan dikirim ke email Anda.',
    };
  }

  @Post('verify-email')
  @HttpCode(200)
  async verify(@Body() dto: AccountTokenDto) {
    await this.recovery.consume(dto.token, AccountTokenPurpose.VERIFY_EMAIL);
    return { message: 'Email berhasil diverifikasi.' };
  }

  @Post('reset-password')
  @HttpCode(200)
  async reset(@Body() dto: ResetPasswordDto) {
    await this.recovery.consume(
      dto.token,
      AccountTokenPurpose.RESET_PASSWORD,
      dto.password,
    );
    return { message: 'Password berhasil diperbarui. Silakan login kembali.' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async change(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.recovery.change(user.id, dto.currentPassword, dto.password);
    return {
      message: 'Password berhasil diperbarui. Semua session telah dicabut.',
    };
  }
}
