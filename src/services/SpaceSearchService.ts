import { DateTime } from 'luxon';
import { Ask } from 'src/proto/ask';
import { Space } from '../proto/facility';
import { FormattedDate } from './DBService';
import { SpaceAvailabilityRepository } from '../repositories/SpaceAvailabilityRepository';
import facilityRepository from '../repositories/FacilityRepository';

export default class SpaceSearchService {
  public static async check(ask: Ask, facilityId: string): Promise<Space[]> {
    const spacesIds = await facilityRepository.getFacilityKey(
      facilityId,
      'spaces'
    );

    if (Array.isArray(spacesIds)) {
      const set = new Set();

      for (const v of spacesIds) {
        const space = await facilityRepository.getItemKey(
          facilityId,
          'spaces',
          v,
          'metadata'
        );
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
      await availabilityRepository.getSpaceAvailability('default');

    let from = DateTime.fromObject(checkIn);
    const to = DateTime.fromObject(checkOut);

    while (from <= to) {
      try {
        const dailyBooks =
          await availabilityRepository.getSpaceAvailability(
            from.toFormat('yyyy-MM-dd') as FormattedDate
          );

        throw('To be implemented')
        // In order to determine if there is space availability, a routine would have to:
        // Get total number of spaces, with *per-day override* having higher priority than
        // default. This will be the 'capacity' - ie. HOW MANY OF THOSE SPACE TYPES ARE
        // PRESENT FOR THE POINT OF CONSIDERING IF THEY CAN BE STAYED IN.
        // Then get the number of that space type that are booked. This means get the 
        // facilityId.spaceId.stubs sublevel and get the YYYY-MM-DD-num_booked key
        // this would be the number of daily booked.
        // if the total number of spaces - booked spaces < spacesRequired, true false
        if (defaultAvailable.numSpaces - dailyBooks.numSpaces < spacesRequired) {
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
