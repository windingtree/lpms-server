import DBService, {
  DBLevel,
  DefaultOrDateItemKey,
  FacilityValues,
  FormattedDate,
  LevelDefaultTyping
} from '../services/DBService';
import { AbstractSublevel } from 'abstract-level';
import { Rates } from '../proto/lpms';
import { ItemDBValue } from '../types';

export type DBType = 'items' | 'terms';
type DB = AbstractSublevel<
  AbstractSublevel<
    AbstractSublevel<DBLevel, LevelDefaultTyping, string, FacilityValues>,
    LevelDefaultTyping,
    string,
    ItemDBValue
  >,
  LevelDefaultTyping,
  DefaultOrDateItemKey,
  Rates
>;

interface DBs {
  items: DB;
  terms: DB;
}

export class RateRepository {
  protected dbService = DBService.getInstance();
  protected dbs: DBs;
  protected itemsDB: DB;
  protected termsDB: DB;

  constructor(facilityId: string, itemId: string) {
    this.itemsDB = this.dbService.getItemRatesDB(facilityId, 'items', itemId);
    this.termsDB = this.dbService.getItemRatesDB(facilityId, 'terms', itemId);

    this.dbs = {
      items: this.itemsDB,
      terms: this.termsDB
    };
  }

  public async getRate(
    key: DefaultOrDateItemKey,
    type: DBType = 'items'
  ): Promise<Rates | null> {
    try {
      return await this.dbs[type].get(key);
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return null;
  }

  public async setRate(
    key: FormattedDate,
    value: Rates,
    type: DBType = 'items'
  ): Promise<void> {
    await this.dbs[type].put(key, value);
  }

  public async setRateDefault(value: Rates, type = 'items'): Promise<void> {
    await this.dbs[type].put('default', value);
  }

  public async delRate(
    key: DefaultOrDateItemKey,
    type: DBType = 'items'
  ): Promise<void> {
    await this.dbs[type].del(key);
  }
}
