import { Item } from '../proto/facility';
import {
  FacilityItemType,
  FacilityValues,
  FacilitySpaceValues
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
    entries: [string, FacilityValues][]
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
    itemType: FacilityItemType,
    itemId: string,
    entries: [string, Item | FacilitySpaceValues][]
  ): Promise<void> {
    await this.repository.addItemToIndex(facilityId, itemType, itemId);

    await Promise.all(
      entries.map(([key, value]) =>
        this.repository.setItemKey(
          facilityId,
          itemType,
          itemId,
          key,
          value
        )
      )
    );
  }
}

export default new FacilityService();
