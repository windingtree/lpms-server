import termRepository from '../repositories/TermRepository';
import { TermDBValue } from '../types';
import { FacilitySubLevels } from './DBService';
import facilityRepository from '../repositories/FacilityRepository';

export class TermService {
  public async getAllFacilityTerms(facilityId: string): Promise<TermDBValue[]> {
    const ids = await termRepository.getAllTermIds(facilityId);

    const terms = new Set<TermDBValue>();
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
    term: TermDBValue
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
    indexKey: FacilitySubLevels,
    itemId: string
  ): Promise<TermDBValue[]> {
    const ids = await termRepository.getAllItemTermIndexes(
      facilityId,
      indexKey,
      itemId
    );
    const terms = new Set<TermDBValue>();
    for (const id of ids) {
      const term = await termRepository.getTerm(facilityId, id);
      if (term) {
        terms.add(term);
      }
    }

    return Array.from(terms);
  }

  public async checkExistTermInItems(facilityId: string, termId: string) {
    const itemIds = await facilityRepository.getAllItemIds(facilityId, 'items');
    for (const itemId of itemIds) {
      const termIds = await termRepository.getAllItemTermIndexes(
        facilityId,
        'items',
        itemId
      );
      if (termIds.includes(termId)) {
        return true;
      }
    }

    return false;
  }
}

export default new TermService();
