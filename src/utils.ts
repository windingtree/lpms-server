import { eip712 } from '@windingtree/videre-sdk';
import { BigNumber, utils, Wallet } from 'ethers';
import { staysDataDomain, videreConfig } from './config';
import { Timestamp } from './proto/timestamp';
import { providers } from 'ethers';
import {
  LineRegistry__factory,
  ServiceProviderRegistry__factory
} from '../typechain-videre';
import walletService from './services/WalletService';
import { ServiceRole, walletAccountsIndexes } from './types';
import { serviceProviderRegistryAddress } from './config';

export function convertDaysToSeconds(days: number) {
  return days * 60 * 60 * 24;
}

//todo relocate to videre-sdk
export function getCurrentTimestamp(): Timestamp {
  const timeMS = Date.now();

  return {
    seconds: BigInt(Math.floor(timeMS / 1000)),
    nanos: (timeMS % 1000) * 1e6
  };
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
    serviceProviderRegistryAddress,
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
  spaceIds: string[],
  limit: number,
  expiry: number,
  gem: string,
  wad: BigNumber
) {
  const items = spaceIds.map((v) => utils.arrayify(v));
  return {
    limit: limit,
    expiry: expiry,
    items: items,
    terms: [],
    options: undefined,
    cost: [
      {
        gem: gem,
        wad: wad.toString()
      }
    ],
    signature: utils.arrayify(
      await wallet._signTypedData(staysDataDomain, eip712.bidask.Bid, {
        salt: salt,
        limit: limit,
        expiry: expiry,
        which: which,
        params: params,
        items: items,
        terms: [],
        options: {
          items: [],
          terms: []
        },
        cost: [
          {
            gem: gem,
            wad: wad
          }
        ]
      })
    )
  };
}

export const getServiceProviderId = (salt: string, address: string): string => {
  const encoder = new utils.AbiCoder();
  return utils.solidityKeccak256(
    ['bytes'],
    [encoder.encode(['bytes32', 'address'], [salt, address])]
  );
};
