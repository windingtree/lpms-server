import termRepository from '../repositories/TermRepository';
import { TermDBValue, TermWithParam } from '../types';
import { FacilitySubLevels } from './DBService';
import facilityRepository from '../repositories/FacilityRepository';
import mandatoryRepository from '../repositories/MandatoryRepository';
import { BidOptionTerm, BidTerm } from '../proto/bidask';
import { Term } from '../proto/term';
import { BigNumber, utils, Wallet } from 'ethers';
import { getStaysDataDomain } from '../config';
import { eip712 } from '@windingtree/videre-sdk';
import { Ask } from '../proto/ask';
import quoteService, { QuoteService } from './QuoteService';

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

  public async getMandatoryItemTerms(
    facilityId: string,
    spaceId: string
  ): Promise<TermWithParam[]> {
    const ids = await mandatoryRepository.getItemMandatoryIds(
      facilityId,
      spaceId,
      'terms'
    );

    return await TermService.getTermsWithParamsByIds(facilityId, spaceId, ids);
  }

  public async getNonMandatoryItemTermsIds(
    facilityId: string,
    spaceId: string
  ): Promise<TermWithParam[]> {
    const allIds = await termRepository.getAllTermIds(facilityId);
    const mandatoryIds = await mandatoryRepository.getItemMandatoryIds(
      facilityId,
      spaceId,
      'terms'
    );

    const ids = new Set([...allIds].filter((x) => !mandatoryIds.includes(x)));

    return await TermService.getTermsWithParamsByIds(facilityId, spaceId, ids);
  }

  private static async getTermsWithParamsByIds(
    facilityId,
    spaceId,
    ids
  ): Promise<TermWithParam[]> {
    const terms = new Set<TermWithParam>();
    for (const id of ids) {
      const term = await termRepository.getTerm(facilityId, id);
      const param = await termRepository.getTermParam(facilityId, spaceId, id);
      if (term && param) {
        terms.add({ ...term, param });
      }
    }

    return Array.from(terms);
  }

  public async getMandatoryBidTermsWithTotalPrice(
    facilityId: string,
    spaceId: string,
    ask: Ask
  ): Promise<[BigNumber, BidTerm[]]> {
    const terms = await this.getMandatoryItemTerms(facilityId, spaceId);
    const quoteService = new QuoteService();
    let quote = BigNumber.from(0);
    for (const term of terms) {
      quote = quote.add(
        await quoteService.quote(facilityId, term.term, ask, 'terms')
      );
    }

    const bidTerms = Promise.all<BidTerm[]>(
      terms.map((t) => {
        return {
          term: Term.toBinary(t.payload),
          impl: t.impl,
          txPayload: utils.arrayify(t.param)
        };
      })
    );

    return [quote, await bidTerms];
  }

  public async getOptionalBidTerms(
    facilityId: string,
    spaceId: string,
    ask: Ask,
    wallet: Wallet,
    gem: string
  ): Promise<BidOptionTerm[]> {
    const terms = await this.getMandatoryItemTerms(facilityId, spaceId);

    return Promise.all(
      terms.map(async (t) => {
        const quote = await quoteService.quote(
          facilityId,
          t.term,
          ask,
          'terms'
        );

        return {
          term: {
            term: Term.toBinary(t.payload),
            impl: t.impl,
            txPayload: utils.arrayify(t.param)
          },
          cost: [
            {
              gem: gem,
              wad: quote.mul(BigNumber.from('10').pow('18')).toString()
            }
          ],
          signature: utils.arrayify(
            await wallet._signTypedData(
              await getStaysDataDomain(),
              eip712.bidask.BidOptionTerm,
              {
                term: {
                  term: utils.keccak256(Term.toBinary(t.payload)),
                  impl: t.impl,
                  txPayload: utils.keccak256(t.param)
                },
                cost: [
                  {
                    gem: gem,
                    wad: quote.mul(BigNumber.from('10').pow('18')).toString()
                  }
                ]
              }
            )
          )
        };
      })
    );
  }
}

export default new TermService();
