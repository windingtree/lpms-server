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
  private availableDB: AbstractSublevel<
    AbstractLevel<LevelDefaultTyping, string, FacilityItemValues>,
    LevelDefaultTyping,
    DefaultOrDateItemKey,
    Availability
  >;

  constructor(facilityId: string, spaceId: string) {
    this.dbService = DBService.getInstance();
    this.availableDB = this.dbService.getSpaceAvailabilityDB(
      facilityId,
      spaceId
    );
  }

  public async getSpaceAvailabilityNumSpaces(
    key: DefaultOrDateItemKey
  ): Promise<number> {
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

  public async createDefaultAvailability(numSpaces: number): Promise<void> {
    const availability: Availability = {
      numSpaces
    };

    await this.availableDB.put('default', availability);
  }

  public async createAvailabilityByDate(
    key: FormattedDate,
    numSpaces = 1
  ): Promise<void> {
    const count = await this.getSpaceAvailabilityNumSpaces(key);

    const availability: Availability = {
      numSpaces: count + numSpaces
    };

    await this.availableDB.put(key, availability);
  }
}
