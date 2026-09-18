import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'node:events';
import { createConnection, type Socket } from 'node:net';
import { ClamavService } from './clamav.service';

jest.mock('node:net', () => ({ createConnection: jest.fn() }));

describe('ClamAV fail-closed INSTREAM protocol', () => {
  function fixture() {
    const socket = Object.assign(new EventEmitter(), {
      write: jest.fn<boolean, [data: string | Buffer]>().mockReturnValue(true),
      destroy: jest.fn(),
      setTimeout: jest.fn<void, [delay: number, callback: () => void]>(),
    });
    jest.mocked(createConnection).mockReturnValue(socket as unknown as Socket);
    return {
      socket,
      service: new ClamavService(
        new ConfigService({ CLAMAV_HOST: 'scanner.internal' }),
      ),
    };
  }
  afterEach(() => jest.clearAllMocks());
  it('rejects uploads when no scanner is configured', async () => {
    const service = new ClamavService(new ConfigService());
    await expect(service.scan(Buffer.from('document'))).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(createConnection).not.toHaveBeenCalled();
  });
  it('frames chunks and accepts only a complete clean result', async () => {
    const { service, socket } = fixture();
    const input = Buffer.from('document');
    const completed = service.scan(input);
    socket.emit('connect');
    expect(socket.write.mock.calls[0][0]).toBe('zINSTREAM\0');
    const length = socket.write.mock.calls[1][0];
    expect(Buffer.isBuffer(length) ? length.readUInt32BE() : undefined).toBe(
      input.length,
    );
    expect(socket.write.mock.calls[2][0]).toEqual(input);
    expect(socket.write.mock.calls[3][0]).toEqual(Buffer.alloc(4));
    socket.emit('data', Buffer.from('stream: '));
    socket.emit('data', Buffer.from('OK\0'));
    await expect(completed).resolves.toBeUndefined();
    expect(socket.destroy).toHaveBeenCalledTimes(1);
  });
  it('rejects a malware result', async () => {
    const { service, socket } = fixture();
    const completed = service.scan(Buffer.from('document'));
    socket.emit('data', Buffer.from('stream: Test.Malware FOUND\0'));
    await expect(completed).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects incomplete responses instead of treating disconnect as clean', async () => {
    const { service, socket } = fixture();
    const completed = service.scan(Buffer.from('document'));
    socket.emit('data', Buffer.from('stream: OK'));
    socket.emit('close');
    await expect(completed).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('rejects scanner protocol errors and timeouts', async () => {
    const { service, socket } = fixture();
    const completed = service.scan(Buffer.from('document'));
    socket.setTimeout.mock.calls[0][1]();
    await expect(completed).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(socket.destroy).toHaveBeenCalledTimes(1);
  });
});
