import DBService, {
  FormattedDate,
  FacilityItemValues,
  LevelDefaultTyping,
  DBLevel,
  FacilityValues,
  SpaceStubKey,
  SpaceStubValues
} from '../services/DBService';
import { AbstractSublevel } from 'abstract-level';

export class SpaceStubRepository {
  private dbService: DBService;
  private db: AbstractSublevel<
    AbstractSublevel<
      AbstractSublevel<DBLevel, LevelDefaultTyping, string, FacilityValues>,
      LevelDefaultTyping,
      string,
      FacilityItemValues
    >,
    LevelDefaultTyping,
    SpaceStubKey,
    SpaceStubValues
  >;

  constructor(facilityId: string, spaceId: string) {
    this.dbService = DBService.getInstance();
    this.db = this.dbService.getSpaceStubsDB(facilityId, spaceId);
  }

  // --- daily index management

  public async getIndex(idx: FormattedDate): Promise<string[]> {
    try {
      return await this.db.get<FormattedDate, string[]>(idx, {
        valueEncoding: 'json'
      });
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return [];
  }

  public async addToIndex(idx: FormattedDate, stubId: string): Promise<void> {
    const stubIds = await this.getIndex(idx);

    if (stubIds.length > 0) {
      const ids = new Set<string>(stubIds);
      ids.add(stubId);
      await this.db.put(idx, Array.from(ids));
    } else {
      await this.db.put(idx, [stubId]);
    }
  }

  public async delFromIndex(idx: FormattedDate, itemId: string): Promise<void> {
    const stubIds = await this.getIndex(idx);

    if (stubIds.length > 0) {
      const ids = new Set<string>(stubIds);
      if (ids.delete(itemId)) {
        await this.db.put(idx, Array.from(ids));
      }
    }
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
}
