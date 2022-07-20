import { MongoClient, MongoClientOptions } from 'mongodb';
import { mongoDBUrl } from '../config';

export default class MongoDBService {
  private static _instance: MongoDBService = new MongoDBService();
  private _dbClient: MongoClient | null = null;
  private _dbClientOptions: MongoClientOptions;

  constructor() {
    if (MongoDBService._instance) {
      throw new Error(
        'MongoDB class instantiation failed. Use MongoDB.getInstance() instead of new operator.'
      );
    }
    MongoDBService._instance = this;

    this._dbClientOptions = {
      // TCP Connection timeout setting.
      connectTimeoutMS: 15000,

      // The number of milliseconds to wait before initiating keepAlive on the TCP socket.
      keepAliveInitialDelay: 15000
    };
  }

  private async createDbClient(): Promise<void> {
    if (this._dbClient) {
      return;
    }

    try {
      this._dbClient = new MongoClient(mongoDBUrl, this._dbClientOptions);
    } catch (err: unknown) {
      throw new Error('Could not create a new MongoClient instance. ' + err);
    }

    try {
      await this._dbClient.connect();
    } catch (err: unknown) {
      throw new Error('Could not connect to the database. ' + err);
    }

    console.log('[MongoDB :: createDbClient] => Mongo connection created.');
  }

  public static getInstance(): MongoDBService {
    return MongoDBService._instance;
  }

  public async getDbClient(): Promise<MongoClient> {
    await this.createDbClient();

    if (this._dbClient === null) {
      throw new Error('DbClient = null, this should not happen.');
    }

    return this._dbClient;
  }

  public async ping(): Promise<void> {
    const dbClient = await this.getDbClient();

    try {
      await dbClient.db().admin().ping();
    } catch (err: unknown) {
      throw new Error(
        'Could not complete ping() operation on the MongoDB. ' + err
      );
    }
  }

  public async cleanUp(): Promise<void> {
    if (!this._dbClient) {
      return;
    }

    try {
      await this._dbClient.close();
      this._dbClient = null;
    } catch (err: unknown) {
      throw new Error('Could not close connection to the database. ' + err);
    }

    console.log('[MongoDB :: cleanUp] => Mongo connection closed.');
  }
}
