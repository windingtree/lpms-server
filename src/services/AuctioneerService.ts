export class AuctioneerService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor() {
    // Listen to waku and contentTopics from where when listening for a an Ask.
    // Monitor Stays events, filtering by facilityId on chain for any Deals that have been done.
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      //... start logic
      resolve();
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      //... stop logic
      resolve();
    });
  }
}
