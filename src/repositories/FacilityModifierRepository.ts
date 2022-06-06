import { AbstractSublevel } from 'abstract-level';
import DBService, {
  LevelDefaultTyping,
  DBLevel,
  FacilityValues,
  ModifiersKey,
  ModifiersValues
} from '../services/DBService';

export class FacilityModifierRepository {
  private dbService: DBService;
  private db: AbstractSublevel<
    AbstractSublevel<DBLevel, LevelDefaultTyping, string, FacilityValues>,
    LevelDefaultTyping,
    ModifiersKey,
    ModifiersValues
  >;

  constructor(facilityId: string) {
    this.dbService = DBService.getInstance();
    this.db = this.dbService.getFacilityModifiersDB(facilityId);
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
