import DBService, {
  DBLevel,
  FacilityValues,
  LevelDefaultTyping,
  Rules,
  RulesItemKey
} from '../services/DBService';
import { AbstractSublevel } from 'abstract-level';
import { ItemDBValue } from '../types';

abstract class RuleRepository {
  protected db;
  protected dbService = DBService.getInstance();

  public async getRule<T extends Rules>(key: RulesItemKey): Promise<T | null> {
    try {
      return (await this.db.get(key)) as T;
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return null;
  }

  public async setRule(key: RulesItemKey, value: Rules): Promise<void> {
    await this.db.put(key, value);
  }

  public async delRule(key: RulesItemKey): Promise<void> {
    await this.db.del(key);
  }
}

export class FacilityRuleRepository extends RuleRepository {
  protected db: AbstractSublevel<
    AbstractSublevel<DBLevel, LevelDefaultTyping, string, FacilityValues>,
    LevelDefaultTyping,
    RulesItemKey,
    Rules
  >;

  constructor(facilityId: string) {
    super();

    this.db = this.dbService.getFacilityRulesDB(facilityId);
  }
}

export class ItemRuleRepository extends RuleRepository {
  protected db: AbstractSublevel<
    AbstractSublevel<
      AbstractSublevel<DBLevel, LevelDefaultTyping, string, FacilityValues>,
      LevelDefaultTyping,
      string,
      ItemDBValue
    >,
    LevelDefaultTyping,
    RulesItemKey,
    Rules
  >;

  constructor(facilityId: string, itemId: string) {
    super();

    this.db = this.dbService.getItemRulesDB(facilityId, 'items', itemId);
  }
}
