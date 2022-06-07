import { expect } from './chai-setup';
import { DateTime } from 'luxon';
import { FormattedDate } from '../src/services/DBService';
import { Ask } from '../src/proto/ask';
import { Date } from '../src/proto/date';
import {
  Rates,
  DayOfWeekRateModifier,
  LOSRateModifier
} from '../src/proto/lpms';
import { SpaceRateRepository } from '../src/repositories/ItemRateRepository';
import {
  FacilityModifierRepository,
  SpaceModifierRepository
} from '../src/repositories/ModifierRepository';

import quoteService, { QuoteRepositories } from '../src/services/QuoteService';
import { BigNumber } from 'ethers';

const createDate = (year: number, month: number, day: number): Date => ({
  year,
  month,
  day
});

const formattedDate = (date: Date) =>
  DateTime.fromObject(date).toFormat('yyyy-MM-dd') as FormattedDate;

describe('QuoteService', () => {
  const facilityId = '0x1234567890';
  const spaceId = '0x1234567890';
  const normalRate: Rates = {
    cost: 100
  };
  const luckyRate: Rates = {
    cost: 50
  };
  // day_of_week
  const dowModifier: DayOfWeekRateModifier = {
    mon: {
      valueOneof: {
        oneofKind: 'ratio',
        ratio: {
          p: 10,
          q: 100
        }
      }
    },
    tue: {
      valueOneof: {
        oneofKind: 'fixed',
        fixed: 20
      }
    }
  };
  const losModifierRatioLt: LOSRateModifier = {
    condition: 0,
    los: 3,
    valueOneof: {
      oneofKind: 'ratio',
      ratio: {
        p: 150,
        q: 100
      }
    }
  };
  const losModifierRatioGt: LOSRateModifier = {
    condition: 3,
    los: 4,
    valueOneof: {
      oneofKind: 'ratio',
      ratio: {
        p: 90,
        q: 100
      }
    }
  };
  const losModifierFixed: LOSRateModifier = {
    condition: 0,
    los: 2,
    valueOneof: {
      oneofKind: 'fixed',
      fixed: 200
    }
  };
  let repos: QuoteRepositories;
  let ask: Ask;
  let luckyDay: Date;

  before(async () => {
    ask = {
      checkIn: createDate(2022, 8, 1),
      checkOut: createDate(2022, 8, 5),
      numPaxAdult: 2,
      numPaxChild: 1,
      numSpacesReq: 2
    };
    luckyDay = createDate(2022, 8, 3);
    repos = {
      ratesRepository: new SpaceRateRepository(facilityId, spaceId),
      spaceModifiersRepository: new SpaceModifierRepository(
        facilityId,
        spaceId
      ),
      facilityModifierRepository: new FacilityModifierRepository(facilityId)
    };
    await repos.ratesRepository.setRateDefault(normalRate);
    await repos.ratesRepository.setRate(formattedDate(luckyDay), luckyRate);
    await repos.spaceModifiersRepository.setModifier(
      'day_of_week',
      dowModifier
    );
    await repos.spaceModifiersRepository.setModifier(
      'length_of_stay',
      losModifierRatioGt
    );
  });

  describe('#getQuote async iterator', () => {
    it('should iterate though dates', async () => {
      let days = 0;
      for await (const value of quoteService.getQuoteIterator(
        repos,
        ask.checkIn as Date,
        ask.checkOut as Date
      )) {
        switch (days) {
          case 0:
            // Mon rule 10%
            expect(value).to.eq(
              BigNumber.from(normalRate.cost)
                .mul(
                  BigNumber.from((dowModifier.mon as any).valueOneof.ratio.p)
                )
                .div(
                  BigNumber.from((dowModifier.mon as any).valueOneof.ratio.q)
                )
            );
            break;
          case 1:
            // Tue rule fixed 20
            expect(value).to.eq(
              BigNumber.from((dowModifier.tue as any).valueOneof.fixed)
            );
            break;
          case 2:
            // Lucky rate 50
            expect(value).to.eq(BigNumber.from(luckyRate.cost));
            break;
          case 3:
            // Normal rate 100
            expect(value).to.eq(BigNumber.from(normalRate.cost));
            break;
          default:
        }
        days++;
      }
    });
  });

  describe('#quote', () => {
    it('should return quote', async () => {
      const quote = await quoteService.quote(facilityId, spaceId, ask);
      console.log('Quote:', quote.toString());
    });
  });
});
