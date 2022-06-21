import { promises } from 'fs';
import { File } from '@web-std/file';
import { IPFS, create } from 'ipfs-core';
const { readFile } = promises;

export default class IpfsService {
  protected ipfs: IPFS;

  private static _instance: IpfsService = new IpfsService();

  constructor() {
    if (IpfsService._instance) {
      throw new Error(
        'Error: Instantiation failed: Use IpfsService.getInstance() instead of new'
      );
    }
    IpfsService._instance = this;

    (async () => {
      this.ipfs = await create({
        config: {}
      });
      const version = await this.ipfs.version();
      console.log('IPFS Version:', version.version);
      console.log(await this.ipfs.repo.stat());
    })();
  }

  public static getInstance(): IpfsService {
    return IpfsService._instance;
  }

  public getIpfs(): IPFS {
    return this.ipfs;
  }

  public async start(): Promise<void> {
    this.ipfs = await create({ config: {} });
    const version = await this.ipfs.version();
    console.log('IPFS Version', version.version);
    console.log(await this.ipfs.repo.stat());
  }

  public async stop(): Promise<void> {
    await this.ipfs.stop();
  }

  static getFileFromBuffer(fileBuffer: Uint8Array, fileName: string): File {
    return new File([fileBuffer], fileName);
  }

  static async getFileFromMulter(file: Express.Multer.File): Promise<File> {
    const fileBuffer = await readFile(file.path);
    return IpfsService.getFileFromBuffer(fileBuffer, file.originalname);
  }

  public async deployFilesToIpfs(
    files: InstanceType<typeof File>[]
  ): Promise<string[]> {
    return Promise.all(
      files.map(async (file) => {
        const result = await this.ipfs.add(file, { wrapWithDirectory: false });
        return result.cid.toString();
      })
    );
  }
}
