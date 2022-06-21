import { utils, Wallet } from 'ethers';
import { utils as vUtils, eip712 } from '@windingtree/videre-sdk';
import { SignedMessage } from '@windingtree/videre-sdk/dist/cjs/utils';
import { Facility, Item, Space } from '../proto/facility';
import { ServiceProviderData } from '../proto/storage';
import facilityRepository, {
  FacilityRepository
} from '../repositories/FacilityRepository';
import {
  FacilityIndexKey,
  FacilityKey,
  FacilitySpaceValues,
  FacilityValues
} from './DBService';
import walletService from '../services/WalletService';
import IpfsService from '../services/IpfsService';
import { walletAccountsIndexes } from '../types';
import {
  getLineRegistryDataDomain,
  provider,
  getServiceProviderContract
} from '../config';

export type FacilityWithId = {
  id: string;
  facility: Facility;
};

export type ItemWithId = {
  id: string;
  item: Space | Item;
};

export const genRole = (facilityId: string, role: number): string =>
  utils.keccak256(
    utils.defaultAbiCoder.encode(['bytes32', 'uint256'], [facilityId, role])
  );

export class FacilityService {
  private repository: FacilityRepository;

  constructor() {
    this.repository = facilityRepository;
  }

  static signMetadata = async (
    data: ServiceProviderData & SignedMessage,
    signer: Wallet
  ): Promise<Uint8Array> => {
    const signedMessage = await vUtils.createSignedMessage(
      await getLineRegistryDataDomain(),
      eip712.storage.ServiceProviderData,
      data,
      signer
    );

    return ServiceProviderData.toBinary(signedMessage);
  };

  public saveFacilityMetadata = async (
    facilityId: string,
    facility: Facility,
    spaces?: ItemWithId[],
    otherItems?: ItemWithId[]
  ): Promise<void> => {
    // Build raw service provider metadata
    const serviceProviderData: ServiceProviderData = {
      serviceProvider: utils.arrayify(facilityId),
      payload: Facility.toBinary(facility),
      items: [
        ...(spaces
          ? spaces.map((s) => ({
              item: utils.arrayify(s.id),
              payload: Space.toBinary(s.item as Space)
            }))
          : []),
        ...(otherItems
          ? otherItems.map((s) => ({
              item: utils.arrayify(s.id),
              payload: Item.toBinary(s.item as Item)
            }))
          : [])
      ],
      terms: []
    };

    const signer = await walletService.getWalletByIndex(
      walletAccountsIndexes.API
    );

    // Sign metadata with API key
    const signedMetadata = await FacilityService.signMetadata(
      serviceProviderData as ServiceProviderData & SignedMessage,
      signer
    );

    // Upload signed metadata to the IPFS
    const storage = IpfsService.getInstance();
    const file = IpfsService.getFileFromBuffer(
      signedMetadata,
      `${facilityId}.bin`
    );
    const storageIds = await storage.deployFilesToIpfs([file]);
    const metadataUri = storageIds[0];

    const wallet = signer.connect(provider);

    // Check the API key balance
    // @todo Check with estimation
    const balance = await wallet.getBalance();

    if (balance.isZero()) {
      throw new Error('API address has zero balance');
    }

    const contract = (await getServiceProviderContract()).connect(wallet);

    if (!(await contract.exists(facilityId))) {
      throw new Error(`Facility with Id ${facilityId} does not register yet`);
    } else {
      // Update `dataURI` for existed provider
      const tx = await contract['file(bytes32,bytes32,string)'](
        facilityId,
        utils.formatBytes32String('dataURI'),
        metadataUri
      );
      await tx.wait();
    }
  };

  public async getAllFacilities(): Promise<FacilityWithId[]> {
    const ids = await facilityRepository.getAllFacilityIds();
    const facilities = new Set<FacilityWithId>();
    for (const id of ids) {
      const facility = await facilityRepository.getFacilityKey(id, 'metadata');
      if (facility) {
        facilities.add({
          id,
          facility: facility as Facility
        });
      }
    }

    return Array.from(facilities);
  }

  public async setFacilityDbKeys(
    facilityId: string,
    entries: [FacilityIndexKey | FacilityKey, FacilityValues][]
  ): Promise<void> {
    await this.repository.addFacilityToIndex(facilityId);

    await Promise.all(
      entries.map(([key, value]) =>
        this.repository.setFacilityKey(facilityId, key, value)
      )
    );
  }

  public async setItemDbKeys(
    facilityId: string,
    itemType: FacilityIndexKey,
    itemId: string,
    entries: [string, Item | FacilitySpaceValues][]
  ): Promise<void> {
    await this.repository.addToIndex(facilityId, itemType, itemId);

    await Promise.all(
      entries.map(([key, value]) =>
        this.repository.setItemKey(facilityId, itemType, itemId, key, value)
      )
    );
  }

  public async delFacilityMetadata(facilityId: string): Promise<void> {
    await this.repository.delFacilityKey(facilityId, 'metadata');
    await this.repository.delFacilityFromIndex(facilityId);
  }

  public async getFacilityDbKeyValues(
    facilityId: string,
    key: FacilityIndexKey
  ): Promise<ItemWithId[]> {
    const ids = await facilityRepository.getFacilityKey(facilityId, key);

    if (!Array.isArray(ids)) {
      return [];
    }

    const items = new Set<ItemWithId>();

    for (const id of ids) {
      const item = await facilityRepository.getItemKey(
        facilityId,
        key,
        id,
        'metadata'
      );
      if (item) {
        const item = await facilityRepository.getItemKey<Space>(
          facilityId,
          key,
          id,
          'metadata'
        );
        items.add({
          id,
          item: item as Space | Item
        });
      }
    }

    return Array.from(items);
  }

  public async delItemMetadata(
    facilityId: string,
    key: FacilityIndexKey,
    id: string
  ): Promise<void> {
    await this.repository.delFromIndex(facilityId, key, id);
    await this.repository.delItemKey(facilityId, key, id, 'metadata');
  }
}

export default new FacilityService();
