import { AppRole, UserDbData } from '../types';

import MongoDBService from '../services/MongoDBService';
import { Collection, ObjectId } from 'mongodb';
import { DBName } from '../config';
import ApiError from '../exceptions/ApiError';

export class UserRepository {
  private dbService: MongoDBService;
  private collectionName = 'users';

  constructor() {
    this.dbService = MongoDBService.getInstance();
  }

  protected async getCollection(): Promise<Collection<UserDbData>> {
    const dbClient = await this.dbService.getDbClient();
    const database = dbClient.db(DBName);

    return database.collection(this.collectionName);
  }

  public async getAllUsers() {
    const result: UserDbData[] = [];
    const collection = await this.getCollection();
    const cursor = await collection.find({});

    if ((await cursor.count()) === 0) {
      return [];
    }

    await cursor.forEach((item) => {
      result.push(item);
    });

    return result;
  }

  public async getUserById(_id: string): Promise<UserDbData> {
    const collection = await this.getCollection();
    const query = { _id: new ObjectId(_id) };
    const result = await collection.findOne(query);

    if (!result) {
      throw ApiError.NotFound('User not found');
    }

    return result;
  }

  public async getUserByLogin(login: string): Promise<UserDbData> {
    const collection = await this.getCollection();
    const query = { login };
    const result = await collection.findOne(query);

    if (!result) {
      throw ApiError.NotFound('User not found');
    }

    return result;
  }

  public async createUser(
    login: string,
    password: string,
    roles: AppRole[]
  ): Promise<void> {
    const collection = await this.getCollection();

    await collection.insertOne({
      _id: null,
      login,
      password,
      roles
    });
  }

  public async deleteUser(_id: string): Promise<void> {
    const collection = await this.getCollection();
    const query = { _id: new ObjectId(_id) };
    await collection.deleteOne(query);
  }

  public async updateUser(_id: string, update): Promise<void> {
    const collection = await this.getCollection();
    const query = { _id: new ObjectId(_id) };
    await collection.updateOne(query, { $set: update });
  }
}

export default new UserRepository();
