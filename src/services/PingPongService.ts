import { geoToH3 } from 'h3-js';
import { utils } from 'ethers';

import { eip712, utils as vUtils } from '@windingtree/videre-sdk';
import { constants } from '@windingtree/videre-sdk/dist/cjs/utils';

import facilityRepository from '../repositories/FacilityRepository';

import log from './LogService';
import WakuService from './WakuService';
import WalletService from './WalletService';

import { walletAccountsIndexes } from '../types';
import { Facility } from '../proto/facility';
import { Ping, Pong } from '../proto/pingpong';
import { LatLng } from '../proto/latlng';

import { typedDataDomain, videreConfig } from '../config';
import ApiError from '../exceptions/ApiError';

export default class PingPongService {
  protected waku: WakuService;
  protected unsubscribe: () => void = () => {
    return;
  };

  /**
   * After database initialization, start the ping / pong service
   * for a specified facility.
   */
  public async start(facilityId: string): Promise<void> {
    const metadata = await facilityRepository.getFacilityKey<Facility>(
      facilityId,
      'metadata'
    );

    if (metadata === null) {
      throw ApiError.NotFound(
        `Unable to find "metadata" of the facility: ${facilityId}`
      );
    }

    const loc = metadata.location;

    if (!this.waku) this.waku = WakuService.getInstance();

    if (loc) {
      // get the h3 index to monitor from the location
      const h3Index = geoToH3(
        loc.latitude,
        loc.longitude,
        constants.DefaultH3Resolution
      );

      // watch for pings
      this.unsubscribe = await this.waku.makeWakuObserver(
        async (message) => {
          const msg = this.waku.processMessage(Ping, message);
          if (msg) log.green(`Ping received with timestamp: ${msg.timestamp}`);

          // respond to the ping with a pong
          this.waku.sendMessage(
            Pong,
            await vUtils.createSignedMessage<Pong>(
              typedDataDomain,
              eip712.pingpong.Pong,
              {
                serviceProvider: utils.arrayify(facilityId),
                loc: LatLng.toBinary(loc),
                signature: utils.toUtf8Bytes('') // initially blank signature which gets filled in
              },
              await WalletService.getWalletByIndex(walletAccountsIndexes.BIDDER)
            ),
            vUtils.generateTopic({ ...videreConfig, topic: 'pong' }, h3Index)
          );
        },
        [vUtils.generateTopic({ ...videreConfig, topic: 'ping' }, h3Index)]
      );
    }
  }

  public async stop(): Promise<void> {
    this.unsubscribe();
  }
}
