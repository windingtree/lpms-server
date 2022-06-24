import {
  FacilityRuleRepository,
  ItemRuleRepository
} from '../src/repositories/RuleRepository';
import { FacilityRepository } from '../src/repositories/FacilityRepository';
import { SpaceAvailabilityRepository } from '../src/repositories/SpaceAvailabilityRepository';
import { SpaceStubRepository } from '../src/repositories/SpaceStubRepository';
import { Ask } from '../src/proto/ask';
import { DateTime } from 'luxon';
import { expect } from 'chai';
import { SearchService } from '../src/services/SearchService';
import { DayOfWeekLOSRule } from '../src/proto/lpms';
import { FormattedDate } from '../src/services/DBService';
import { convertDaysToSeconds } from '../src/utils';
import { facility, space } from './common';
import { Item, Space } from '../src/proto/facility';

describe('search service test', async () => {
  const facilityId =
    '0x1234567890123456789012345678901234567890123456789012345678901222';
  const spaceId =
    '0x1234567890123456789012345678901234567890123456789012345678901233';
  const spaceId2 =
    '0x1234567890123456789012345678901234567890123456789012345678901244';
  const facilityRepo = new FacilityRepository();
  const facilityRuleRepository = new FacilityRuleRepository(facilityId);
  const spaceRuleRepository = new ItemRuleRepository(facilityId, spaceId);
  const spaceAvailabilityRepository = new SpaceAvailabilityRepository(
    facilityId,
    spaceId
  );
  const spaceAvailabilityRepository2 = new SpaceAvailabilityRepository(
    facilityId,
    spaceId2
  );
  const spaceStubRepository = new SpaceStubRepository(facilityId, spaceId);
  const fromDate = DateTime.now().plus({ days: 1 });
  const toDate = DateTime.now().plus({ days: 8 });
  const formattedDate = fromDate.toFormat('yyyy-MM-dd') as FormattedDate;

  before(async () => {
    await facilityRepo.setFacilityKey(facilityId, 'metadata', facility);
    const { name, description, photos, type } = space;

    const item: Item = {
      name,
      description,
      photos,
      type,
      payload: Space.toBinary(space.payload)
    };

    await facilityRepo.addToIndex(facilityId, 'spaces', spaceId);
    await facilityRepo.setItemKey(
      facilityId,
      'items',
      spaceId,
      'metadata',
      item
    );

    const spaceMetadata = space.payload;

    spaceMetadata.maxNumberOfAdultOccupantsOneof = {
      oneofKind: 'maxNumberOfAdultOccupants',
      maxNumberOfAdultOccupants: 1
    };
    spaceMetadata.maxNumberOfChildOccupantsOneof = {
      oneofKind: 'maxNumberOfChildOccupants',
      maxNumberOfChildOccupants: 0
    };

    const item2: Item = {
      name,
      description,
      photos,
      type,
      payload: Space.toBinary(spaceMetadata)
    };

    await facilityRepo.addToIndex(facilityId, 'spaces', spaceId2);
    await facilityRepo.setItemKey(
      facilityId,
      'items',
      spaceId2,
      'metadata',
      item2
    );
  });

  beforeEach(async () => {
    await spaceAvailabilityRepository.setAvailabilityDefault({
      numSpaces: 10
    });
    await spaceAvailabilityRepository2.setAvailabilityDefault({
      numSpaces: 10
    });

    const rule: DayOfWeekLOSRule = {};
    rule[fromDate.toFormat('ccc').toLowerCase()] = {
      minLengthOfStay: 1,
      maxLengthOfStay: 30
    };

    await facilityRuleRepository.setRule('notice_required', {
      value: 0
    });

    await facilityRuleRepository.setRule('length_of_stay', rule);

    await spaceRuleRepository.setRule('notice_required', {
      value: 0
    });

    await spaceRuleRepository.setRule('length_of_stay', rule);

    await spaceStubRepository.setNumBookedByDate(
      `${formattedDate}-num_booked`,
      0
    );
  });

  function getAsk(): Ask {
    return {
      checkIn: {
        year: fromDate.year,
        month: fromDate.month,
        day: fromDate.day
      },
      checkOut: {
        year: toDate.year,
        month: toDate.month,
        day: toDate.day
      },
      numPaxAdult: 1,
      numPaxChild: 0,
      numSpacesReq: 1
    };
  }

  it('check search', async () => {
    const search = new SearchService(facilityId, getAsk());
    const result = await search.search();

    expect(result).to.be.an('array');
    expect(result.length).to.be.equal(2);
  });

  it('check search 2 adults', async () => {
    const ask = getAsk();
    ask.numPaxAdult = 2;
    const search = new SearchService(facilityId, ask);
    const result = await search.search();

    expect(result).to.be.an('array');
    expect(result.length).to.be.equal(1);
  });

  it('check search 2 adults + 2 children', async () => {
    const ask = getAsk();
    ask.numPaxAdult = 2;
    ask.numPaxChild = 2;
    const search = new SearchService(facilityId, ask);
    const result = await search.search();

    expect(result).to.be.an('array');
    expect(result.length).to.be.equal(1);
  });

  it('check search 3 adults ', async () => {
    const ask = getAsk();
    ask.numPaxAdult = 3;
    const search = new SearchService(facilityId, ask);
    const result = await search.search();

    expect(result).to.be.an('array');
    expect(result.length).to.be.equal(0);
  });

  it('change min day rule', async () => {
    const rule: DayOfWeekLOSRule = {};
    rule[fromDate.toFormat('ccc').toLowerCase()] = {
      minLengthOfStay: 10,
      maxLengthOfStay: 30
    };

    await spaceRuleRepository.setRule('length_of_stay', rule);
    await facilityRuleRepository.setRule('length_of_stay', rule);

    const ask = getAsk();
    const search = new SearchService(facilityId, ask);
    const result = await search.search();

    expect(result).to.be.an('array');
    expect(result.length).to.be.equal(0);
  });

  it('change max day rule', async () => {
    const rule: DayOfWeekLOSRule = {};
    rule[fromDate.toFormat('ccc').toLowerCase()] = {
      minLengthOfStay: 1,
      maxLengthOfStay: 5
    };

    await spaceRuleRepository.setRule('length_of_stay', rule);
    await facilityRuleRepository.setRule('length_of_stay', rule);

    const ask = getAsk();
    const search = new SearchService(facilityId, ask);
    const result = await search.search();

    expect(result).to.be.an('array');
    expect(result.length).to.be.equal(0);
  });

  it('change notice_required rule', async () => {
    await spaceRuleRepository.setRule('notice_required', {
      value: convertDaysToSeconds(2)
    });

    await facilityRuleRepository.setRule('notice_required', {
      value: convertDaysToSeconds(2)
    });

    const ask = getAsk();
    const search = new SearchService(facilityId, ask);
    const result = await search.search();

    expect(result).to.be.an('array');
    expect(result.length).to.be.equal(0);
  });

  it('change num booked', async () => {
    await spaceStubRepository.setNumBookedByDate(
      `${formattedDate}-num_booked`,
      10
    );

    const ask = getAsk();
    const search = new SearchService(facilityId, ask);
    const result = await search.search();

    expect(result).to.be.an('array');
    expect(result.length).to.be.equal(1);
  });

  it('delete all data', async () => {
    await facilityRepo.delFacilityKey(facilityId, 'metadata');
    await facilityRepo.delFromIndex(facilityId, 'spaces', spaceId);
    await facilityRepo.delFromIndex(facilityId, 'spaces', spaceId2);
    await facilityRepo.delItemKey(facilityId, 'items', spaceId, 'metadata');
    await facilityRepo.delItemKey(facilityId, 'items', spaceId2, 'metadata');

    await spaceAvailabilityRepository.delAvailability('default');
    await spaceAvailabilityRepository2.delAvailability('default');

    await facilityRuleRepository.delRule('notice_required');
    await facilityRuleRepository.delRule('length_of_stay');
    await spaceRuleRepository.delRule('notice_required');
    await spaceRuleRepository.delRule('length_of_stay');

    await spaceStubRepository.delNumBookedByDate(`${formattedDate}-num_booked`);
  });
});
