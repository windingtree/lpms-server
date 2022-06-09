import { BigNumber } from 'ethers';
import { DateTime } from 'luxon';
import { FormattedDate } from './DBService';
import { Ask } from '../proto/ask';
import { Date } from '../proto/date';
import {
  Condition,
  DayOfWeekRateModifier,
  DayOfWeekRateModifierElement,
  LOSRateModifier,
  OccupancyRateModifier,
  Rates
} from '../proto/lpms';
import { SpaceRateRepository } from '../repositories/ItemRateRepository';
import {
  FacilityModifierRepository,
  SpaceModifierRepository
} from '../repositories/ModifierRepository';

export interface QuoteRepositories {
  rates: SpaceRateRepository;
  modifiers: SpaceModifierRepository;
  facilityModifiers: FacilityModifierRepository;
}

export class QuoteService {
  // Get base rate for the space
  static getBaseRate = async (
    { rates }: QuoteRepositories,
    day: DateTime
  ): Promise<BigNumber> => {
    let baseRate = await rates.getRate(
      day.toFormat('yyyy-MM-dd') as FormattedDate
    );

    if (!baseRate) {
      baseRate = await rates.getRate('default');
    }

    if (!baseRate) {
      throw new Error('Unable to get base for the space');
    }

    return BigNumber.from(baseRate.cost);
  };

  // Apply LOSRateModifier modifier
  static applyLosRateModifier = async (
    rate: BigNumber,
    { modifiers, facilityModifiers }: QuoteRepositories,
    checkIn: Date,
    checkOut: Date
  ): Promise<BigNumber> => {
    let losSpaceModifier: null | LOSRateModifier;

    losSpaceModifier = await modifiers.getModifier<LOSRateModifier>(
      'length_of_stay'
    );

    if (!losSpaceModifier) {
      losSpaceModifier = await facilityModifiers.getModifier<LOSRateModifier>(
        'length_of_stay'
      );
    }

    if (losSpaceModifier) {
      const daysTotal = DateTime.fromObject(checkOut).diff(
        DateTime.fromObject(checkIn),
        'days'
      ).days;
      let applicable = false;

      switch (losSpaceModifier.condition) {
        case Condition.LT:
          applicable = daysTotal < losSpaceModifier.los;
          break;
        case Condition.LTE:
          applicable = daysTotal <= losSpaceModifier.los;
          break;
        case Condition.EQ:
          applicable = daysTotal === losSpaceModifier.los;
          break;
        case Condition.GTE:
          applicable = daysTotal >= losSpaceModifier.los;
          break;
        case Condition.GT:
          applicable = daysTotal > losSpaceModifier.los;
          break;
        default:
      }

      if (applicable) {
        switch (losSpaceModifier.valueOneof.oneofKind) {
          case 'ratio':
            rate = rate
              .mul(BigNumber.from(losSpaceModifier.valueOneof.ratio.p))
              .div(BigNumber.from(losSpaceModifier.valueOneof.ratio.q));
            break;
          case 'fixed':
            rate = rate.add(BigNumber.from(losSpaceModifier.valueOneof.fixed));
            break;
          default:
        }
      }
    }

    return rate;
  };

  // Apply DayOfWeekRateModifier modifier
  static applyDayOfWeekModifier = async (
    rate: BigNumber,
    { modifiers, facilityModifiers }: QuoteRepositories,
    day: DateTime
  ): Promise<BigNumber> => {
    let dowSpaceModifier: null | DayOfWeekRateModifier;

    dowSpaceModifier = await modifiers.getModifier<DayOfWeekRateModifier>(
      'day_of_week'
    );

    if (!dowSpaceModifier) {
      dowSpaceModifier =
        await facilityModifiers.getModifier<DayOfWeekRateModifier>(
          'day_of_week'
        );
    }

    if (dowSpaceModifier) {
      const modifier = dowSpaceModifier[
        day.weekdayShort.toLocaleLowerCase()
      ] as DayOfWeekRateModifierElement;

      if (modifier) {
        switch (modifier.valueOneof.oneofKind) {
          case 'ratio':
            rate = rate
              .mul(BigNumber.from(modifier.valueOneof.ratio.p))
              .div(BigNumber.from(modifier.valueOneof.ratio.q));
            break;
          case 'fixed':
            rate = rate.add(BigNumber.from(modifier.valueOneof.fixed));
            break;
          default:
        }
      }
    }

    return rate;
  };

  // Apply OccupancyRateModifier modifier
  static applyOccupancyModifier = async (
    rate: BigNumber,
    { modifiers, facilityModifiers }: QuoteRepositories,
    numPaxAdult: number,
    numPaxChild?: number
  ): Promise<BigNumber> => {
    let occupancySpaceModifier: null | OccupancyRateModifier;

    occupancySpaceModifier = await modifiers.getModifier<OccupancyRateModifier>(
      'occupancy'
    );

    if (!occupancySpaceModifier) {
      occupancySpaceModifier =
        await facilityModifiers.getModifier<OccupancyRateModifier>('occupancy');
    }

    if (occupancySpaceModifier) {
      const totalNumberOccupants = (numPaxAdult || 1) + (numPaxChild || 0);

      switch (occupancySpaceModifier.valueOneof.oneofKind) {
        case 'ratio':
          rate = rate.add(
            BigNumber.from(totalNumberOccupants)
              .sub(BigNumber.from(1))
              .mul(
                rate
                  .mul(
                    BigNumber.from(occupancySpaceModifier.valueOneof.ratio.p)
                  )
                  .div(
                    BigNumber.from(occupancySpaceModifier.valueOneof.ratio.q)
                  )
                  .sub(rate)
              )
          );
          break;
        case 'fixed':
          rate = rate.add(
            BigNumber.from(totalNumberOccupants)
              .sub(BigNumber.from(1))
              .mul(BigNumber.from(occupancySpaceModifier.valueOneof.fixed))
          );
          break;
        default:
      }
    }

    return rate;
  };

  // Returns a quote for the Ask
  public quote = async (
    facilityId: string,
    spaceId: string,
    ask: Ask
  ): Promise<BigNumber> => {
    if (!ask.checkIn) {
      throw new Error('Invalid checkIn date');
    }

    if (!ask.checkOut) {
      throw new Error('Invalid checkOut date');
    }

    const repositories: QuoteRepositories = {
      rates: new SpaceRateRepository(facilityId, spaceId),
      modifiers: new SpaceModifierRepository(facilityId, spaceId),
      facilityModifiers: new FacilityModifierRepository(facilityId)
    };
    let total = BigNumber.from(0);

    // Iterate through days from ask.checkIn to ask.checkOut
    for await (const value of this.getQuoteIterator(repositories, ask)) {
      total = total.add(value);
    }

    // Apply length_of_stay modifier, in order of priority
    total = await QuoteService.applyLosRateModifier(
      total,
      repositories,
      ask.checkIn as Date,
      ask.checkOut as Date
    );

    return total;
  };

  // Iterates through days from checkIn to checkOut
  public getQuoteIterator = (repositories: QuoteRepositories, ask: Ask) => ({
    [Symbol.asyncIterator]() {
      const end = DateTime.fromObject(ask.checkOut as Date);
      let days = 0;

      return {
        next: async () => {
          const day = DateTime.fromObject(ask.checkIn as Date).plus({
            days: days++
          });

          // Get the ‘base’ rate, in order of priority
          let adjustedRate = await QuoteService.getBaseRate(repositories, day);

          // Apply day_of_week modifier, in order of priority
          adjustedRate = await QuoteService.applyDayOfWeekModifier(
            adjustedRate,
            repositories,
            day
          );

          // Apply occupancy modifier, in order of priority
          adjustedRate = await QuoteService.applyOccupancyModifier(
            adjustedRate,
            repositories,
            ask.numPaxAdult,
            ask.numPaxChild
          );

          return {
            value: adjustedRate,
            done: day >= end
          };
        }
      };
    }
  });
}

export default new QuoteService();
