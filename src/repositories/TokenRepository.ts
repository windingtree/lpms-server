import DBService from '../services/DBService';

export class TokenRepository {
  private dbService: DBService;
  private db;

  constructor() {
    this.dbService = DBService.getInstance();
    this.db = DBService.getInstance().getTokenDB();
  }

  public async getUserTokens(userId: number): Promise<string[]> {
    try {
      return await this.db.get(String(userId));
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return [];
  }

  public async setUserTokens(
    userId: string,
    verifiedTokens: string[]
  ): Promise<void> {
    await this.db.put(userId, verifiedTokens);
  }

  public async delUserTokens(userId: string): Promise<void> {
    await this.db.del(String(userId));
  }
}

export default new TokenRepository();
