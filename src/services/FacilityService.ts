import { Item } from '../proto/facility';
import {
  FacilityIndexKey,
  FacilityValues,
  FacilitySpaceValues,
  FacilityKey
} from './DBService';
import facilityRepository, {
  FacilityRepository
} from '../repositories/FacilityRepository';

export class FacilityService {
  private repository: FacilityRepository;

  constructor() {
    this.repository = facilityRepository;
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
}

export default new FacilityService();
