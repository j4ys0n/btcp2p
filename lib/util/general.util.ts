import * as crypto from 'crypto';

export class Utils {
  public sha256(buffer: Buffer): Buffer {
    const hash1 = crypto.createHash('sha256');
    hash1.update(buffer);
    return hash1.digest();
  }

  public sha256d(buffer: Buffer): Buffer {
    return this.sha256(this.sha256(buffer));
  }

  public varIntBuffer(n: number): Buffer {
    if (n < 0xfd) {
      return new Buffer([n]);
    } else if (n <= 0xffff) {
      let buff = new Buffer(3);
      buff[0] = 0xfd;
      buff.writeUInt16LE(n, 1);
      return buff;
    } else if (n <= 0xffffffff) {
      let buff = new Buffer(5);
      buff[0] = 0xfe;
      buff.writeUInt32LE(n, 1);
      return buff;
    } else {
      const buff = new Buffer(9);
      buff[0] = 0xff;
      this.packUInt16LE(n).copy(buff, 1);
      return buff;
    }
  }

  public packUInt16LE(num: number): Buffer {
    const buff = new Buffer(2);
    buff.writeUInt16LE(num, 0);
    return buff;
  }

  public packUInt32LE(num: number): Buffer {
    const buff = new Buffer(4);
    buff.writeInt32LE(num, 0);
    return buff;
  }

  public packInt64LE(num: number): Buffer {
    const buff = new Buffer(8);
    buff.writeUInt32LE(num % Math.pow(2, 32), 0);
    buff.writeUInt32LE(Math.floor(num / Math.pow(2, 32)), 4);
    return buff;
  }

  public varStringBuffer(s: string): Buffer {
    const strBuff = new Buffer(s);
    return Buffer.concat([this.varIntBuffer(strBuff.length), strBuff]);
  }

  private fixedLenStringBuffer(s: string, len: number): Buffer {
    let buff = Buffer.allocUnsafe(len);
    buff.fill(0);
    buff.write(s);
    return buff;
  }

  public commandStringBuffer(s: string): Buffer {
    return this.fixedLenStringBuffer(s, 12);
  }
}
