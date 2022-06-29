import facilityRepository from '../repositories/FacilityRepository';
import bidRepository from '../repositories/BidRepository';
import log from './LogService';

export class BidService {
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
