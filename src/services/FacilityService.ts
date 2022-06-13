import { Facility, Item, Space } from '../proto/facility';
import {
  FacilityIndexKey,
  FacilityKey,
  FacilitySpaceValues,
  FacilityValues
} from './DBService';
import facilityRepository, {
  FacilityRepository
} from '../repositories/FacilityRepository';

type FacilityWithId = {
  id: string;
  facility: Facility;
};

type ItemWithId = {
  id: string;
  item: Space | Item;
};

export class FacilityService {
  private repository: FacilityRepository;

  constructor() {
    this.repository = facilityRepository;
  }

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
      const facility = await facilityRepository.getFacilityKey(id, 'metadata');
      if (facility) {
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
