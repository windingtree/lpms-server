import { eip712 } from '@windingtree/videre-sdk';
import { BigNumber, providers, utils, Wallet } from 'ethers';
import {
  getServiceProviderRegistryAddress,
  getStaysDataDomain,
  videreConfig
} from './config';
import {
  LineRegistry__factory,
  ServiceProviderRegistry__factory
} from '../typechain-videre';
import walletService from './services/WalletService';
import { ServiceRole, walletAccountsIndexes } from './types';
import { Ask } from './proto/ask';
import ApiError from './exceptions/ApiError';
import { DateTime } from 'luxon';
import { Facility } from './proto/facility';
import { ItemAvailabilityRepository } from './repositories/ItemAvailabilityRepository';
import { SpaceStubRepository } from './repositories/SpaceStubRepository';
import { FormattedDate } from './services/DBService';
import { BidOptionItem, BidOptionTerm, BidTerm } from './proto/bidask';
import { keccak256 } from 'ethers/lib/utils';

export function convertDaysToSeconds(days: number) {
  return days * 60 * 60 * 24;
}

// this will check to make sure that the facility has agreed to the line
// *terms*.
export async function checkFacilityRegister(
  facilityId: string
): Promise<boolean> {
  const provider = new providers.JsonRpcProvider(
    String(process.env.APP_NETWORK_PROVIDER)
  );
  const lineRegistry = String(process.env.APP_VERIFYING_CONTRACT);

  return await LineRegistry__factory.connect(lineRegistry, provider).can(
    utils.formatBytes32String(videreConfig.line),
    facilityId
  );
}

// this function makes sure that the bidder is authorized to bid on
// behalf of the facilityId.
export async function verifyFacilityBidder(
  facilityId: string
): Promise<boolean> {
  const provider = new providers.JsonRpcProvider(
    String(process.env.APP_NETWORK_PROVIDER)
  );

  const bidderAddress = await walletService.getWalletAccountByRole(
    ServiceRole.BIDDER
  );

  return await ServiceProviderRegistry__factory.connect(
    await getServiceProviderRegistryAddress(),
    provider
  ).can(
    facilityId,
    getContractRole(walletAccountsIndexes.BIDDER),
    bidderAddress
  );
}

export function getContractRole(role: walletAccountsIndexes): number {
  return role + 1;
}

// TODO: upstream this to `videre-sdk`
export async function generateBidLine(
  wallet: Wallet,
  salt: string,
  which: string,
  params: string,
  itemIds: string[],
  limit: number,
  expiry: number,
  gem: string,
  wad: BigNumber,
  optionalItems: BidOptionItem[],
  mandatoryTerms: BidTerm[],
  optionalTerms: BidOptionTerm[]
) {
  const items = itemIds.map((v) => utils.arrayify(v));

  return {
    limit: limit,
    expiry: expiry,
    items,
    terms: mandatoryTerms,
    options: {
      items: optionalItems,
      terms: optionalTerms
    },
    cost: [
      {
        gem: gem,
        wad: wad.toString()
      }
    ],
    signature: utils.arrayify(
      await wallet._signTypedData(
        await getStaysDataDomain(),
        eip712.bidask.Bid,
        {
          salt: salt,
          limit: limit,
          expiry: expiry,
          which: which,
          params: params,
          items: items,
          terms: getSignBidTerms(mandatoryTerms),
          options: {
            items: getSignBidOptionalItems(optionalItems),
            terms: getSignBidOptionalTerms(optionalTerms)
          },
          cost: [
            {
              gem: gem,
              wad: wad
            }
          ]
        }
      )
    )
  };
}

export const getSignBidTerms = (terms: BidTerm[]) => {
  return terms.map((bidTerm) => {
    return {
      term: keccak256(bidTerm.term),
      impl: bidTerm.impl,
      txPayload: keccak256(bidTerm.txPayload)
    };
  });
};

export const getSignBidOptionalItems = (optionalItems: BidOptionItem[]) => {
  return optionalItems.map((item) => {
    return {
      item: keccak256(item.item),
      cost: item.cost
    };
  });
};

export const getSignBidOptionalTerms = (optionalTerms: BidOptionTerm[]) => {
  return optionalTerms.map((optionalTerm) => {
    if (optionalTerm.term) {
      return {
        term: {
          term: keccak256(optionalTerm.term.term),
          impl: optionalTerm.term.impl,
          txPayload: keccak256(optionalTerm.term.txPayload)
        },
        cost: optionalTerm.cost
      };
    }
  });
};

export const getServiceProviderId = (salt: string, address: string): string => {
  return utils.keccak256(
    utils.defaultAbiCoder.encode(['bytes32', 'address'], [salt, address])
  );
};

export const getAskDates = (
  ask: Ask,
  checkInTime: string,
  timezone: string
): DateTime[] => {
  if (!ask.checkIn || !ask.checkOut) {
    throw ApiError.BadRequest('invalid dates in ask');
  }

  const checkIn = DateTime.fromFormat(checkInTime, 'hhmm', {
    zone: timezone
  }).setZone('utc');

  let from = DateTime.fromObject(
    {
      ...ask.checkIn,
      hour: checkIn.hour,
      minute: checkIn.minute
    },
    { zone: 'utc' }
  );
  const to = DateTime.fromObject(
    {
      ...ask.checkOut,
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
};

export const getFacilityCheckInTime = (facility: Facility): string => {
  return facility.policies?.checkInTimeOneof.oneofKind === 'checkInTime'
    ? facility.policies.checkInTimeOneof.checkInTime
    : '1500'; //todo think about default checkin time
};

export const getFacilityTimezone = (facility: Facility): string => {
  const tz = facility.policies?.timezone;

  if (!tz) {
    throw ApiError.BadRequest(`Time zone is undefined`);
  }

  return tz;
};

export const checkAvailableDates = async (
  facilityId: string,
  spaceId: string,
  ask: Ask,
  dates: DateTime[]
) => {
  const availabilityRepository = new ItemAvailabilityRepository(
    facilityId,
    spaceId
  );

  const spaceStubRepository = new SpaceStubRepository(facilityId, spaceId);

  const defaultAvailable = await availabilityRepository.getAvailability(
    'default'
  );

  for (const date of dates) {
    try {
      const formattedDate = date.toFormat('yyyy-MM-dd') as FormattedDate;

      let available = await availabilityRepository.getAvailability(
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

      if (available.numSpaces - numBooked < ask.numSpacesReq) {
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
};
