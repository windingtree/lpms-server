import DBService, { FacilityIndexKey } from '../services/DBService';
import { Term } from '../types';

export class TermRepository {
  //todo make term rates repo
  protected dbService: DBService;

  constructor() {
    this.dbService = DBService.getInstance();
  }

  //facility term management

  public async getAllTermIds(facilityId: string): Promise<string[]> {
    try {
      const facilityDB = this.dbService.getFacilityDB(facilityId);
      return await facilityDB.get<string, string[]>('terms', {
        valueEncoding: 'json'
      });
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return [];
  }

  public async addTermToIndex(facilityId: string, termId: string) {
    const facilityDB = this.dbService.getFacilityDB(facilityId);
    const termIds = await this.getAllTermIds(facilityId);
    if (termIds.length > 0) {
      const ids = new Set<string>(termIds);
      ids.add(termId);
      await facilityDB.put('terms', Array.from(ids));
    } else {
      await facilityDB.put('terms', [facilityId]);
    }
  }

  public async delTermFromIndex(facilityId: string, termId: string) {
    const facilityDB = this.dbService.getFacilityDB(facilityId);
    const termIds = await this.getAllTermIds(facilityId);
    if (termIds.length > 0) {
      const ids = new Set<string>(termIds);
      if (ids.delete(termId)) {
        await facilityDB.put('terms', Array.from(ids));
      }
    }
  }

  public async getTerm(facilityId: string, termId: string) {
    try {
      return await this.dbService.getFacilityTermsDB(facilityId).get(termId);
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return null;
  }

  public async setTerm(facilityId: string, termId: string, term: Term) {
    return await this.dbService
      .getFacilityTermsDB(facilityId)
      .put(termId, term);
  }

  public async delTerm(facilityId: string, termId: string) {
    return await this.dbService.getFacilityTermsDB(facilityId).del(termId);
  }

  //end facility term management

  //item term management
  public async getAllItemTermIndexes(
    facilityId: string,
    indexKey: FacilityIndexKey,
    itemId: string
  ): Promise<string[]> {
    try {
      const itemDB = this.dbService.getFacilityItemDB(
        facilityId,
        indexKey,
        itemId
      );
      return await itemDB.get<string, string[]>('terms', {
        valueEncoding: 'json'
      });
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return [];
  }

  public async addTermToItemIndex(
    facilityId: string,
    indexKey: FacilityIndexKey,
    itemId: string,
    termId: string
  ) {
    const itemDB = this.dbService.getItemTermsDB(facilityId, indexKey, itemId);

    const termIds = await this.getAllItemTermIndexes(
      facilityId,
      indexKey,
      itemId
    );

    if (termIds.length > 0) {
      const ids = new Set<string>(termIds);
      ids.add(termId);
      await itemDB.put('terms', Array.from(ids));
    } else {
      await itemDB.put('terms', [facilityId]);
    }
  }

  public async delTermFromItemIndex(
    facilityId: string,
    indexKey: FacilityIndexKey,
    itemId: string,
    termId: string
  ) {
    const itemDB = this.dbService.getItemTermsDB(facilityId, indexKey, itemId);

    const termIds = await this.getAllItemTermIndexes(
      facilityId,
      indexKey,
      itemId
    );

    if (termIds.length > 0) {
      const ids = new Set<string>(termIds);
      if (ids.delete(termId)) {
        await itemDB.put('facilities', Array.from(ids));
      }
    }
  }

  //end item term management
}

export default new TermRepository();
