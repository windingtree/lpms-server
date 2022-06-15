import { utils } from 'ethers';
import { eip712, utils as vUtils } from '@windingtree/videre-sdk';
import log from './LogService';
import WalletService from './WalletService';
import { walletAccountsIndexes } from '../types';
import { Ping, Pong } from '../proto/pingpong';
import { Facility as FacilityMetadata } from '../proto/facility';
import facilityRepository, {
  FacilityRepository
} from '../repositories/FacilityRepository';

import { lineRegistryDataDomain, videreConfig } from '../config';
import { getCurrentTimestamp } from '../utils';
import { AbstractFacilityService } from './interfaces/AbstractFacilityService';
import { LatLng } from '../proto/latlng';

export class PingPongService extends AbstractFacilityService {
  protected facilityRepository: FacilityRepository;

  constructor() {
    super();
    this.facilityRepository = new FacilityRepository();
  }

  /**
   * Start the ping / pong service for a specified facility.
   */
  public async start(facilityId: string, h3Index: string): Promise<void> {
    //store Maps
    this.facilityToLoc.set(facilityId, h3Index);
    if (this.locsManaged.has(h3Index)) {
      const locs = this.locsManaged.get(h3Index);
      locs?.push(facilityId);
      this.locsManaged.set(h3Index, locs || []);
    } else {
      this.locsManaged.set(h3Index, [facilityId]);
    }

    // watch for pings
    const observer = await this.waku.makeWakuObserver(
      async (message) => {
        const msg = this.waku.processMessage(Ping, message);
        if (msg) {
          if (msg.timestamp) {
            log.green(`Ping received with timestamp: ${msg.timestamp.seconds}`);
          } else {
            log.yellow(`Ping received at local time: ${getCurrentTimestamp()}`);
          }

          try {
            const metadata = (await facilityRepository.getFacilityKey(
              facilityId,
              'metadata'
            )) as FacilityMetadata;

            if (metadata.location) {
              // respond to the ping with a pong
              this.waku.sendMessage(
                Pong,
                await vUtils.createSignedMessage<Pong>(
                  lineRegistryDataDomain,
                  eip712.pingpong.Pong,
                  {
                    serviceProvider: utils.arrayify(facilityId),
                    loc: LatLng.toBinary(metadata.location),
                    timestamp: getCurrentTimestamp(),
                    signature: utils.toUtf8Bytes('') // initially blank signature which gets filled in
                  },
                  await WalletService.getWalletByIndex(
                    walletAccountsIndexes.BIDDER
                  )
                ),
                vUtils.generateTopic(
                  { ...videreConfig, topic: 'pong' },
                  h3Index
                )
              );
            }
          } catch (e) {
            log.red('Malformed EIP-712 signing' + e);
          }
        } else {
          log.red('Malformed Ping message');
        }
      },
      [vUtils.generateTopic({ ...videreConfig, topic: 'ping' }, h3Index)]
    );

    this.unsubscribes.set(facilityId, {
      h3Index: h3Index,
      handler: observer
    });
  }

  public async stop(facilityId: string): Promise<void> {
    const unsubscribe = this.unsubscribes.get(facilityId);
    if (unsubscribe) {
      this.unsubscribes.delete(facilityId);
      this.facilityToLoc.delete(facilityId);

      let locs = this.locsManaged.get(unsubscribe.h3Index);
      if (locs) {
        locs = locs.filter((v) => v !== facilityId);

        this.locsManaged.set(unsubscribe.h3Index, locs);
        if (this.locsManaged.get(unsubscribe.h3Index)?.length === 0) {
          this.locsManaged.delete(unsubscribe.h3Index);
        }
      }

      unsubscribe.handler();
    }
  }
}

export default new PingPongService();
