import DBService, {
  DBLevel,
  DefaultOrDateItemKey,
  FacilityItemValues,
  FacilityValues,
  FormattedDate,
  LevelDefaultTyping
} from '../services/DBService';
import { AbstractSublevel } from 'abstract-level';
import { Rates } from '../proto/lpms';

export class ItemRateRepository {
  protected dbService = DBService.getInstance();
  protected db: AbstractSublevel<
    AbstractSublevel<
      AbstractSublevel<DBLevel, LevelDefaultTyping, string, FacilityValues>,
      LevelDefaultTyping,
      string,
      FacilityItemValues
    >,
    LevelDefaultTyping,
    DefaultOrDateItemKey,
    Rates
  >;

  constructor(facilityId: string, itemId: string) {
    this.db = this.dbService.getItemRatesDB(facilityId, 'items', itemId);
  }

  public async getRate(key: DefaultOrDateItemKey): Promise<Rates | null> {
    try {
      return await this.db.get(key);
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return null;
  }

  public async setRate(key: FormattedDate, value: Rates): Promise<void> {
    await this.db.put(key, value);
  }

  public async setRateDefault(value: Rates): Promise<void> {
    await this.db.put('default', value);
  }

  public async delRate(key: DefaultOrDateItemKey): Promise<void> {
    await this.db.del(key);
  }
}
