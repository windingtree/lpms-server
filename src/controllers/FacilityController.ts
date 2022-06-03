import type { NextFunction, Request, Response } from 'express';
import type { AvailabilityDate } from '../services/DBService';
import { DateTime } from 'luxon';
import ApiError from '../exceptions/ApiError';
import { SpaceAvailabilityRepository } from '../repositories/SpaceAvailabilityRepository';

export class FacilityController {

  // Returns availability of the space
  getSpaceAvailability = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId, spaceId, date } = req.params;

      if (!DateTime.fromSQL(date).isValid) {
        throw ApiError.BadRequest('Invalid availability date format');
      }

      const repository = new SpaceAvailabilityRepository(facilityId, spaceId);
      const numSpaces = await repository.getSpaceAvailabilityNumSpaces(date as AvailabilityDate);

      return res.json({ numSpaces });
    } catch (e) {
      next(e);
    }
  }

  // Adds availability of the space by date
  createSpaceAvailability = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId, spaceId, date } = req.params;
      const { numSpaces } = req.body;

      if (!DateTime.fromSQL(date).isValid) {
        throw ApiError.BadRequest('Invalid availability date format');
      }

      const repository = new SpaceAvailabilityRepository(facilityId, spaceId);
      await repository.createAvailabilityByDate(
        date as AvailabilityDate,
        numSpaces
      );

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  // Adds/updates `default` availability of the space
  createDefaultSpaceAvailability = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId, spaceId } = req.params;
      const { numSpaces } = req.body;

      const repository = new SpaceAvailabilityRepository(facilityId, spaceId);
      await repository.createDefaultAvailability(numSpaces);

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
}

export default new FacilityController();
