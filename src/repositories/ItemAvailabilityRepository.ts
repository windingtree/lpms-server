import DBService, {
  FormattedDate,
  DefaultOrDateItemKey,
  LevelDefaultTyping
} from '../services/DBService';
import { Item as ItemMetadata } from '../proto/facility';
import { AbstractLevel, AbstractSublevel } from 'abstract-level';
import { Availability } from '../proto/lpms';

export class ItemAvailabilityRepository {
  private dbService: DBService;
  private db: AbstractSublevel<
    AbstractLevel<LevelDefaultTyping, string, ItemMetadata>,
    LevelDefaultTyping,
    DefaultOrDateItemKey,
    Availability
  >;

  constructor(facilityId: string, itemId: string) {
    this.dbService = DBService.getInstance();
    this.db = this.dbService.getItemAvailabilityDB(facilityId, itemId);
  }

  // --- availability getters / setters

  public async getAvailability(
    key: DefaultOrDateItemKey
  ): Promise<Availability | null> {
    try {
      return await this.db.get(key);
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return null;
  }

  public async setAvailabilityDefault(
    availability: Availability
  ): Promise<void> {
    await this.db.put('default', availability);
  }

  public async setAvailabilityByDate(
    key: FormattedDate,
    availability: Availability
  ): Promise<void> {
    await this.db.put(key, availability);
  }

  public async delAvailability(key: DefaultOrDateItemKey): Promise<void> {
    await this.db.del(key);
  }
}
