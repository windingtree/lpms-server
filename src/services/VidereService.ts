import { PingPongService } from './PingPongService';
import { AuctioneerService } from './AuctioneerService';
import facilityRepository from '../repositories/FacilityRepository';
import { Facility } from '../proto/facility';
import ApiError from '../exceptions/ApiError';
import { geoToH3 } from 'h3-js';
import { constants } from '@windingtree/videre-sdk/dist/cjs/utils';
import { AbstractFacilityService } from './interfaces/AbstractFacilityService';
import { checkFacilityRegister, verifyFacilityBidder } from '../utils';

export class VidereService {
  private services = new Map<string, PingPongService | AuctioneerService>();
  private facilityIds = new Set<string>();

  public async start(): Promise<void> {
    for (const id of await facilityRepository.getAllFacilityIds()) {
      try {
        await this.startFacility(id);
      } catch (e) {
        // log error
        console.log(e);
      }
    }
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

    this.facilityIds.add(facilityId);
  }

  public async stopFacility(facilityId: string): Promise<void> {
    for (const [_, service] of this.services) {
      await service.stop(facilityId);
    }

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
