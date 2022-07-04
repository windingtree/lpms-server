import { FormattedDate } from './DBService';
import { SpaceStubRepository } from '../repositories/SpaceStubRepository';
import { StubRepository } from '../repositories/StubRepository';
import { StubStorage } from '../proto/lpms';
import { FacilityRepository } from '../repositories/FacilityRepository';
import { Facility } from '../proto/facility';
import {
  checkAvailableDates,
  getAskDates,
  getFacilityCheckInTime,
  getFacilityTimezone
} from '../utils';
import log from './LogService';
import bidRepository from '../repositories/BidRepository';

export class StubService {
  public async getFacilityStubs(facilityId: string, index = 0, perPage = 10) {
    const facilityRepository = new FacilityRepository();

    let ids = (await facilityRepository.getFacilityKey(
      facilityId,
      'stubs'
    )) as string[];

    const lastPage = Math.ceil(ids.length / perPage);
    ids = ids.slice(index * perPage, (index + 1) * perPage);
    const stubs = await StubService.getStubsByIds(facilityId, ids);

    return {
      stubs,
      lastPage
    };
  }

  public async getFacilityStubsByDate(facilityId: string, date: FormattedDate) {
    const facilityStubRepository = new StubRepository(facilityId);

    const ids = await facilityStubRepository.getIndex(date);

    return await StubService.getStubsByIds(facilityId, ids);
  }

  public async getSpaceStubsByDate(
    facilityId: string,
    itemId: string,
    date: FormattedDate
  ) {
    const spaceStubRepository = new SpaceStubRepository(facilityId, itemId);

    const ids = await spaceStubRepository.getIndex(date);

    return await StubService.getStubsByIds(facilityId, ids);
  }

  private static async getStubsByIds(
    facilityId,
    ids: string[]
  ): Promise<StubStorage[]> {
    const facilityStubRepository = new StubRepository(facilityId);
    const stubs = new Set<StubStorage>();

    for (const id of ids) {
      const stub = await facilityStubRepository.getStub(id);

      if (stub) {
        stubs.add(stub as StubStorage);
      }
    }

    return Array.from(stubs);
  }

  //abstract
  public async setStub(
    facilityId: string,
    stubId: string,
    bidHash: string,
    stubStorage: StubStorage
  ): Promise<void> {
    const facilityRepository = new FacilityRepository();
    const facilityStubRepository = new StubRepository(facilityId);
    const stub = await facilityStubRepository.getStub(stubId);

    const facilityIds = await facilityRepository.getAllFacilityIds();

    if (!facilityIds.includes(facilityId)) {
      //facility not exist
      return;
    }

    const bid = await bidRepository.getBid(facilityId, bidHash);
    if (stub) {
      log.red('Stub already exist');

      return;
    }

    if (!bid || !bid.ask) {
      //todo call done method from smart-contract and revert transaction

      log.red('bid not exist');

      return;
    }

    const spaceStubRepository = new SpaceStubRepository(
      facilityId,
      bid.spaceId
    );

    const facility = (await facilityRepository.getFacilityKey(
      facilityId,
      'metadata'
    )) as Facility;

    const dates = getAskDates(
      bid.ask,
      getFacilityCheckInTime(facility),
      getFacilityTimezone(facility)
    );

    if (!(await checkAvailableDates(facilityId, bid.spaceId, bid.ask, dates))) {
      //todo call done method from smart-contract and revert transaction

      log.red(
        'between the request and the booking someone has already booked the last space'
      );

      return;
    }

    await facilityStubRepository.addToFacilityIndex(stubId);
    await facilityStubRepository.setStub(stubId, stubStorage);

    for (const date of dates) {
      const formattedDate = date.toFormat('yyyy-MM-dd') as FormattedDate;
      await facilityStubRepository.addToIndex(formattedDate, stubId);
      await spaceStubRepository.addToIndex(formattedDate, stubId);

      const numBooked = await spaceStubRepository.getNumBookedByDate(
        `${formattedDate}-num_booked`
      );

      await spaceStubRepository.setNumBookedByDate(
        `${formattedDate}-num_booked`,
        numBooked + 1
      );
    }
  }
}

export default new StubService();
