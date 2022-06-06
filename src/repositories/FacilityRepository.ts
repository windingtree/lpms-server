import DBService, { FacilityItemType, FacilityLevelValues, FacilitySpaceLevelValues } from '../services/DBService';
import { Level } from 'level';
import { Item } from '../proto/facility';

export class FacilityRepository {
  private dbService: DBService;
  private db: Level<string, string | string[]>;

  constructor() {
    this.dbService = DBService.getInstance();
    this.db = DBService.getInstance().getDB();
  }

  public async getFacilityIds(): Promise<string[]> {
    try {
      return await this.db.get<string, string[]>('facilities', {
        valueEncoding: 'json'
      });
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return [];
  }

  public async createFacilityIndex(facilityId: string) {
    const facilitiesIds = await this.getFacilityIds();

    if (facilitiesIds.length > 0) {
      const idsSet = new Set<string>(facilitiesIds);
      idsSet.add(facilityId);
      await this.db.put('facilities', Array.from(idsSet));
    } else {
      await this.db.put('facilities', [facilityId]);
    }
  }

  public async getItemIds(
    facilityId: string,
    itemType: FacilityItemType
  ): Promise<string[]> {
    try {
      const facilitySublevel = this.dbService.getFacilitySublevelDB(facilityId);
      return await facilitySublevel.get<string, string[]>(itemType, {
        valueEncoding: 'json'
      });
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return [];
  }

  public async createFacilityItem(
    facilityId: string,
    key: string,
    value: FacilityLevelValues
  ): Promise<void> {
    const facilitySublevel = this.dbService.getFacilitySublevelDB(facilityId);

    await facilitySublevel.put(key, value);
  }

  public async getFacilityDbKey(
    facilityId: string,
    key: string
  ): Promise<FacilityLevelValues> {
    try {
      return await this.dbService.getFacilitySublevelDB(facilityId).get(key);
    } catch (e) {
      if (e.status === 404) {
        throw new Error(`Unable to get "${key}" of facility "${facilityId}"`);
      }
      throw e;
    }
  }

  public async getSpaceDbKey(
    facilityId: string,
    spaceId: string,
    key: string
  ): Promise<FacilitySpaceLevelValues> {
    try {
      return await this.dbService
        .getFacilityItemDB(facilityId, 'spaces', spaceId)
        .get(key);
    } catch (e) {
      if (e.status === 404) {
        throw new Error(
          `Unable to get "${key}" of space "${spaceId}" of facility "${facilityId}"`
        );
      }
      throw e;
    }
  }

  public async createSpaceIndex(
    facilityId: string,
    itemType: FacilityItemType,
    itemId: string
  ): Promise<void> {
    const itemIds = await this.getItemIds(facilityId, itemType);
    const facilitySublevel = this.dbService.getFacilitySublevelDB(facilityId);

    if (itemIds.length > 0) {
      const spaceSet = new Set<string>(itemIds);
      spaceSet.add(itemId);
      await facilitySublevel.put(itemType, Array.from(spaceSet));
    } else {
      await facilitySublevel.put(itemType, [itemId]);
    }
  }

  public async createSpaceItem(
    facilityId: string,
    itemType: FacilityItemType,
    itemId: string,
    key: string,
    value: Item | FacilitySpaceLevelValues
  ): Promise<void> {
    const sublevel = this.dbService.getFacilityItemDB(
      facilityId,
      itemType,
      itemId
    );

    await sublevel.put(key, value);
  }
}

export default new FacilityRepository();
