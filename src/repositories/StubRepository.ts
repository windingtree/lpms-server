import DBService, {
  DBLevel,
  FacilityStubKey,
  FacilityStubValues,
  FacilityValues,
  FormattedDate,
  LevelDefaultTyping
} from '../services/DBService';
import { AbstractSublevel } from 'abstract-level';
import { StubStorage } from '../proto/lpms';

export abstract class AbstractStubRepository {
  protected dbService: DBService = DBService.getInstance();
  protected db;

  // --- daily index management
  public async getIndex(idx: FormattedDate): Promise<string[]> {
    try {
      return await this.db.get(idx, {
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

export class StubRepository extends AbstractStubRepository {
  protected db: AbstractSublevel<
    AbstractSublevel<DBLevel, LevelDefaultTyping, string, FacilityValues>,
    LevelDefaultTyping,
    string,
    FacilityStubValues
  >;

  protected facilityDB: AbstractSublevel<
    DBLevel,
    string | Buffer | Uint8Array,
    string,
    FacilityValues
  >;

  constructor(facilityId: string) {
    super();

    this.db = this.dbService.getFacilityStubsDB(facilityId);
    this.facilityDB = this.dbService.getFacilityDB(facilityId);
  }

  // --- facility stub index management
  public async addToFacilityIndex(stubId) {
    const stubIds = await this.getFacilityIndex();

    if (stubIds.length > 0) {
      const ids = new Set<string>(stubIds);
      ids.add(stubId);
      await this.facilityDB.put('stubs', Array.from(ids));
    } else {
      await this.facilityDB.put('stubs', [stubId]);
    }
  }

  public async getFacilityIndex(): Promise<string[]> {
    return (await this.facilityDB.get('stubs')) as string[];
  }

  // --- stub getters / setters
  public async getStub(
    key: FacilityStubKey
  ): Promise<FacilityStubValues | null> {
    try {
      return await this.db.get(key);
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
      return null;
    }
  }

  public async setStub(key: FacilityStubKey, stub: StubStorage): Promise<void> {
    await this.db.put(key, stub);
  }
}
