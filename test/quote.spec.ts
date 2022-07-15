/* eslint-disable @typescript-eslint/no-explicit-any */
import chai from './chai-setup';
import { DateTime } from 'luxon';
import { FormattedDate } from '../src/services/DBService';
import { Ask } from '../src/proto/ask';
import { Date } from '../src/proto/date';
import {
  DayOfWeekRateModifier,
  LOSRateModifier,
  OccupancyRateModifier,
  Rates
} from '../src/proto/lpms';
import { RateRepository } from '../src/repositories/RateRepository';
import {
  FacilityModifierRepository,
  ItemModifierRepository
} from '../src/repositories/ModifierRepository';
import quoteService, {
  QuoteRepositories,
  QuoteService
} from '../src/services/QuoteService';
import { BigNumber, BigNumberish } from 'ethers';
import { removeTestDB } from './common';

const expect = chai.expect;

const createDate = (year: number, month: number, day: number): Date => ({
  year,
  month,
  day
});

const formattedDate = (date: Date) =>
  DateTime.fromObject(date).toFormat('yyyy-MM-dd') as FormattedDate;

const calcRatio = (value: BigNumberish, p: number, q: number) => {
  if (!BigNumber.isBigNumber(value)) {
    value = BigNumber.from(value);
  }
  return value.mul(BigNumber.from(p)).div(BigNumber.from(q));
};

const calcOccupancyRatio = (
  value: BigNumberish,
  totalNumberOccupants: number,
  p: number,
  q: number
) => {
  if (!BigNumber.isBigNumber(value)) {
    value = BigNumber.from(value);
  }
  return value.add(
    BigNumber.from(totalNumberOccupants)
      .sub(BigNumber.from(1))
      .mul(
        // perOccupantDelta
        value.mul(BigNumber.from(p)).div(BigNumber.from(q)).sub(value)
      )
  );
};

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
  // const losModifierRatioLt: LOSRateModifier = {
  //   condition: 0,
  //   los: 3,
  //   valueOneof: {
  //     oneofKind: 'ratio',
  //     ratio: {
  //       p: 150,
  //       q: 100
  //     }
  //   }
  // };
  const losModifierRatioGt: LOSRateModifier = {
    condition: 3, // GTE
    los: 3,
    valueOneof: {
      oneofKind: 'ratio',
      ratio: {
        p: 90,
        q: 100
      }
    }
  };
  // const losModifierFixed: LOSRateModifier = {
  //   condition: 0,
  //   los: 2,
  //   valueOneof: {
  //     oneofKind: 'fixed',
  //     fixed: 200
  //   }
  // };
  const occupancyModifierRatio: OccupancyRateModifier = {
    valueOneof: {
      oneofKind: 'ratio',
      ratio: {
        p: 110,
        q: 100
      }
    }
  };
  const ask: Ask = {
    checkIn: createDate(2022, 8, 1),
    checkOut: createDate(2022, 8, 5),
    numPaxAdult: 2,
    numPaxChild: 1,
    numSpacesReq: 2
  };
  const luckyDay: Date = createDate(2022, 8, 3);
  let repos: QuoteRepositories;
  let reposClear: QuoteRepositories;

  before(async () => {
    repos = {
      rates: new RateRepository(facilityId, spaceId),
      modifiers: new ItemModifierRepository(facilityId, spaceId),
      facilityModifiers: new FacilityModifierRepository(facilityId)
    };
    reposClear = {
      rates: new RateRepository(facilityId + '1', spaceId + '1'),
      modifiers: new ItemModifierRepository(facilityId + '1', spaceId + '1'),
      facilityModifiers: new FacilityModifierRepository(facilityId + '1')
    };
    await repos.rates.setRateDefault(normalRate);
    await repos.rates.setRate(formattedDate(luckyDay), luckyRate);
    await repos.modifiers.setModifier('day_of_week', dowModifier);
    await repos.modifiers.setModifier('length_of_stay', losModifierRatioGt);
    await repos.modifiers.setModifier('occupancy', occupancyModifierRatio);
  });

  after(removeTestDB);

  describe('Static members', () => {
    describe('#getBaseRate', () => {
      it('should return base rate for the space', async () => {
        expect(
          await QuoteService.getBaseRate(
            repos,
            DateTime.fromObject(ask.checkIn as Date),
            'items'
          )
        ).to.eq(BigNumber.from(normalRate.cost));
      });

      it('should throw is space and facility not configured with rate', async () => {
        await expect(
          QuoteService.getBaseRate(
            reposClear,
            DateTime.fromObject(ask.checkIn as Date),
            'items'
          )
        ).to.be.rejectedWith('Unable to get base for the items');
      });
    });

    describe('#applyLosRateModifier', () => {
      it('should apply LOSRateModifier modifier', async () => {
        expect(
          await QuoteService.applyLosRateModifier(
            BigNumber.from(normalRate.cost),
            repos,
            ask.checkIn as Date,
            ask.checkOut as Date
          )
        ).to.eq(
          BigNumber.from(normalRate.cost)
            .mul(BigNumber.from((losModifierRatioGt as any).valueOneof.ratio.p))
            .div(BigNumber.from((losModifierRatioGt as any).valueOneof.ratio.q))
        );
      });

      it('should NOT apply on out of rule', async () => {
        expect(
          await QuoteService.applyLosRateModifier(
            BigNumber.from(normalRate.cost),
            repos,
            ask.checkIn as Date,
            createDate(2022, 8, 2)
          )
        ).to.eq(BigNumber.from(normalRate.cost));
      });
    });

    describe('#applyDayOfWeekModifier', () => {
      it('should apply DayOfWeekRateModifier modifier', async () => {
        expect(
          await QuoteService.applyDayOfWeekModifier(
            BigNumber.from(normalRate.cost),
            repos,
            DateTime.fromObject(ask.checkIn as Date)
          )
        ).to.eq(
          BigNumber.from(normalRate.cost)
            .mul(BigNumber.from((dowModifier as any).mon.valueOneof.ratio.p))
            .div(BigNumber.from((dowModifier as any).mon.valueOneof.ratio.q))
        );
      });
    });

    describe('#applyOccupancyModifier', () => {
      it('should apply OccupancyRateModifier modifier', async () => {
        const totalNumberOccupants =
          (ask.numPaxAdult || 1) + (ask.numPaxChild || 0);
        expect(
          await QuoteService.applyOccupancyModifier(
            BigNumber.from(normalRate.cost),
            repos,
            ask.numPaxAdult,
            ask.numPaxChild
          )
        ).to.eq(
          calcOccupancyRatio(
            BigNumber.from(normalRate.cost),
            totalNumberOccupants,
            (occupancyModifierRatio as any).valueOneof.ratio.p,
            (occupancyModifierRatio as any).valueOneof.ratio.q
          )
        );
      });
    });
  });

  describe('#getQuote async iterator', () => {
    it('should iterate though dates', async () => {
      const totalNumberOccupants =
        (ask.numPaxAdult || 1) + (ask.numPaxChild || 0);
      let days = 0;
      for await (const value of quoteService.getQuoteIterator(repos, ask)) {
        switch (days) {
          case 0:
            // Mon rule 10%
            // 110% occupancy
            expect(value).to.eq(
              calcOccupancyRatio(
                // dow
                calcRatio(
                  normalRate.cost,
                  (dowModifier.mon as any).valueOneof.ratio.p,
                  (dowModifier.mon as any).valueOneof.ratio.q
                ),
                totalNumberOccupants,
                (occupancyModifierRatio as any).valueOneof.ratio.p,
                (occupancyModifierRatio as any).valueOneof.ratio.q
              )
            );
            break;
          case 1:
            // Tue rule fixed 20
            // 110% occupancy
            expect(value).to.eq(
              calcOccupancyRatio(
                // fixed 20
                BigNumber.from(normalRate.cost).add(
                  BigNumber.from((dowModifier.tue as any).valueOneof.fixed)
                ),
                totalNumberOccupants,
                (occupancyModifierRatio as any).valueOneof.ratio.p,
                (occupancyModifierRatio as any).valueOneof.ratio.q
              )
            );
            break;
          case 2:
            // Lucky rate 50
            // 110% occupancy
            expect(value).to.eq(
              calcOccupancyRatio(
                // Lucky 50
                BigNumber.from(luckyRate.cost),
                totalNumberOccupants,
                (occupancyModifierRatio as any).valueOneof.ratio.p,
                (occupancyModifierRatio as any).valueOneof.ratio.q
              )
            );
            break;
          case 3:
            // Normal rate 100
            // 110% occupancy
            expect(value).to.eq(
              calcOccupancyRatio(
                // normal rate
                BigNumber.from(normalRate.cost),
                totalNumberOccupants,
                (occupancyModifierRatio as any).valueOneof.ratio.p,
                (occupancyModifierRatio as any).valueOneof.ratio.q
              )
            );
            break;
          default:
        }
        days++;
      }
    });
  });

  describe('#quote', () => {
    it('should return quote', async () => {
      const quote = await quoteService.quote(facilityId, spaceId, ask, 'items');
      // Stupid Check
      expect(quote).to.eq(BigNumber.from(302));
    });
  });
});
