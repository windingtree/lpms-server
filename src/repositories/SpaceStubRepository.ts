import {
  LevelDefaultTyping,
  DBLevel,
  FacilityValues,
  SpaceStubKey,
  SpaceStubValues
} from '../services/DBService';
import { Item as ItemMetadata } from '../proto/facility';
import { AbstractSublevel } from 'abstract-level';
import { AbstractStubRepository } from './StubRepository';

export class SpaceStubRepository extends AbstractStubRepository {
  protected db: AbstractSublevel<
    AbstractSublevel<
      AbstractSublevel<DBLevel, LevelDefaultTyping, string, FacilityValues>,
      LevelDefaultTyping,
      string,
      ItemMetadata
    >,
    LevelDefaultTyping,
    SpaceStubKey,
    SpaceStubValues
  >;

  constructor(facilityId: string, spaceId: string) {
    super();

    this.db = this.dbService.getSpaceStubsDB(facilityId, spaceId);
  }

  // --- num_booked getter / setter

  public async getNumBookedByDate(key: SpaceStubKey): Promise<number> {
    try {
      return (await this.db.get(key)) as number;
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return 0;
  }

  public async setNumBookedByDate(
    key: SpaceStubKey,
    value: number
  ): Promise<void> {
    await this.db.put(key, value);
  }

  public async delNumBookedByDate(key: SpaceStubKey): Promise<void> {
    await this.db.del(key);
  }
}
