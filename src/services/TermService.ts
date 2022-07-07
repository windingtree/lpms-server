import termRepository from '../repositories/TermRepository';
import { Term } from '../types';
import { FacilityIndexKey } from './DBService';

export class TermService {
  public async getAllFacilityTerms(facilityId: string): Promise<Term[]> {
    const ids = await termRepository.getAllTermIds(facilityId);
    const terms = new Set<Term>();
    for (const id of ids) {
      const term = await termRepository.getTerm(facilityId, id);
      if (term) {
        terms.add(term);
      }
    }

    return Array.from(terms);
  }

  public async setTerm(
    facilityId: string,
    termId: string,
    term: Term
  ): Promise<void> {
    await termRepository.setTerm(facilityId, termId, term);
    await termRepository.addTermToIndex(facilityId, termId);
  }

  public async delTerm(facilityId: string, termId: string): Promise<void> {
    await termRepository.delTerm(facilityId, termId);
    await termRepository.delTermFromIndex(facilityId, termId);
  }

  public async getAllItemTerms(
    facilityId: string,
    indexKey: FacilityIndexKey,
    itemId: string
  ): Promise<Term[]> {
    const ids = await termRepository.getAllItemTermIndexes(
      facilityId,
      indexKey,
      itemId
    );
    const terms = new Set<Term>();
    for (const id of ids) {
      const term = await termRepository.getTerm(facilityId, id);
      if (term) {
        terms.add(term);
      }
    }

    return Array.from(terms);
  }
}

export default new TermService();
