import DBService, {
  FormattedDate,
  DefaultOrDateItemKey,
  FacilityItemValues,
  LevelDefaultTyping
} from '../services/DBService';
import { AbstractLevel, AbstractSublevel } from 'abstract-level';
import { Availability } from '../proto/lpms';

export class SpaceAvailabilityRepository {
  private dbService: DBService;
  private db: AbstractSublevel<
    AbstractLevel<LevelDefaultTyping, string, FacilityItemValues>,
    LevelDefaultTyping,
    DefaultOrDateItemKey,
    Availability
  >;

  constructor(facilityId: string, spaceId: string) {
    this.dbService = DBService.getInstance();
    this.db = this.dbService.getSpaceAvailabilityDB(facilityId, spaceId);
  }

  // --- availability getters / setters

  public async getSpaceAvailability(
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
