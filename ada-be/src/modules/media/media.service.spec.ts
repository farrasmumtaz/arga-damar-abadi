import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ClamavService } from './clamav.service';
import { MediaService } from './media.service';
import { StorageService } from './storage.service';

describe('Media upload and private document ownership', () => {
  function file(
    buffer: Buffer,
    mimetype = 'application/pdf',
  ): Express.Multer.File {
    return {
      buffer,
      size: buffer.length,
      mimetype,
      originalname: 'input.pdf',
      encoding: '7bit',
      fieldname: 'file',
      stream: Readable.from(buffer),
      destination: '',
      filename: '',
      path: '',
    };
  }
  function fixture() {
    const asset = {
      id: 'asset',
      ownerId: 'owner',
      purpose: 'BOQ',
      bucket: 'boq-private',
      objectKey: 'owner/file.pdf',
      _count: { quotations: 0 },
    };
    const tx = {
      $queryRaw: jest.fn(),
      mediaAsset: {
        create: jest.fn().mockResolvedValue(asset),
        findFirst: jest.fn().mockResolvedValue(asset),
        delete: jest.fn(),
      },
    };
    const prisma = {
      ...tx,
      $transaction: jest.fn(
        async (operation: (client: typeof tx) => Promise<unknown>) =>
          operation(tx),
      ),
    };
    const storage = {
      upload: jest
        .fn<
          Promise<void>,
          [bucket: string, key: string, bytes: Buffer, contentType: string]
        >()
        .mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      signedUrl: jest
        .fn()
        .mockResolvedValue('https://storage.example.com/signed'),
      publicUrl: jest
        .fn()
        .mockReturnValue('https://storage.example.com/image.webp'),
    };
    const scanner = {
      scan: jest
        .fn<Promise<void>, [bytes: Buffer]>()
        .mockResolvedValue(undefined),
    };
    const service = new MediaService(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
      scanner as unknown as ClamavService,
      new ConfigService(),
    );
    return { service, storage, scanner, tx, asset };
  }
  it('rejects missing and oversized files before storage', async () => {
    const { service, storage } = fixture();
    await expect(service.upload('owner', 'BOQ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.upload('owner', 'BOQ', file(Buffer.alloc(5 * 1024 * 1024 + 1))),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it('validates PDF magic independently of caller MIME', async () => {
    const { service, scanner, storage } = fixture();
    await expect(
      service.upload('owner', 'BOQ', file(Buffer.from('<script>bad</script>'))),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(scanner.scan).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it('fails closed when the malware scanner cannot verify a document', async () => {
    const { service, scanner, storage, tx } = fixture();
    scanner.scan.mockRejectedValue(
      new ServiceUnavailableException('Scanner unavailable'),
    );
    await expect(
      service.upload('owner', 'BOQ', file(Buffer.from('%PDF-1.7 test'))),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(storage.upload).not.toHaveBeenCalled();
    expect(tx.mediaAsset.create).not.toHaveBeenCalled();
  });
  it('uploads a scanned BOQ privately without returning a public URL', async () => {
    const { service, scanner, storage } = fixture();
    const result = await service.upload(
      'owner',
      'BOQ',
      file(Buffer.from('%PDF-1.7 test')),
    );
    expect(result.url).toBeNull();
    expect(storage.upload.mock.calls[0][0]).toBe('boq-private');
    expect(scanner.scan.mock.invocationCallOrder[0]).toBeLessThan(
      storage.upload.mock.invocationCallOrder[0],
    );
    expect(storage.publicUrl).not.toHaveBeenCalled();
  });
  it('decodes, resizes, and re-encodes images as WebP', async () => {
    const { service, storage } = fixture();
    const png = await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    await service.upload('owner', 'PRODUCT_IMAGE', file(png, 'image/png'));
    const [, , output, type] = storage.upload.mock.calls[0];
    const metadata = await sharp(output).metadata();
    expect(type).toBe('image/webp');
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(800);
  });
  it('rejects image MIME spoofing', async () => {
    const { service, storage } = fixture();
    await expect(
      service.upload(
        'owner',
        'PRODUCT_IMAGE',
        file(Buffer.from('not a valid image'), 'image/png'),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it('does not sign download URLs for a different customer', async () => {
    const { service, tx, storage } = fixture();
    tx.mediaAsset.findFirst.mockResolvedValue(null);
    await expect(
      service.download('asset', 'another-user', false),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.mediaAsset.findFirst).toHaveBeenCalledWith({
      where: { id: 'asset', ownerId: 'another-user' },
    });
    expect(storage.signedUrl).not.toHaveBeenCalled();
  });
  it('keeps referenced BOQ objects and does not perform storage deletion', async () => {
    const { service, tx, asset, storage } = fixture();
    tx.mediaAsset.findFirst.mockResolvedValue({
      ...asset,
      _count: { quotations: 1 },
    });
    await expect(
      service.remove('asset', 'owner', false),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(storage.remove).not.toHaveBeenCalled();
  });
  it('does not delete product-image URLs without a protected FK lifecycle', async () => {
    const { service, tx, asset, storage } = fixture();
    tx.mediaAsset.findFirst.mockResolvedValue({
      ...asset,
      purpose: 'PRODUCT_IMAGE',
    });
    await expect(
      service.remove('asset', 'owner', false),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(storage.remove).not.toHaveBeenCalled();
  });
  it('locks an unreferenced BOQ until storage deletion and metadata removal complete', async () => {
    const { service, tx, storage } = fixture();
    await expect(service.remove('asset', 'owner', false)).resolves.toEqual({
      message: 'File dihapus',
    });
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.mediaAsset.findFirst.mock.invocationCallOrder[0],
    );
    expect(tx.mediaAsset.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
      storage.remove.mock.invocationCallOrder[0],
    );
    expect(tx.mediaAsset.delete).toHaveBeenCalledWith({
      where: { id: 'asset' },
    });
  });
});
