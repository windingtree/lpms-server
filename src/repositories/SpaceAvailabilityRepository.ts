import DBService, { DateType, FacilityItemValues, LevelDefaultTyping } from '../services/DBService';
import { AbstractLevel, AbstractSublevel } from 'abstract-level';
import { Availability } from '../proto/lpms';

export class SpaceAvailabilityRepository {
  private dbService: DBService;
  private availableDB: AbstractSublevel<AbstractLevel<LevelDefaultTyping, string, FacilityItemValues>, LevelDefaultTyping, "default" | DateType, Availability>;

  constructor(facilityId, spaceId) {
    this.dbService = DBService.getInstance();
    this.availableDB = this.dbService.getSpaceAvailabilityDB(facilityId, spaceId);
  }

  public async getSpaceAvailabilityNumSpaces(key): Promise<number> {
    try {
      const availability: Availability = await this.availableDB.get(key);
      return availability.numSpaces;
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }

    return 0;
  }

  public async createAvailabilityByDate(key: DateType): Promise<void> {
    const count = await this.getSpaceAvailabilityNumSpaces(key);

    const availability: Availability = {
      numSpaces: count + 1
    };

    await this.availableDB.put(key, availability);
  }
}
