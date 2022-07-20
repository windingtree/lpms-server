import MongoDBService from '../services/MongoDBService';
import { Collection, ObjectId } from 'mongodb';
import { TokenDbData } from '../types';
import { DBName } from '../config';

export class TokenRepository {
  private dbService: MongoDBService;
  private collectionName = 'tokens';

  constructor() {
    this.dbService = MongoDBService.getInstance();
  }

  protected async getCollection(): Promise<Collection<TokenDbData>> {
    const dbClient = await this.dbService.getDbClient();
    const database = dbClient.db(DBName);

    return database.collection(this.collectionName);
  }

  public async getUserTokens(userId: string): Promise<TokenDbData[]> {
    const result: TokenDbData[] = [];
    const collection = await this.getCollection();
    const query = { userId }
    const cursor = await collection.find(query);

    if ((await cursor.count()) === 0) {
      return [];
    }

    await cursor.forEach((item) => {
      result.push(item);
    });

    return result;
  }

  public async setUserToken(
    userId: string,
    verifiedToken: string
  ): Promise<void> {
    const collection = await this.getCollection();

    await collection.insertOne({
      _id: null,
      userId,
      refresh: verifiedToken
    });
  }

  public async delUserTokens(userId: string): Promise<void> {
    const collection = await this.getCollection();
    const query = { userId };
    await collection.deleteMany(query);
  }

  public async delTokens(ids: string[]): Promise<void> {
    const collection = await this.getCollection();
    const query = { _id: {$in : ids.map(id => new ObjectId(id))} };
    await collection.deleteMany(query);
  }
}

export default new TokenRepository();
