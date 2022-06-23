import { Ask } from '../proto/ask';
import facilityRepository, {
  FacilityRepository
} from '../repositories/FacilityRepository';
import { Facility, Item, Space } from '../proto/facility';
import { DateTime, Interval } from 'luxon';
import {
  FacilityRuleRepository,
  ItemRuleRepository
} from '../repositories/RuleRepository';
import { DayOfWeekLOSRule, NoticeRequiredRule } from '../proto/lpms';
import { FormattedDate, Rules, RulesItemKey } from './DBService';
import { SpaceAvailabilityRepository } from '../repositories/SpaceAvailabilityRepository';
import { SpaceStubRepository } from '../repositories/SpaceStubRepository';
import ApiError from '../exceptions/ApiError';
import { convertDaysToSeconds } from '../utils';

export class SearchService {
  protected facilityRuleRepository: FacilityRuleRepository;
  protected facilityId: string;
  protected ask: Ask;
  protected facilityRepository: FacilityRepository;
  protected facility: Facility;
  private checkInTime: string;

  constructor(facilityId: string, ask: Ask) {
    this.facilityRuleRepository = new FacilityRuleRepository(facilityId);
    this.facilityRepository = new FacilityRepository();
    this.facilityId = facilityId;
    this.ask = ask;
  }

  public search = async (): Promise<string[]> => {
    this.facility = (await this.facilityRepository.getFacilityKey(
      this.facilityId,
      'metadata'
    )) as Facility;

    this.checkInTime =
      this.facility.policies?.checkInTimeOneof.oneofKind === 'checkInTime'
        ? this.facility.policies.checkInTimeOneof.checkInTime
        : '1500'; //todo think about default checkin time

    const spaces = await facilityRepository.getFacilityKey(
      this.facilityId,
      'spaces'
    );

    if (Array.isArray(spaces)) {
      const set = new Set<{ metadata: Space; id: string }>();

      for (const v of spaces) {
        const space = await facilityRepository.getItemKey<Item>(
          this.facilityId,
          'items',
          v,
          'metadata'
        );

        if (space === null || !space.payload) {
          throw ApiError.NotFound(`Unable to find "metadata" for space: ${v}`);
        } else {
          try {
            const metadata = Space.fromBinary(space.payload);
            set.add({ metadata, id: v });
          } catch (e) {
            throw ApiError.BadRequest(`Corrupt "metadata" for space: ${v}`);
          }
        }
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

    const checkIn = DateTime.fromFormat(this.checkInTime, 'hhmm', {
      zone: this.facility.policies?.timezone
    }).setZone('utc');

    let from = DateTime.fromObject(
      {
        ...this.ask.checkIn,
        hour: checkIn.hour,
        minute: checkIn.minute
      },
      { zone: 'utc' }
    );
    const to = DateTime.fromObject(
      {
        ...this.ask.checkOut,
        hour: checkIn.hour,
        minute: checkIn.minute
      },
      { zone: 'utc' }
    );

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
    const spaceRuleRepository = new ItemRuleRepository(
      this.facilityId,
      spaceId
    );

    const noticeRequirementRule = await this.getRule<NoticeRequiredRule>(
      'notice_required',
      spaceRuleRepository
    );

    const checkIn = dates[0];

    const now = DateTime.now().setZone('utc');
    const interval = Interval.fromDateTimes(now, checkIn).toDuration(['days']);

    const intervalSeconds = convertDaysToSeconds(interval.get('days'));

    if (
      noticeRequirementRule &&
      noticeRequirementRule.value > intervalSeconds
    ) {
      return false;
    }

    const formattedCheckInDay = checkIn.toFormat('ccc').toLowerCase();
    const lOSRule = await this.getRule<DayOfWeekLOSRule>(
      'length_of_stay',
      spaceRuleRepository,
      formattedCheckInDay
    );

    const lOS = dates.length;
    let minLOS = 0;
    let maxLOS = 0;

    if (lOSRule) {
      try {
        minLOS = lOSRule[formattedCheckInDay]?.minLengthOfStay || 0;
      } catch (e) {
        //rule not exist
      }

      try {
        maxLOS = lOSRule[formattedCheckInDay]?.maxLengthOfStay || 0;
      } catch (e) {
        //rule not exist
      }
    }

    return lOS > minLOS && lOS < maxLOS;
  }

  private async getRule<T extends Rules>(
    ruleName: RulesItemKey,
    spaceRuleRepository: ItemRuleRepository,
    weekDay: null | string = null
  ): Promise<T | null> {
    let rule = await spaceRuleRepository.getRule<T>(ruleName);

    if (!rule || (weekDay && !(weekDay in rule))) {
      rule = await this.facilityRuleRepository.getRule<T>(ruleName);
    }

    return rule;
  }

  private checkSuitableQuantity(space: Space) {
    const maxNumOfAdults =
      space.maxNumberOfAdultOccupantsOneof.oneofKind ===
      'maxNumberOfAdultOccupants'
        ? space.maxNumberOfAdultOccupantsOneof.maxNumberOfAdultOccupants
        : 0;

    const maxNumOfChildren =
      space.maxNumberOfChildOccupantsOneof.oneofKind ===
      'maxNumberOfChildOccupants'
        ? space.maxNumberOfChildOccupantsOneof.maxNumberOfChildOccupants
        : 0;

    const guestCheck = maxNumOfAdults - this.ask.numPaxAdult;

    if (guestCheck < 0) {
      return false;
    }

    //if there is a place left from an adult, we give it to a child
    const childrenCheck =
      maxNumOfChildren + guestCheck - (this.ask.numPaxChild || 0);

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

        if (!available) {
          available = defaultAvailable;
        }

        if (!available) {
          return false;
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
