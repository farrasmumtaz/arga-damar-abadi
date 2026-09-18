import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { StorageService } from './storage.service';
import { ClamavService } from './clamav.service';
@Module({
  controllers: [MediaController],
  providers: [MediaService, StorageService, ClamavService],
})
export class MediaModule {}
