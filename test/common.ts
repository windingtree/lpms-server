import { Exception, Facility, Space, SpaceTier } from '../src/proto/facility';
import { ContactType } from '../src/proto/contact';

export const facility: Facility = {
  name: 'Awesome ski chalet',
  description: 'Some chalet in the best place of all! 🏔️',
  emails: [
    {
      email: 'example@example.com',
      typeOneof: {
        oneofKind: 'type',
        type: 2
      }
    }
  ],
  phones: [
    {
      number: '0123456789',
      typeOneof: {
        oneofKind: 'type',
        type: 2
      }
    }
  ],
  uris: [
    {
      uri: 'https://wonderland.somewhere/',
      typeOneof: {
        oneofKind: 'type',
        type: 2
      }
    }
  ],
  photos: [
    {
      uri: '/image1.jpg',
      description: 'Chic guesthouse'
    },
    {
      uri: '/image2.jpg',
      description: 'Winter Wonderland'
    }
  ],
  location: {
    latitude: 55.04246,
    longitude: 56.71865
  },
  policies: {
    currencyCode: 'xDAI',
    timezone: 'Asia/Almaty',
    checkInTimeOneof: {
      oneofKind: 'checkInTime',
      checkInTime: '1500'
    },
    checkOutTimeOneof: {
      oneofKind: 'checkOutTime',
      checkOutTime: '1000'
    }
  },
  connectivity: {
    wifiAvailableOneof: {
      oneofKind: 'wifiAvailable',
      wifiAvailable: true
    },
    wifiForFreeOneof: {
      oneofKind: 'wifiForFree',
      wifiForFree: true
    }
  }
};

export const space: Space = {
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
    viewOfLandmarkOneof: { oneofKind: 'viewOfLandmark', viewOfLandmark: false },
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
