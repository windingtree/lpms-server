import { AbstractSublevel } from 'abstract-level';
import DBService, {
  DBLevel,
  LevelDefaultTyping,
  FacilityItemValues,
  FacilityValues,
  FacilityIndexKey,
  ModifiersKey,
  ModifiersValues
} from '../services/DBService';

export class ItemModifierRepository {
  private dbService: DBService;
  private db: AbstractSublevel<
    AbstractSublevel<
      AbstractSublevel<DBLevel, LevelDefaultTyping, string, FacilityValues>,
      LevelDefaultTyping,
      string,
      FacilityItemValues
    >,
    LevelDefaultTyping,
    ModifiersKey,
    ModifiersValues
  >;

  constructor(facilityId: string, indexKey: FacilityIndexKey, itemId: string) {
    this.dbService = DBService.getInstance();
    this.db = this.dbService.getItemModifiersDB(facilityId, indexKey, itemId);
  }

  public async getModifier(key: ModifiersKey): Promise<ModifiersValues> {
    try {
      return await this.db.get(key);
    } catch (e) {
      if (e.status === 404) {
        throw new Error(`Unable to get "${key}" of modifier level"`);
      }
      throw e;
    }
  }

  public async setModifier(
    key: ModifiersKey,
    value: ModifiersValues
  ): Promise<void> {
    await this.db.put(key, value);
  }

  public async delModifier(key: ModifiersKey): Promise<void> {
    await this.db.del(key);
  }
}

export class SpaceModifierRepository extends ItemModifierRepository {
  constructor(facilityId: string, spaceId: string) {
    super(facilityId, 'spaces', spaceId);
  }
}

export class OtherItemsModifierRepository extends ItemModifierRepository {
  constructor(facilityId: string, otherItemId: string) {
    super(facilityId, 'otherItems', otherItemId);
  }
}
