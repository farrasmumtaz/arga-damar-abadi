import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const profileSelect = {
  id: true,
  email: true,
  phone: true,
  fullName: true,
  role: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        },
        select: profileSelect,
      });
    } catch (error: unknown) {
      this.handleUserError(error);
    }
  }

  findAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId } });
      const isDefault = dto.isDefault === true || count === 0;
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }
      return tx.address.create({ data: { userId, ...dto, isDefault } });
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    await this.ensureOwnedAddress(userId, addressId);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }
      return tx.address.update({
        where: { id: addressId },
        data: dto,
      });
    });
  }

  async setDefaultAddress(userId: string, addressId: string) {
    await this.ensureOwnedAddress(userId, addressId);
    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
      return tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  }

  async removeAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.ensureOwnedAddress(userId, addressId);
    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: addressId } });
      if (address.isDefault) {
        const replacement = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (replacement) {
          await tx.address.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
        }
      }
    });
  }

  private async ensureOwnedAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  private handleUserError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        throw new ConflictException('Phone number already used');
      if (error.code === 'P2025') throw new NotFoundException('User not found');
    }
    throw error;
  }
}
