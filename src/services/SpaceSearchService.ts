import { DateTime } from 'luxon';
import { Ask } from 'src/proto/ask';
import { Space } from '../proto/facility';
import DBService, { AvailabilityDate } from './DBService';
import { SpaceAvailabilityRepository } from '../repositories/SpaceAvailabilityRepository';

export default class SpaceSearchService {
  static dbService = DBService.getInstance();

  public static async check(ask: Ask, facilityId: string): Promise<Space[]> {
    const facilityDB =
      SpaceSearchService.dbService.getFacilitySublevelDB(facilityId);
    let spacesIds;

    try {
      spacesIds = await facilityDB.get('spaces');
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
      return []; //todo throw error?
    }

    if (Array.isArray(spacesIds)) {
      const set = new Set();

      for (const v of spacesIds) {
        const spaceDB = SpaceSearchService.dbService.getFacilityItemDB(
          facilityId,
          'spaces',
          v
        );
        const space = await spaceDB.get('metadata');
        set.add({ space, id: v });
      }

      return SpaceSearchService.findSpaces(Array.from(set), ask, facilityId);
    }

    return [];
  }

  private static async findSpaces(spaces, ask, facilityId): Promise<Space[]> {
    const needed = new Set<Space>();

    for (const i of spaces) {
      const space = i.space as Space;
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

      //check space capacity
      if (
        !SpaceSearchService.checkSuitableQuantity(
          numOfAdults,
          numOfChildren,
          ask.numPaxAdult,
          ask.numPaxChild
        )
      ) {
        continue;
      }

      //check dates is available
      if (
        await SpaceSearchService.checkAvailableDates(
          i.id,
          facilityId,
          ask.checkIn,
          ask.checkOut,
          ask.numSpacesReq
        )
      ) {
        needed.add(space);
      }
    }

    return Array.from(needed);
  }

  private static checkSuitableQuantity(
    spaceGuestsCount,
    spaceChildrenCount,
    guestCount,
    childrenCount
  ) {
    const guestCheck = spaceGuestsCount - guestCount;

    if (guestCheck < 0) {
      return false;
    }
    //if there is a place left from an adult, we give it to a child
    const childrenCheck = spaceChildrenCount + guestCheck - childrenCount;

    if (childrenCheck < 0) {
      return false;
    }

    //its coefficient for the future so that we can offer multiple rooms for a large group (available for discussion)
    // const check2 = spaceGuestsCount - guestCount + childrenCount > 0
    //   ? (spaceGuestsCount + spaceChildrenCount) / (spaceGuestsCount - guestCount + childrenCount)
    //   : 0;

    return true;
  }

  private static async checkAvailableDates(
    spaceId,
    facilityId,
    checkIn,
    checkOut,
    spacesRequired
  ) {
    const availabilityRepository = new SpaceAvailabilityRepository(
      facilityId,
      spaceId
    );

    const defaultAvailable =
      await availabilityRepository.getSpaceAvailabilityNumSpaces('default');

    let from = DateTime.fromObject(checkIn);
    const to = DateTime.fromObject(checkOut);

    while (from <= to) {
      try {
        const dailyBooks =
          await availabilityRepository.getSpaceAvailabilityNumSpaces(
            from.toFormat('yyyy-MM-dd') as AvailabilityDate
          );

        if (defaultAvailable - dailyBooks < spacesRequired) {
          return false;
        }
      } catch (e) {
        if (e.status !== 404) {
          throw e;
        }
        //room is available on this date
      }

      from = from.plus({ days: 1 });
    }

    return true;
  }
}
