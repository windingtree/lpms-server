import DBService, {
  DBLevel,
  FacilityIndexKey,
  FacilityItemValues,
  FacilityValues,
  LevelDefaultTyping,
  Rules,
  RulesItemKey
} from '../services/DBService';
import ApiError from '../exceptions/ApiError';
import {  AbstractSublevel } from 'abstract-level';

abstract class RuleRepository {
  protected db;
  protected dbService = DBService.getInstance();

  public async getRule(key: RulesItemKey): Promise<Rules | null> {
    try {
      return await this.db.get(key);
    } catch (e) {
      if (e.status === 404) {
        throw ApiError.NotFound(`Unable to get "${key}" of rule level"`);
      }
      throw e;
    }
  }

  public async setRule(key: RulesItemKey, value: Rules): Promise<void> {
    await this.db.put(key, value);
  }

  public async delRule(key: RulesItemKey): Promise<void> {
    await this.db.del(key);
  }
}


abstract class ItemRuleRepository extends RuleRepository {
  protected db: AbstractSublevel<
    AbstractSublevel<
      AbstractSublevel<DBLevel, LevelDefaultTyping, string, FacilityValues>,
      LevelDefaultTyping,
      string,
      FacilityItemValues
    >,
    LevelDefaultTyping,
    RulesItemKey,
    Rules
  >;

  protected constructor(facilityId: string, indexKey: FacilityIndexKey, itemId: string) {
    super();

    this.db = this.dbService.getItemRulesDB(facilityId, indexKey, itemId);
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

export class SpaceRuleRepository extends ItemRuleRepository {
  constructor(facilityId: string, itemId: string) {
    super(facilityId, 'spaces', itemId);
  }
}
export class OtherItemRuleRepository extends ItemRuleRepository {
  constructor(facilityId: string, itemId: string) {
    super(facilityId, 'otherItems', itemId);
  }
}
