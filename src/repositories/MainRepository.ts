import DBService from '../services/DBService';
import { Level } from 'level';

export class MainRepository {
  private dbService: DBService;
  private db: Level<string, string | string[]>;

  constructor() {
    this.dbService = DBService.getInstance();
    this.db = DBService.getInstance().getDB();
  }

  public async getId(): Promise<number> {
    try {
      return Number(await this.db.get('user_db_increment')) + 1;
    } catch (e) {
      if (e.status === 404) {
        return 1;
      }
      throw e;
    }
  }

  public async setUserDBIncrement(id: string) {
    await this.db.put('user_db_increment', id);
  }
}

export default new MainRepository();
