import DBService from '../services/DBService';
import { Level } from 'level';
import { Facility } from '../proto/facility';

export class FacilityRepository {
  private dbService: DBService;
  private db: Level<string, string | string[]>;

  constructor() {
    this.dbService = DBService.getInstance();
    this.db = DBService.getInstance().getDB();
  }

  public async getFacilityIds(): Promise<string[]> {
    try {
      return await this.db.get<string, string[]>(
        'facilities',
        { valueEncoding: 'json' }
      );
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
    return [];
  }

  public async createFacility(facilityId: string, facility: Facility): Promise<void> {
    const facilitySublevel = this.dbService.getFacilitySublevelDB(facilityId);

    await facilitySublevel.put('metadata', facility);

    await this.createFacilityIndex(facilityId);
  }

  private async createFacilityIndex(facilityId: string) {
    const facilitiesIds = await this.getFacilityIds();

    if (facilitiesIds.length > 0) {
      const idsSet = new Set<string>(facilitiesIds);
      idsSet.add(facilityId);
      await this.db.put('facilities', Array.from(idsSet));
    } else {
      await this.db.put('facilities', [facilityId]);
    }
  }
}
