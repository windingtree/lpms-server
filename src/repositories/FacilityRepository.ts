import DBService, {
  FacilityKey,
  FacilitySubLevels,
  FacilityIndexKey,
  FacilityValues
} from '../services/DBService';
import { Level } from 'level';
import { Item, ItemType, Space } from '../proto/facility';

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

  // --- activate facility index management

  public async getAllActiveFacilityIds(): Promise<string[] | null> {
    try {
      return await this.db.get<string, string[]>('active_facilities', {
        valueEncoding: 'json'
      });
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return null;
  }

  public async addActiveFacilityToIndex(facilityId: string) {
    const facilityIds = await this.getAllActiveFacilityIds();

    if (facilityIds && facilityIds.length > 0) {
      const ids = new Set<string>(facilityIds);
      ids.add(facilityId);
      await this.db.put('active_facilities', Array.from(ids));
    } else {
      await this.db.put('active_facilities', [facilityId]);
    }
  }

  public async delActiveFacilityFromIndex(facilityId: string) {
    const facilityIds = await this.getAllActiveFacilityIds();

    if (facilityIds && facilityIds.length > 0) {
      const ids = new Set<string>(facilityIds);
      if (ids.delete(facilityId)) {
        await this.db.put('active_facilities', Array.from(ids));
      }
    }
  }

  // --- facility level getters / setters / del

  public async setFacilityKey(
    facilityId: string,
    key: FacilityKey | FacilityIndexKey,
    value: FacilityValues
  ): Promise<void> {
    await this.dbService.getFacilityDB(facilityId).put(key, value);
  }

  public async getFacilityKey<T extends FacilityValues>(
    facilityId: string,
    key: FacilityKey | FacilityIndexKey
  ): Promise<T | null> {
    try {
      return (await this.dbService.getFacilityDB(facilityId).get(key)) as T;
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return null;
  }

  public async delFacilityKey(
    facilityId: string,
    key: FacilityKey | FacilityIndexKey
  ): Promise<void> {
    await this.dbService.getFacilityDB(facilityId).del(key);
  }

  public async delAllFacilityKeys(facilityId: string): Promise<void> {
    await this.dbService.getFacilityDB(facilityId).clear();
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

  // --- item level getters / setters

  public async setItemKey(
    facilityId: string,
    idx: FacilitySubLevels,
    itemId: string,
    key: string,
    value: Item
  ): Promise<void> {
    // If a space:
    // 1. Verify that the `payload` is correctly encoded
    // 2. Add to the `spaces` index
    if (value.type === ItemType.SPACE) {
      // the following will throw if Space is not formatted correctly
      Space.fromBinary(value.payload as Uint8Array);
      // above hasn't thrown, let's add it to the index
      await this.addToIndex(facilityId, 'spaces', itemId);
    }

    await this.dbService
      .getFacilityItemDB(facilityId, idx, itemId)
      .put(key, value);
  }

  public async getItemKey<T extends Item>(
    facilityId: string,
    idx: FacilitySubLevels,
    itemId: string,
    key: string
  ): Promise<T | null> {
    try {
      return (await this.dbService
        .getFacilityItemDB(facilityId, idx, itemId)
        .get(key)) as T;
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return null;
  }

  public async delItemKey(
    facilityId: string,
    idx: FacilitySubLevels,
    itemId: string,
    key: string
  ): Promise<void> {
    // If a space:
    // 1. Delete from the `spaces` index.
    if (idx === 'items') {
      const item: Item | null = await this.getItemKey(
        facilityId,
        idx,
        itemId,
        key
      );
      if (item && item.type === ItemType.SPACE) {
        await this.delFromIndex(facilityId, 'spaces', itemId);
      }
    }
    await this.dbService.getFacilityItemDB(facilityId, idx, itemId).del(key);
  }
}

export default new FacilityRepository();
