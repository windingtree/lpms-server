import type { NextFunction, Request, Response } from 'express';
import type { SignedMessage } from '@windingtree/videre-sdk/dist/cjs/utils';
import type { Wallet } from 'ethers';
import { brotliCompressSync, brotliDecompressSync } from 'node:zlib';
import { promises } from 'fs';
import { utils } from 'ethers';
import { ServiceProviderData } from '@windingtree/stays-models/dist/cjs/proto/storage';
import { utils as vUtils, eip712 } from '@windingtree/videre-sdk';
import IpfsService from '../services/IpfsService';
import walletService from '../services/WalletService';
import { getLineRegistryDataDomain } from '../config';
import { walletAccountsIndexes } from '../types';
import { Facility, Item } from '../proto/facility';
import facilityService from '../services/FacilityService';
import { Item as ItemMetadata } from '../proto/facility';
const { readFile } = promises;

export class StorageController {
  signMetadata = async (
    data: ServiceProviderData & SignedMessage,
    signer: Wallet
  ): Promise<Uint8Array> => {
    const signedMessage = await vUtils.createSignedMessage(
      await getLineRegistryDataDomain(),
      eip712.storage.ServiceProviderData,
      data,
      signer
    );

    return brotliCompressSync(ServiceProviderData.toBinary(signedMessage));
  };

  uploadFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const multerFile = req.file as Express.Multer.File;
      if (!multerFile) {
        return next(new Error('File not uploaded'));
      }
      const storage = IpfsService.getInstance();
      const file = await IpfsService.getFileFromMulter(multerFile);
      const result = await storage.deployFilesToIpfs([file]);
      return res.json(result);
    } catch (e) {
      next(e);
    }
  };

  uploadMetadata = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const multerFile = req.file as Express.Multer.File;

      if (!multerFile) {
        return next(new Error('File not uploaded'));
      }

      let fileBuffer = await readFile(multerFile.path);

      try {
        fileBuffer = brotliDecompressSync(fileBuffer);
      } catch (_) {
        // data is not compressed
      }

      const serviceProviderData = ServiceProviderData.fromBinary(fileBuffer);
      const serviceProviderId = utils.hexlify(
        serviceProviderData.serviceProvider
      );

      // Extract and save/update facility from metadata
      await facilityService.setFacilityDbKeys(serviceProviderId, [
        [
          'metadata',
          Facility.fromBinary(serviceProviderData.payload) as Facility
        ]
      ]);

      // Extract spaces from metadata
      const items: Record<string, [string, ItemMetadata][]> = {};

      for (const item of serviceProviderData.items) {
        const itemId = utils.hexlify(item.item);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { type, payload, ...generic } = Item.fromBinary(item.payload);

        items[itemId] = [['metadata', generic as Item]];
      }

      // Add/update items to DB
      await Promise.all(
        Object.entries(items).map(([itemId, entries]) =>
          facilityService.setItemDbKeys(
            serviceProviderId,
            'items',
            itemId,
            entries
          )
        )
      );

      const signer = await walletService.getWalletByIndex(
        walletAccountsIndexes.API
      );

      const signedMetadata = await this.signMetadata(
        serviceProviderData as ServiceProviderData & SignedMessage,
        signer
      );

      const storage = IpfsService.getInstance();
      const file = IpfsService.getFileFromBuffer(
        signedMetadata,
        multerFile.originalname
      );
      const result = await storage.deployFilesToIpfs([file]);

      return res.json(result);
    } catch (e) {
      next(e);
    }
  };
}

export default new StorageController();
