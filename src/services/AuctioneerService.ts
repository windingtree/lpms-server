import { BigNumber, constants, utils } from 'ethers';
import { eip712, utils as vUtils } from '@windingtree/videre-sdk';
import WalletService from './WalletService';
import { walletAccountsIndexes } from '../types';

import { staysDataDomain, videreConfig } from '../config';
import { generateBidLine } from '../utils';
import { AbstractFacilityService } from './interfaces/AbstractFacilityService';
import { AskWrapper, BidLine, Bids, BidWrapper } from '../proto/bidask';
import { Ask } from '../proto/ask';
import { SearchService } from './SearchService';
import { QuoteService } from './QuoteService';
import { ask as staysEIP712 } from '@windingtree/stays-models/dist/cjs/eip712';

export class AuctioneerService extends AbstractFacilityService {
  constructor() {
    super();
  }

  /**
   * Start the bid / ask service for a specified facility.
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

    // watch for asks
    const observer = await this.waku.makeWakuObserver(
      async (message) => {
        const msg = this.waku.processMessage(AskWrapper, message);

        // if we actually have an ask, we process it.
        if (msg) {
          const ask = Ask.fromBinary(msg.payload);

          // first find if we have any spaces available
          const spaces = await new SearchService(facilityId, ask).search();

          const bidlines: BidLine[] = [];

          const params = utils._TypedDataEncoder.hashStruct(
            'Ask',
            staysEIP712.Ask,
            ask
          );

          for (const space of spaces) {
            // TODO: currently assumes quote is xDAI
            const quote = await new QuoteService().quote(
              facilityId,
              space,
              ask
            );

            const bid = await generateBidLine(
              await WalletService.getWalletByIndex(
                walletAccountsIndexes.BIDDER
              ),
              utils.hexlify(msg.salt),
              facilityId,
              params,
              [space],
              5,
              Math.floor(+new Date() / 1000) + 20 * 60,
              constants.AddressZero,
              quote.mul(BigNumber.from('10').pow('18'))
            );

            bidlines.push(bid);
          }

          // assemble the final bid message to be used in response
          this.waku.sendMessage(
            BidWrapper,
            await vUtils.createSignedMessage<BidWrapper>(
              staysDataDomain,
              eip712.bidask.BidWrapper,
              {
                serviceProvider: utils.arrayify(facilityId),
                payload: Bids.toBinary({ bids: bidlines }),
                askDigest: utils.arrayify(
                  utils.keccak256(
                    utils.defaultAbiCoder.encode(
                      ['bytes32', 'bytes32'],
                      [msg.salt, params]
                    )
                  )
                ),
                signature: utils.toUtf8Bytes('')
              },
              await WalletService.getWalletByIndex(walletAccountsIndexes.BIDDER)
            ),
            vUtils.generateTopic({ ...videreConfig, topic: 'bid' }, h3Index)
          );
        }
      },
      [vUtils.generateTopic({ ...videreConfig, topic: 'ask' }, h3Index)]
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

export default new AuctioneerService();
