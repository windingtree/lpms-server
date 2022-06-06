import DBService, {
  FormattedDate,
  LevelDefaultTyping,
  DBLevel,
  FacilityStubValues,
  FacilityValues,
  FacilityStubKey
} from '../services/DBService';
import { AbstractSublevel } from 'abstract-level';
import { StubStorage } from '../proto/lpms';
import ApiError from '../exceptions/ApiError';

export class StubRepository {
  private dbService: DBService;
  private db: AbstractSublevel<
    AbstractSublevel<DBLevel, LevelDefaultTyping, string, FacilityValues>,
    LevelDefaultTyping,
    string,
    FacilityStubValues
  >;

  constructor(facilityId: string) {
    this.dbService = DBService.getInstance();
    this.db = this.dbService.getFacilityStubsDB(facilityId);
  }

  // --- availability getters / setters

  public async getStub(key: FacilityStubKey): Promise<FacilityStubValues> {
    try {
      return await this.db.get(key);
    } catch (e) {
      if (e.status === 404) {
        throw ApiError.NotFound(`Unable to get "${key}" of stub level"`);
      }
      throw e;
    }
  }

  public async setStub(key: FacilityStubKey, stub: StubStorage): Promise<void> {
    await this.db.put(key, stub);
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
}
