import DBService from '../services/DBService';
import { BidLineAsk } from '../types';

export class BidRepository {
  protected db: DBService;

  constructor() {
    this.db = DBService.getInstance();
  }

  public async getBids(
    facilityId: string
  ): Promise<{ [p: string]: BidLineAsk }> {
    const bidDB = this.db.getFacilityBidDB(facilityId);
    const map = new Map<string, BidLineAsk>();

    for await (const [key, value] of bidDB.iterator()) {
      map.set(key, value);
    }

    return Object.fromEntries(map);
  }

  public async getBid(
    facilityId: string,
    bidHash: string
  ): Promise<BidLineAsk | null> {
    const bidDB = this.db.getFacilityBidDB(facilityId);

    try {
      return await bidDB.get(bidHash);
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
      return null;
    }
  }

  public async setBid(
    facilityId: string,
    key: string,
    value: BidLineAsk
  ): Promise<void> {
    const bidDB = this.db.getFacilityBidDB(facilityId);
    await bidDB.put(key, value);
  }

  public async delBid(facilityId: string, key: string): Promise<void> {
    const bidDB = this.db.getFacilityBidDB(facilityId);
    await bidDB.del(key);
  }
}

export default new BidRepository();
