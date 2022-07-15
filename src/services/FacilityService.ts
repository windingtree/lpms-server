import { BigNumber, utils, Wallet } from 'ethers';
import { eip712, utils as vUtils } from '@windingtree/videre-sdk';
import { SignedMessage } from '@windingtree/videre-sdk/dist/cjs/utils';
import { Facility, Item, ItemType, Space } from '../proto/facility';
import { ServiceItemData, ServiceProviderData } from '../proto/storage';
import facilityRepository, {
  FacilityRepository
} from '../repositories/FacilityRepository';
import { FacilityKey, FacilitySubLevels, FacilityValues } from './DBService';
import walletService from '../services/WalletService';
import IpfsService from '../services/IpfsService';
import { ItemDBValue, walletAccountsIndexes } from '../types';
import {
  getLineRegistryDataDomain,
  getServiceProviderContract,
  getStaysDataDomain,
  provider
} from '../config';
import ApiError from '../exceptions/ApiError';
import termService from './TermService';
import { Term } from '../proto/term';
import mandatoryRepository from '../repositories/MandatoryRepository';
import { BidOptionItem } from '../proto/bidask';
import quoteService, { QuoteService } from './QuoteService';
import { Ask } from '../proto/ask';

export type FacilityWithId = {
  id: string;
  facility: Facility;
};

export type ItemWithId = {
  id: string;
  item: Item;
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

  public saveFacilityMetadata = async (facilityId: string): Promise<void> => {
    const facilityMetadata = await facilityRepository.getFacilityKey<Facility>(
      facilityId,
      'metadata'
    );

    if (!facilityMetadata) {
      throw ApiError.NotFound(`The facility ${facilityId} does not exists`);
    }

    const items = await this.getFacilityDbKeyValues(facilityId, 'items');
    const terms = await termService.getAllFacilityTerms(facilityId);

    // Build raw service provider metadata
    const serviceProviderData: ServiceProviderData = {
      serviceProvider: utils.arrayify(facilityId),
      payload: Facility.toBinary(facilityMetadata),
      items: [
        ...(items
          ? items.map<ServiceItemData>((i) => {
              if (i.item.payload) {
                i.item.payload = Space.toBinary(
                  i.item.payload as unknown as Space
                );
              }
              return {
                item: utils.arrayify(i.id),
                payload: Item.toBinary(i.item)
              };
            })
          : [])
      ],
      terms: [
        ...(terms
          ? terms.map((t) => {
              return {
                term: utils.arrayify(t.term),
                impl: t.impl,
                payload: Term.toBinary(t.payload)
              };
            })
          : [])
      ]
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
      throw new Error(`Facility with Id ${facilityId} not registered`);
    } else {
      // Update `dataURI` for existing provider
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
    entries: [FacilitySubLevels | FacilityKey, FacilityValues][]
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
    itemType: FacilitySubLevels,
    itemId: string,
    entries: [string, ItemDBValue][]
  ): Promise<void> {
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
    key: FacilitySubLevels
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
      if (item) items.add({ id, item: item as Item });
    }

    return Array.from(items);
  }

  public async delItemMetadata(
    facilityId: string,
    key: FacilitySubLevels,
    id: string
  ): Promise<void> {
    await this.repository.delFromIndex(facilityId, key, id);
    await this.repository.delItemKey(facilityId, key, id, 'metadata');
  }

  public async getFacilityOtherItemsIds(facilityId: string) {
    const allItems = await this.getFacilityDbKeyValues(facilityId, 'items');

    return allItems.filter((i) => {
      return i.item.type === ItemType.OTHER;
    });
  }

  public async getFacilitySpaceIds(facilityId: string) {
    const allItems = await this.getFacilityDbKeyValues(facilityId, 'items');

    return allItems.filter((i) => {
      return i.item.type === ItemType.SPACE;
    });
  }

  public async getFacilityOptionalOtherItems(
    facilityId: string,
    spaceId: string
  ): Promise<ItemWithId[]> {
    const allItems = await this.getFacilityOtherItemsIds(facilityId);
    const mandatoryIds = await mandatoryRepository.getItemMandatoryIds(
      facilityId,
      spaceId,
      'items'
    );

    return allItems.filter((x) => !mandatoryIds.includes(x.id));
  }

  public async getFacilityBidOptionalItems(
    facilityId: string,
    spaceId: string,
    ask,
    wallet: Wallet,
    gem: string
  ): Promise<BidOptionItem[]> {
    const itemsWithIds = await this.getFacilityOptionalOtherItems(
      facilityId,
      spaceId
    );

    const bidOptionItems = new Set<BidOptionItem>();

    for (const itemWithId of itemsWithIds) {
      const quote = await quoteService.quote(
        facilityId,
        itemWithId.id,
        ask,
        'items'
      );
      if (itemWithId) {
        bidOptionItems.add({
          item: Item.toBinary(itemWithId.item),
          cost: [
            {
              gem,
              wad: quote.mul(BigNumber.from('10').pow('18')).toString()
            }
          ],
          signature: utils.arrayify(
            await wallet._signTypedData(
              await getStaysDataDomain(),
              eip712.bidask.BidOptionItem,
              {
                item: utils.keccak256(Item.toBinary(itemWithId.item)),
                cost: [
                  {
                    gem,
                    wad: quote.mul(BigNumber.from('10').pow('18')).toString()
                  }
                ]
              }
            )
          )
        });
      }
    }
    return Array.from(bidOptionItems);
  }

  public async getMandatoryOtherItemsIdsWithTotalPrice(
    facilityId: string,
    spaceId: string,
    ask: Ask
  ): Promise<[BigNumber, string[]]> {
    const quoteService = new QuoteService();
    const mandatoryItems = await mandatoryRepository.getItemMandatoryIds(
      facilityId,
      spaceId,
      'items'
    );
    let quote = BigNumber.from(0);

    for (const mandatoryItem of mandatoryItems) {
      quote = quote.add(
        await quoteService.quote(facilityId, mandatoryItem, ask, 'items')
      );
    }

    return [quote, mandatoryItems];
  }
}

export default new FacilityService();
