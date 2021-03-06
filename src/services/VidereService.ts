import { PingPongService } from './PingPongService';
import { AuctioneerService } from './AuctioneerService';
import facilityRepository from '../repositories/FacilityRepository';
import { Facility } from '../proto/facility';
import ApiError from '../exceptions/ApiError';
import { geoToH3 } from 'h3-js';
import { constants } from '@windingtree/videre-sdk/dist/cjs/utils';
import { AbstractFacilityService } from './interfaces/AbstractFacilityService';
import { checkFacilityRegister, verifyFacilityBidder } from '../utils';
import { defaultActivateFacilities } from '../config';

export class VidereService {
  private services = new Map<string, PingPongService | AuctioneerService>();
  private facilityIds = new Set<string>();

  public async start(): Promise<void> {
    const activeFacilityIds =
      await facilityRepository.getAllActiveFacilityIds();

    console.log('Facility Ids:', activeFacilityIds);

    if (Array.isArray(activeFacilityIds)) {
      for (const id of activeFacilityIds) {
        try {
          await this.startFacility(id);
          console.log(`Facility: ${id} has been started`);
        } catch (e) {
          // log error
          console.log(e);
        }
      }
    }

    if (activeFacilityIds === null && defaultActivateFacilities) {
      for (const id of await facilityRepository.getAllFacilityIds()) {
        try {
          await this.startFacility(id);
        } catch (e) {
          // log error
          console.log(e);
        }
      }
    }

    console.log('VidereService is started.');
  }

  public async addService(service: AbstractFacilityService): Promise<void> {
    if (!this.services.has(service.constructor.name)) {
      if (this.facilityIds.size > 0) {
        for (const facilityId in this.facilityIds) {
          const h3Index = await VidereService.getFacilityLocation(facilityId);
          await service.start(facilityId, h3Index);
        }
      }

      this.services.set(service.constructor.name, service);
    }
  }

  public async delService(service: AbstractFacilityService): Promise<void> {
    if (this.services.has(service.constructor.name)) {
      for (const facilityId in this.facilityIds) {
        await service.stop(facilityId);
      }

      this.services.delete(service.constructor.name);
    }
  }

  public async startFacility(facilityId: string): Promise<void> {
    if (!(await checkFacilityRegister(facilityId))) {
      throw ApiError.NotFound(`Unable to find in line registry: ${facilityId}`);
    }

    if (!(await verifyFacilityBidder(facilityId))) {
      throw ApiError.NotFound(`Unable to verify bidder key: ${facilityId}`);
    }

    const h3Index = await VidereService.getFacilityLocation(facilityId);

    for (const [_, service] of this.services) {
      await service.start(facilityId, h3Index);
    }

    await facilityRepository.addActiveFacilityToIndex(facilityId);
    this.facilityIds.add(facilityId);
  }

  public async stopFacility(facilityId: string): Promise<void> {
    for (const [_, service] of this.services) {
      await service.stop(facilityId);
    }

    await facilityRepository.delActiveFacilityFromIndex(facilityId);
    this.facilityIds.delete(facilityId);
  }

  private static async getFacilityLocation(
    facilityId: string
  ): Promise<string> {
    const metadata = await facilityRepository.getFacilityKey<Facility>(
      facilityId,
      'metadata'
    );

    if (metadata === null) {
      throw ApiError.NotFound(
        `Unable to find "metadata" of the facility: ${facilityId}`
      );
    }

    const loc = metadata.location;

    if (!loc) {
      throw ApiError.NotFound(
        `Unable to find "metadata.location" of the facility: ${facilityId}`
      );
    }

    // get the h3 index to monitor from the location
    return geoToH3(loc.latitude, loc.longitude, constants.DefaultH3Resolution);
  }
}

export default new VidereService();
