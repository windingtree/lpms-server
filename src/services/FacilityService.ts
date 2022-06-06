import { Item } from '../proto/facility';
import { FacilityItemType, FacilityLevelValues, FacilitySpaceLevelValues } from './DBService';
import facilityRepository, { FacilityRepository } from '../repositories/FacilityRepository';

export class FacilityService {
  private repository: FacilityRepository;

  constructor() {
    this.repository = facilityRepository;
  }

  public async setFacilityDbKeys(
    facilityId: string,
    entries: [string, FacilityLevelValues][]
  ): Promise<void> {
    await this.repository.createFacilityIndex(facilityId);

    await Promise.all(
      entries.map(([key, value]) =>
        this.repository.createFacilityItem(facilityId, key, value))
    );
  }

  public async setItemDbKeys(
    facilityId: string,
    itemType: FacilityItemType,
    itemId: string,
    entries: [string, Item | FacilitySpaceLevelValues][]
  ): Promise<void> {
    await this.repository.createSpaceIndex(facilityId, itemType, itemId);

    await Promise.all(entries.map(([key, value]) =>
      this.repository.createSpaceItem(facilityId, itemType, itemId, key, value)));
  }
}

export default new FacilityService();
