import {
  FacilityRuleRepository,
  SpaceRuleRepository
} from '../src/repositories/RuleRepository';
import { Exception, Space, SpaceTier } from '../src/proto/facility';
import { ContactType } from '../src/proto/contact';
import { FacilityRepository } from '../src/repositories/FacilityRepository';
import { SpaceAvailabilityRepository } from '../src/repositories/SpaceAvailabilityRepository';
import { SpaceStubRepository } from '../src/repositories/SpaceStubRepository';
import { Ask } from '../src/proto/ask';
import { DateTime } from 'luxon';
import { expect } from 'chai';
import { SearchService } from '../src/services/SearchService';
import { DayOfWeekLOSRule } from '../src/proto/lpms';
import { FormattedDate } from '../src/services/DBService';

describe('search service test', async () => {
  const facilityId = '0x1234567890';
  const spaceId = '0x1234567890';
  const spaceId2 = '0x1234567891';
  const facilityRepo = new FacilityRepository();
  const facilityRuleRepository = new FacilityRuleRepository(facilityId);
  const spaceRuleRepository = new SpaceRuleRepository(facilityId, spaceId);
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

  async function init() {
    const space: Space = {
      uris: [
        {
          uri: 'https://wonderland.somewhere/',
          typeOneof: { oneofKind: 'type', type: ContactType.WORK }
        }
      ],
      maxNumberOfAdultOccupantsOneof: {
        oneofKind: 'maxNumberOfAdultOccupants',
        maxNumberOfAdultOccupants: 2
      },
      maxNumberOfChildOccupantsOneof: {
        oneofKind: 'maxNumberOfChildOccupants',
        maxNumberOfChildOccupants: 2
      },
      maxNumberOfOccupantsOneof: {
        oneofKind: 'maxNumberOfOccupants',
        maxNumberOfOccupants: 2
      },
      privateHomeOneof: { oneofKind: 'privateHome', privateHome: false },
      suiteOneof: { oneofKind: 'suite', suite: false },
      tierOneof: { oneofKind: 'tier', tier: SpaceTier.DEFAULT_STANDARD },
      views: {
        viewOfValleyOneof: { oneofKind: 'viewOfValley', viewOfValley: true },
        viewOfBeachOneof: { oneofKind: 'viewOfBeach', viewOfBeach: false },
        viewOfCityOneof: { oneofKind: 'viewOfCity', viewOfCity: false },
        viewOfGardenOneof: { oneofKind: 'viewOfGarden', viewOfGarden: false },
        viewOfLakeOneof: { oneofKind: 'viewOfLake', viewOfLake: false },
        viewOfLandmarkOneof: {
          oneofKind: 'viewOfLandmark',
          viewOfLandmark: false
        },
        viewOfOceanOneof: { oneofKind: 'viewOfOcean', viewOfOcean: false },
        viewOfPoolOneof: { oneofKind: 'viewOfPool', viewOfPool: false }
      },
      totalLivingAreas: {
        sleeping: {
          numberOfBedsOneof: { oneofKind: 'numberOfBeds', numberOfBeds: 1 },
          kingBedsOneof: { oneofKind: 'kingBeds', kingBeds: 1 },
          queenBedsOneof: {
            oneofKind: 'queenBedsException',
            queenBedsException: Exception.UNSPECIFIED_REASON
          },
          doubleBedsOneof: {
            oneofKind: 'doubleBedsException',
            doubleBedsException: Exception.UNSPECIFIED_REASON
          },
          singleOrTwinBedsOneof: {
            oneofKind: 'singleOrTwinBedsException',
            singleOrTwinBedsException: Exception.UNSPECIFIED_REASON
          },
          bunkBedsOneof: {
            oneofKind: 'bunkBedsException',
            bunkBedsException: Exception.UNSPECIFIED_REASON
          },
          sofaBedsOneof: {
            oneofKind: 'sofaBedsException',
            sofaBedsException: Exception.UNSPECIFIED_REASON
          },
          otherBedsOneof: { oneofKind: 'otherBeds', otherBeds: 0 },
          cribsOneof: { oneofKind: 'cribs', cribs: false },
          cribsAvailableOneof: {
            oneofKind: 'cribsAvailableException',
            cribsAvailableException: Exception.UNSPECIFIED_REASON
          },
          cribCountOneof: {
            oneofKind: 'cribCountException',
            cribCountException: Exception.UNSPECIFIED_REASON
          },
          rollAwayBedsOneof: { oneofKind: 'rollAwayBeds', rollAwayBeds: false },
          rollAwayBedsAvailableOneof: {
            oneofKind: 'rollAwayBedsAvailableException',
            rollAwayBedsAvailableException: Exception.UNSPECIFIED_REASON
          },
          rollAwayBedCountOneof: {
            oneofKind: 'rollAwayBedCountException',
            rollAwayBedCountException: Exception.UNSPECIFIED_REASON
          }
        },
        features: {
          inSpaceWifiAvailableOneof: {
            oneofKind: 'inSpaceWifiAvailable',
            inSpaceWifiAvailable: true
          }
        }
      }
    };

    await facilityRepo.addToIndex(facilityId, 'spaces', spaceId);
    await facilityRepo.setItemKey(
      facilityId,
      'spaces',
      spaceId,
      'metadata',
      space
    );

    space.maxNumberOfAdultOccupantsOneof = {
      oneofKind: 'maxNumberOfAdultOccupants',
      maxNumberOfAdultOccupants: 1
    };
    space.maxNumberOfChildOccupantsOneof = {
      oneofKind: 'maxNumberOfChildOccupants',
      maxNumberOfChildOccupants: 0
    };

    await facilityRepo.addToIndex(facilityId, 'spaces', spaceId2);
    await facilityRepo.setItemKey(
      facilityId,
      'spaces',
      spaceId2,
      'metadata',
      space
    );

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
      numDays: 0
    });

    await facilityRuleRepository.setRule('length_of_stay', rule);

    await spaceRuleRepository.setRule('notice_required', {
      numDays: 0
    });

    await spaceRuleRepository.setRule('length_of_stay', rule);

    await spaceStubRepository.setNumBookedByDate(
      `${formattedDate}-num_booked`,
      0
    );
  }

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
    await init();
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
    await init();
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
    await init();

    await spaceRuleRepository.setRule('notice_required', {
      numDays: 1
    });

    await facilityRuleRepository.setRule('notice_required', {
      numDays: 1
    });

    const ask = getAsk();
    const search = new SearchService(facilityId, ask);
    const result = await search.search();

    expect(result).to.be.an('array');
    expect(result.length).to.be.equal(0);
  });

  it('change num booked', async () => {
    await init();

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
    await facilityRepo.delFromIndex(facilityId, 'spaces', spaceId);
    await facilityRepo.delFromIndex(facilityId, 'spaces', spaceId2);
    await facilityRepo.delItemKey(facilityId, 'spaces', spaceId, 'metadata');
    await facilityRepo.delItemKey(facilityId, 'spaces', spaceId2, 'metadata');

    await spaceAvailabilityRepository.delAvailability('default');
    await spaceAvailabilityRepository2.delAvailability('default');

    await facilityRuleRepository.delRule('notice_required');
    await facilityRuleRepository.delRule('length_of_stay');
    await spaceRuleRepository.delRule('notice_required');
    await spaceRuleRepository.delRule('length_of_stay');

    await spaceStubRepository.delNumBookedByDate(`${formattedDate}-num_booked`);
  });
});
