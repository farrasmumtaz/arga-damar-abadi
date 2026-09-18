import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { StorageService } from './storage.service';
import { ClamavService } from './clamav.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly scanner: ClamavService,
    private readonly config: ConfigService,
  ) {}
  async upload(
    ownerId: string,
    purpose: 'PRODUCT_IMAGE' | 'BOQ',
    file?: Express.Multer.File,
  ) {
    if (!file?.buffer.length || file.size > 5 * 1024 * 1024)
      throw new BadRequestException('File wajib diisi, maksimum 5 MB');
    let bytes = file.buffer;
    let contentType = 'application/pdf';
    if (purpose === 'PRODUCT_IMAGE') {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
        throw new BadRequestException('Gunakan gambar JPEG, PNG, atau WebP');
      try {
        const input = sharp(bytes, {
          limitInputPixels: 20_000_000,
          animated: false,
        });
        const metadata = await input.metadata();
        if (
          !metadata.format ||
          !['jpeg', 'png', 'webp'].includes(metadata.format) ||
          (metadata.pages ?? 1) > 1
        )
          throw new Error('Unsupported image');
        bytes = await input
          .rotate()
          .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        contentType = 'image/webp';
      } catch {
        throw new BadRequestException('Gambar tidak valid atau terlalu besar');
      }
    } else {
      if (
        file.mimetype !== 'application/pdf' ||
        bytes.subarray(0, 5).toString() !== '%PDF-'
      )
        throw new BadRequestException('BOQ harus berupa PDF');
      // Fail closed: private documents are never released before a clean scan.
      await this.scanner.scan(bytes);
    }
    const bucket = this.config.get<string>(
      purpose === 'BOQ' ? 'STORAGE_BOQ_BUCKET' : 'STORAGE_IMAGES_BUCKET',
      purpose === 'BOQ' ? 'boq-private' : 'product-images',
    );
    const objectKey = `${ownerId}/${randomUUID()}.${purpose === 'BOQ' ? 'pdf' : 'webp'}`;
    await this.storage.upload(bucket, objectKey, bytes, contentType);
    try {
      const asset = await this.prisma.mediaAsset.create({
        data: {
          ownerId,
          purpose,
          bucket,
          objectKey,
          contentType,
          sizeBytes: bytes.length,
        },
      });
      return {
        id: asset.id,
        url:
          purpose === 'PRODUCT_IMAGE'
            ? this.storage.publicUrl(bucket, objectKey)
            : null,
      };
    } catch (error) {
      await this.storage.remove(bucket, objectKey);
      throw error;
    }
  }
  async download(id: string, userId: string, staff: boolean) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id, ...(staff ? {} : { ownerId: userId }) },
    });
    if (!asset) throw new NotFoundException('File not found');
    return {
      url: await this.storage.signedUrl(asset.bucket, asset.objectKey),
      expiresIn: 300,
    };
  }
  async remove(id: string, userId: string, staff: boolean) {
    return this.prisma.$transaction(
      async (tx) => {
        // Quote attachment creation takes the same lock before checking ownership.
        await tx.$queryRaw`SELECT "id" FROM "media_assets" WHERE "id" = ${id}::uuid FOR UPDATE`;
        const asset = await tx.mediaAsset.findFirst({
          where: { id, ...(staff ? {} : { ownerId: userId }) },
          include: { _count: { select: { quotations: true } } },
        });
        if (!asset) throw new NotFoundException('File not found');
        // ProductImage currently stores a URL, not a protected media foreign key.
        // Do not race a product update and irreversibly remove a published image.
        if (asset.purpose === 'PRODUCT_IMAGE')
          throw new ConflictException(
            'Penghapusan gambar belum tersedia; lepaskan gambar dari produk tanpa menghapus berkas storage.',
          );
        if (asset._count.quotations)
          throw new ConflictException('File masih digunakan');
        await this.storage.remove(asset.bucket, asset.objectKey);
        await tx.mediaAsset.delete({ where: { id } });
        return { message: 'File dihapus' };
      },
      { timeout: 25_000 },
    );
  }
}
