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
import { Rules, RulesItemKey } from './DBService';
import ApiError from '../exceptions/ApiError';
import {
  checkAvailableDates,
  convertDaysToSeconds,
  getAskDates,
  getFacilityCheckInTime,
  getFacilityTimezone
} from '../utils';

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

    this.checkInTime = getFacilityCheckInTime(this.facility);

    const spaces = await facilityRepository.getFacilityKey(
      this.facilityId,
      'items'
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
            const metadata = Space.fromBinary(
              new Uint8Array(Object.values(space.payload))
            );
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

    const dates = getAskDates(
      this.ask,
      this.checkInTime,
      getFacilityTimezone(this.facility)
    );

    if (!dates.length) return [];

    for (const i of spaces) {
      const space = i.metadata as Space;

      //check rules
      if (!(await this.checkRules(dates, i.id))) {
        continue;
      }

      //check space capacity
      if (!this.checkSuitableQuantity(space)) {
        continue;
      }

      //check dates is available
      if (await checkAvailableDates(this.facilityId, i.id, this.ask, dates)) {
        needed.add(i.id);
      }
    }

    return Array.from(needed);
  }

  private async checkRules(
    dates: DateTime[],
    spaceId: string
  ): Promise<boolean> {
    const itemRuleRepository = new ItemRuleRepository(this.facilityId, spaceId);

    const noticeRequirementRule = await this.getRule<NoticeRequiredRule>(
      'notice_required',
      itemRuleRepository
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
      itemRuleRepository,
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
    itemRuleRepository: ItemRuleRepository,
    weekDay: null | string = null
  ): Promise<T | null> {
    let rule = await itemRuleRepository.getRule<T>(ruleName);

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
}
