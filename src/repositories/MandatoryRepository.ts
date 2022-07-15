import DBService, { RateType } from '../services/DBService';

export class MandatoryRepository {
  private db = DBService.getInstance();

  public async getItemMandatoryIds(
    facilityId: string,
    spaceId: string,
    type: RateType
  ) {
    const mandatoryDB = this.db.getItemMandatoryDB(facilityId, spaceId);

    try {
      return await mandatoryDB.get(type);
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
      return [];
    }
  }

  public async addIds(
    facilityId: string,
    spaceId: string,
    type: RateType,
    ids: string[]
  ): Promise<void> {
    const mandatoryDB = this.db.getItemMandatoryDB(facilityId, spaceId);

    const dbIds = await this.getItemMandatoryIds(facilityId, spaceId, type);
    const mergedIds = new Set([...dbIds, ...ids]);
    await mandatoryDB.put(type, Array.from(mergedIds));
  }

  public async delIds(
    facilityId: string,
    spaceId: string,
    type: RateType,
    ids: string[]
  ): Promise<void> {
    const mandatoryDB = this.db.getItemMandatoryDB(facilityId, spaceId);

    if (ids.length === 0) {
      await mandatoryDB.put(type, []);
    } else {
      const dbIds = await this.getItemMandatoryIds(facilityId, spaceId, type);
      const idsSet = new Set(dbIds);

      for (const id of ids) {
        idsSet.delete(id);
      }
      await mandatoryDB.put(type, Array.from(idsSet));
    }
  }
}

export default new MandatoryRepository();
