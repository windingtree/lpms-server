import { AppRole, User } from '../types';
import DBService, { DBLevel, LevelDefaultTyping } from '../services/DBService';
import { Level } from 'level';
import { AbstractSublevel } from 'abstract-level';

export class UserRepository {
  private dbService: DBService;
  private db: Level<string, string | string[]>;
  private userDB: AbstractSublevel<DBLevel, LevelDefaultTyping, string, User>;
  private loginDB: AbstractSublevel<DBLevel, LevelDefaultTyping, string, string>;

  constructor() {
    this.dbService = DBService.getInstance();
    this.db = DBService.getInstance().getDB();
    this.userDB = DBService.getInstance().getUserDB();
    this.loginDB = this.dbService.getLoginDB();
  }


  public async getAllUsers(): Promise<User[]> {
    return await this.userDB.values().all();
  }

  public async getUserIdByLogin(login: string): Promise<number | null> {
    try {
      const userId = await this.loginDB.get(login);
      return Number(userId);
    } catch (e) {
      if (e.status === 404) {
        return null;
      }
      throw e;
    }
  }

  public async getUserById(id: number): Promise<User> {
    return await this.userDB.get(String(id));
  }

  public async createUser(
    id: number,
    login: string,
    password: string,
    roles: AppRole[]
  ): Promise<void> {
    await this.userDB.put(String(id), {
      id,
      login,
      password,
      roles
    });

    await this.loginDB.put(login, String(id));
  }

  public async deleteUser(userId: string, login: string): Promise<void> {
    await this.db.del(String(userId));
    await this.loginDB.del(login);
  }

  public async updateUser(userId: string, user: User): Promise<void> {
    await this.userDB.put(String(userId), user);
  }
}

export default new UserRepository();
