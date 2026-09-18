import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MidtransNotificationDto } from './dto/midtrans-notification.dto';

@Injectable()
export class MidtransWebhookPipe implements PipeTransform<
  unknown,
  Promise<MidtransNotificationDto>
> {
  async transform(value: unknown): Promise<MidtransNotificationDto> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new BadRequestException('Invalid notification');
    const dto = plainToInstance(MidtransNotificationDto, value);
    if (
      (await validate(dto, { whitelist: true, forbidUnknownValues: true }))
        .length
    )
      throw new BadRequestException('Invalid notification');
    return dto;
  }
}
