import { BigNumber } from 'ethers';
import { DateTime } from 'luxon';
import { FormattedDate } from './DBService';
import { Ask } from '../proto/ask';
import { Date } from '../proto/date';
import {
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
  ratesRepository: SpaceRateRepository;
  spaceModifiersRepository: SpaceModifierRepository;
  facilityModifierRepository: FacilityModifierRepository;
}

export class QuoteService {
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
      ratesRepository: new SpaceRateRepository(facilityId, spaceId),
      spaceModifiersRepository: new SpaceModifierRepository(
        facilityId,
        spaceId
      ),
      facilityModifierRepository: new FacilityModifierRepository(facilityId)
    };
    let total = BigNumber.from(0);

    // Iterate through days from ask.checkIn to ask.checkOut
    for await (const value of this.getQuoteIterator(
      repositories,
      ask.checkIn,
      ask.checkOut
    )) {
      total = total.add(value);
    }

    // Apply length_of_stay modifier, in order of priority
    let losSpaceModifier: undefined | LOSRateModifier;

    try {
      losSpaceModifier =
        (await repositories.spaceModifiersRepository.getModifier(
          'length_of_stay'
        )) as LOSRateModifier;
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }

      try {
        losSpaceModifier =
          (await repositories.facilityModifierRepository.getModifier(
            'length_of_stay'
          )) as LOSRateModifier;
      } catch (e) {
        if (e.status !== 404) {
          throw e;
        }
      }
    }

    if (losSpaceModifier) {
      const daysTotal = DateTime.fromObject(ask.checkOut).diff(
        DateTime.fromObject(ask.checkIn)
      ).days;
      let applicable = false;

      switch (losSpaceModifier.condition) {
        case 0:
          applicable = daysTotal < losSpaceModifier.los;
          break;
        case 1:
          applicable = daysTotal <= losSpaceModifier.los;
          break;
        case 2:
          applicable = daysTotal === losSpaceModifier.los;
          break;
        case 3:
          applicable = daysTotal >= losSpaceModifier.los;
          break;
        case 4:
          applicable = daysTotal > losSpaceModifier.los;
          break;
        default:
      }

      if (applicable) {
        switch (losSpaceModifier.valueOneof.oneofKind) {
          case 'ratio':
            total = total
              .mul(BigNumber.from(losSpaceModifier.valueOneof.ratio.p))
              .div(BigNumber.from(losSpaceModifier.valueOneof.ratio.q));
            break;
          case 'fixed':
            total = BigNumber.from(losSpaceModifier.valueOneof.fixed);
            break;
          default:
        }
      }
    }

    return total;
  };

  // Iterates through days from checkIn to checkOut
  public getQuoteIterator = (
    {
      ratesRepository,
      spaceModifiersRepository,
      facilityModifierRepository
    }: QuoteRepositories,
    checkIn: Date,
    checkOut: Date
  ) => ({
    [Symbol.asyncIterator]() {
      const end = DateTime.fromObject(checkOut);
      let days = 0;

      return {
        next: async () => {
          const day = DateTime.fromObject(checkIn).plus({ days: days++ });

          // Get the ‘base’ rate, in order of priority
          let baseRate: Rates | null;

          try {
            baseRate = await ratesRepository.getRate(
              day.toFormat('yyyy-MM-dd') as FormattedDate
            );
          } catch (e) {
            if (e.status !== 404) {
              throw e;
            }

            baseRate = await ratesRepository.getRate('default');
          }

          if (!baseRate) {
            throw new Error('Unable to get base rate for the space');
          }

          // Base price value
          let value = BigNumber.from(baseRate.cost);

          // Apply day_of_week modifier, in order of priority
          let dowSpaceModifier: undefined | DayOfWeekRateModifier;

          try {
            dowSpaceModifier = (await spaceModifiersRepository.getModifier(
              'day_of_week'
            )) as DayOfWeekRateModifier;
          } catch (e) {
            if (e.status !== 404) {
              throw e;
            }

            try {
              dowSpaceModifier = (await facilityModifierRepository.getModifier(
                'day_of_week'
              )) as DayOfWeekRateModifier;
            } catch (e) {
              if (e.status !== 404) {
                throw e;
              }
            }
          }

          if (dowSpaceModifier) {
            const modifier = dowSpaceModifier[
              day.weekdayShort.toLocaleLowerCase()
            ] as DayOfWeekRateModifierElement;

            if (modifier) {
              switch (modifier.valueOneof.oneofKind) {
                case 'ratio':
                  value = value
                    .mul(BigNumber.from(modifier.valueOneof.ratio.p))
                    .div(BigNumber.from(modifier.valueOneof.ratio.q));
                  break;
                case 'fixed':
                  value = BigNumber.from(modifier.valueOneof.fixed);
                  break;
                default:
              }
            }
          }

          // Apply occupancy modifier, in order of priority
          // let occupancySpaceModifier: undefined | OccupancyRateModifier;

          // try {
          //   occupancySpaceModifier = await spaceModifiersRepository.getModifier('occupancy') as OccupancyRateModifier;
          // } catch (e) {
          //   if (e.status !== 404) {
          //     throw e;
          //   }

          //   try {
          //     occupancySpaceModifier = await facilityModifierRepository.getModifier('occupancy') as OccupancyRateModifier;
          //   } catch (e) {
          //     if (e.status !== 404) {
          //       throw e;
          //     }
          //   }
          // }

          // if (occupancySpaceModifier) {}

          return {
            value,
            done: day >= end
          };
        }
      };
    }
  });
}

export default new QuoteService();
