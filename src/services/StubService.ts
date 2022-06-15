import { FormattedDate } from './DBService';
import { SpaceStubRepository } from '../repositories/SpaceStubRepository';
import { StubRepository } from '../repositories/StubRepository';
import { StubStorage } from '../proto/lpms';
import { FacilityRepository } from '../repositories/FacilityRepository';

export class StubService {
  public async getFacilityStubs(facilityId: string, page = 1, perPage = 10) {
    const facilityRepository = new FacilityRepository();

    let ids = (await facilityRepository.getFacilityKey(
      facilityId,
      'stubs'
    )) as string[];

    const lastPage = Math.ceil(ids.length / perPage);
    ids = ids.slice((page - 1) * perPage, page * perPage);
    const stubs = await StubService.getStubsByIds(facilityId, ids);

    return {
      stubs,
      lastPage
    };
  }

  public async getFacilityStubsByDate(facilityId: string, date: FormattedDate) {
    const facilityStubRepository = new StubRepository(facilityId);

    const ids = await facilityStubRepository.getIndex(date);

    return await StubService.getStubsByIds(facilityId, ids);
  }

  public async getSpaceStubsByDate(
    facilityId: string,
    itemId: string,
    date: FormattedDate
  ) {
    const spaceStubRepository = new SpaceStubRepository(facilityId, itemId);

    const ids = await spaceStubRepository.getIndex(date);

    return await StubService.getStubsByIds(facilityId, ids);
  }

  private static async getStubsByIds(
    facilityId,
    ids: string[]
  ): Promise<StubStorage[]> {
    const facilityStubRepository = new StubRepository(facilityId);
    const stubs = new Set<StubStorage>();

    for (const id of ids) {
      const stub = await facilityStubRepository.getStub(id);

      if (stub) {
        stubs.add(stub as StubStorage);
      }
    }

    return Array.from(stubs);
  }
}

export default new StubService();
