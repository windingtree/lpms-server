import { Ask } from '../proto/ask';
import facilityRepository from '../repositories/FacilityRepository';
import { Space } from '../proto/facility';
import { DateTime, Interval } from 'luxon';
import {
  FacilityRuleRepository,
  SpaceRuleRepository
} from '../repositories/RuleRepository';
import { DayOfWeekLOSRule, NoticeRequiredRule } from '../proto/lpms';
import { FormattedDate, RulesItemKey } from './DBService';
import { SpaceAvailabilityRepository } from '../repositories/SpaceAvailabilityRepository';
import { SpaceStubRepository } from '../repositories/SpaceStubRepository';
import ApiError from '../exceptions/ApiError';
import { getSecondsFromDays } from '../utils';

export class SearchService {
  protected facilityRuleRepository: FacilityRuleRepository;
  protected facilityId: string;
  protected ask: Ask;

  constructor(facilityId: string, ask: Ask) {
    this.facilityRuleRepository = new FacilityRuleRepository(facilityId);
    this.facilityId = facilityId;
    this.ask = ask;
  }

  public search = async (): Promise<string[]> => {
    const spacesIds = await facilityRepository.getFacilityKey(
      this.facilityId,
      'spaces'
    );

    if (Array.isArray(spacesIds)) {
      const set = new Set();

      for (const v of spacesIds) {
        const space = await facilityRepository.getItemKey(
          this.facilityId,
          'spaces',
          v,
          'metadata'
        );
        set.add({ space, id: v });
      }

      return this.findSpaces(Array.from(set));
    }

    return [];
  };

  private async findSpaces(spaces): Promise<string[]> {
    const needed = new Set<string>();

    const dates = this.getAskDates();
    if (!dates.length) return [];

    for (const i of spaces) {
      const space = i.space as Space;

      //check rules
      if (!(await this.checkRules(dates, i.id))) {
        continue;
      }

      //check space capacity
      if (!this.checkSuitableQuantity(space)) {
        continue;
      }

      //check dates is available
      if (await this.checkAvailableDates(i.id, dates)) {
        needed.add(i.id);
      }
    }

    return Array.from(needed);
  }

  private getAskDates(): DateTime[] {
    if (!this.ask.checkIn || !this.ask.checkOut) {
      throw ApiError.BadRequest('invalid dates in ask');
    }

    let from = DateTime.fromObject(this.ask.checkIn, { zone: 'utc' });
    const to = DateTime.fromObject(this.ask.checkOut, { zone: 'utc' });
    const dates: DateTime[] = [];

    while (from <= to) {
      dates.push(from);
      from = from.plus({ days: 1 });
    }

    return dates;
  }

  private async checkRules(
    dates: DateTime[],
    spaceId: string
  ): Promise<boolean> {
    const spaceRuleRepository = new SpaceRuleRepository(
      this.facilityId,
      spaceId
    );

    const noticeRequirementRule = (await this.getRule(
      'notice_required',
      spaceRuleRepository
    )) as NoticeRequiredRule;

    const firstDay = dates[0];

    const today = DateTime.now().setZone('utc');
    const interval = Interval.fromDateTimes(today, firstDay).toDuration([
      'days'
    ]);

    const ruleSeconds = getSecondsFromDays(noticeRequirementRule.numDays);
    const intervalSeconds = getSecondsFromDays(interval.get('days'));

    if (noticeRequirementRule && ruleSeconds > intervalSeconds) {
      return false;
    }

    const formattedFirstDay = firstDay.toFormat('ccc').toLowerCase();
    const lOSRule = (await this.getRule(
      'length_of_stay',
      spaceRuleRepository,
      formattedFirstDay
    )) as DayOfWeekLOSRule;

    const lOS = dates.length;
    let minLOS = 0;
    let maxLOS = 0;

    try {
      minLOS = lOSRule[formattedFirstDay]?.minLengthOfStay || 0;
    } catch (e) {
      //rule not exist
    }

    try {
      maxLOS = lOSRule[formattedFirstDay]?.maxLengthOfStay || 0;
    } catch (e) {
      //rule not exist
    }

    return (minLOS === 0 || lOS > minLOS) && (maxLOS === 0 || lOS < maxLOS);
  }

  private async getRule(
    ruleName: RulesItemKey,
    spaceRuleRepository: SpaceRuleRepository,
    weekDay: null | string = null
  ) {
    let rule = await spaceRuleRepository.getRule(ruleName);

    if (!rule || (weekDay && !(weekDay in rule))) {
      rule = await this.facilityRuleRepository.getRule(ruleName);
    }

    return rule;
  }

  private checkSuitableQuantity(space: Space) {
    const numOfAdults =
      space.maxNumberOfAdultOccupantsOneof.oneofKind ===
      'maxNumberOfAdultOccupants'
        ? space.maxNumberOfAdultOccupantsOneof.maxNumberOfAdultOccupants
        : 0;

    const numOfChildren =
      space.maxNumberOfChildOccupantsOneof.oneofKind ===
      'maxNumberOfChildOccupants'
        ? space.maxNumberOfChildOccupantsOneof.maxNumberOfChildOccupants
        : 0;

    const guestCheck = numOfAdults - this.ask.numPaxAdult;

    if (guestCheck < 0) {
      return false;
    }

    //if there is a place left from an adult, we give it to a child
    const childrenCheck =
      numOfChildren + guestCheck - (this.ask.numPaxChild || 0);

    if (childrenCheck < 0) {
      return false;
    }

    //its coefficient for the future so that we can offer multiple rooms for a large group (available for discussion)
    // const check2 = spaceGuestsCount - guestCount + childrenCount > 0
    //   ? (spaceGuestsCount + spaceChildrenCount) / (spaceGuestsCount - guestCount + childrenCount)
    //   : 0;

    return true;
  }

  private async checkAvailableDates(spaceId, dates: DateTime[]) {
    const availabilityRepository = new SpaceAvailabilityRepository(
      this.facilityId,
      spaceId
    );

    const spaceStubRepository = new SpaceStubRepository(
      this.facilityId,
      spaceId
    );

    const defaultAvailable = await availabilityRepository.getSpaceAvailability(
      'default'
    );

    for (const date of dates) {
      try {
        const formattedDate = date.toFormat('yyyy-MM-dd') as FormattedDate;

        let available = await availabilityRepository.getSpaceAvailability(
          formattedDate
        );

        if (available.numSpaces === 0) {
          available = defaultAvailable;
        }

        const numBooked = await spaceStubRepository.getNumBookedByDate(
          `${formattedDate}-num_booked`
        );

        if (available.numSpaces - numBooked < this.ask.numSpacesReq) {
          return false;
        }
      } catch (e) {
        if (e.status !== 404) {
          throw e;
        }
        //room is available on this date
      }
    }

    return true;
  }
}
