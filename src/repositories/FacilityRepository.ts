import DBService, {
  FacilityKey,
  FacilityIndexKey,
  FacilityValues,
  FacilitySpaceValues
} from '../services/DBService';
import { Level } from 'level';
import { Item } from '../proto/facility';

export class FacilityRepository {
  private dbService: DBService;
  private db: Level<string, string | string[]>;

  constructor() {
    this.dbService = DBService.getInstance();
    this.db = DBService.getInstance().getDB();
  }

  // --- facility index management

  public async getAllFacilityIds(): Promise<string[]> {
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

  public async addFacilityToIndex(facilityId: string) {
    const facilityIds = await this.getAllFacilityIds();

    if (facilityIds.length > 0) {
      const ids = new Set<string>(facilityIds);
      ids.add(facilityId);
      await this.db.put('facilities', Array.from(ids));
    } else {
      await this.db.put('facilities', [facilityId]);
    }
  }

  public async delFacilityFromIndex(facilityId: string) {
    const facilityIds = await this.getAllFacilityIds();

    if (facilityIds.length > 0) {
      const ids = new Set<string>(facilityIds);
      if (ids.delete(facilityId)) {
        await this.db.put('facilities', Array.from(ids));
      }
    }
  }

  // --- facility level getters / setters

  public async setFacilityKey(
    facilityId: string,
    key: FacilityKey | FacilityIndexKey,
    value: FacilityValues
  ): Promise<void> {
    await this.dbService.getFacilityDB(facilityId).put(key, value);
  }

  public async getFacilityKey(
    facilityId: string,
    key: FacilityKey | FacilityIndexKey
  ): Promise<FacilityValues> {
    try {
      return await this.dbService.getFacilityDB(facilityId).get(key);
    } catch (e) {
      if (e.status === 404) {
        throw new Error(`Unable to get "${key}" of facility "${facilityId}"`);
      }
      throw e;
    }
  }

  // --- items (space and otherItems) index management

  public async getAllItemIds(
    facilityId: string,
    idx: FacilityIndexKey
  ): Promise<string[]> {
    try {
      return await this.dbService
        .getFacilityDB(facilityId)
        .get<string, string[]>(idx, {
          valueEncoding: 'json'
        });
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return [];
  }

  public async addToIndex(
    facilityId: string,
    idx: FacilityIndexKey,
    itemId: string
  ): Promise<void> {
    const itemIds = await this.getAllItemIds(facilityId, idx);
    const db = this.dbService.getFacilityDB(facilityId);

    if (itemIds.length > 0) {
      const ids = new Set<string>(itemIds);
      ids.add(itemId);
      await db.put(idx, Array.from(ids));
    } else {
      await db.put(idx, [itemId]);
    }
  }

  public async delFromIndex(
    facilityId: string,
    idx: FacilityIndexKey,
    itemId: string
  ): Promise<void> {
    const itemIds = await this.getAllItemIds(facilityId, idx);

    if (itemIds.length > 0) {
      const ids = new Set<string>(itemIds);
      if (ids.delete(itemId)) {
        await this.db.put(idx, Array.from(ids));
      }
    }
  }

  // --- item level (space and otherItems) getters / setters

  public async setItemKey(
    facilityId: string,
    idx: FacilityIndexKey,
    itemId: string,
    key: string,
    value: Item | FacilitySpaceValues
  ): Promise<void> {
    await this.dbService
      .getFacilityItemDB(facilityId, idx, itemId)
      .put(key, value);
  }

  public async getItemKey(
    facilityId: string,
    idx: FacilityIndexKey,
    itemId: string,
    key: string
  ): Promise<Item | FacilitySpaceValues> {
    try {
      return await this.dbService
        .getFacilityItemDB(facilityId, idx, itemId)
        .get(key);
    } catch (e) {
      if (e.status === 404) {
        throw new Error(
          `Unable to get "${key}" of item "${itemId}" of facility "${facilityId}"`
        );
      }
      throw e;
    }
  }
}

export default new FacilityRepository();
