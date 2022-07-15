import facilityRepository from '../repositories/FacilityRepository';
import bidRepository from '../repositories/BidRepository';
import log from './LogService';
import { BigNumber, utils } from 'ethers';
import { BidLine, BidTerm } from '../proto/bidask';
import { Ask } from '../proto/ask';

export class BidService {
  public async setBid(
    facilityId: string,
    spaceId: string,
    items: string[],
    bid: BidLine,
    ask: Ask,
    params: string,
    mandatoryTerms: BidTerm[],
    gem: string,
    cost: BigNumber
  ) {
    const itemsEncodePacked = utils.keccak256(utils.concat(items));

    //from contract
    const STUB_STATE_TYPEHASH = utils.keccak256(
      utils.toUtf8Bytes(
        'StubState(bytes32 which,bytes32 params,bytes32[] items,BidTerm[] terms,ERC20Native cost)BidTerm(bytes32 term,address impl,bytes txPayload)ERC20Native(address gem,uint256 wad)'
      )
    );

    //from contract
    const ERC20NATIVE_TYPEHASH = utils.keccak256(
      utils.toUtf8Bytes('ERC20Native(address gem,uint256 wad)')
    );

    const termsEncodePacked = utils.keccak256(
      utils.concat(
        mandatoryTerms.map((t) => {
          return BidTerm.toBinary(t);
        })
      )
    );

    const costHash = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ['bytes32', 'address', 'uint256'],
        [ERC20NATIVE_TYPEHASH, gem, cost]
      )
    );

    const bidHash = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ['bytes32', 'bytes32', 'bytes32', 'bytes32', 'bytes32', 'bytes32'],
        [
          STUB_STATE_TYPEHASH,
          facilityId,
          params,
          itemsEncodePacked,
          termsEncodePacked,
          costHash
        ]
      )
    );

    await bidRepository.setBid(facilityId, bidHash, {
      ask,
      bidLine: bid,
      spaceId: spaceId,
      items: items
    });
  }

  public async clearExpired() {
    try {
      const facilityIds = await facilityRepository.getAllFacilityIds();
      for (const facilityId of facilityIds) {
        const bids = await bidRepository.getBids(facilityId);
        for (const key in bids) {
          if (bids[key].bidLine.expiry < Math.floor(+new Date() / 1000)) {
            await bidRepository.delBid(facilityId, key);
          }
        }
      }
    } catch (e) {
      log.red('Clear expired bids error: ' + e.message);
    }
  }

  public poller(seconds: number) {
    setInterval(this.clearExpired, seconds * 1000);
  }
}

export default new BidService();
