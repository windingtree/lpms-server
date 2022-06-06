import type { NextFunction, Request, Response } from 'express';
import type { FormattedDate, ModifiersKey } from '../services/DBService';
import { DateTime } from 'luxon';
import ApiError from '../exceptions/ApiError';
import { SpaceAvailabilityRepository } from '../repositories/SpaceAvailabilityRepository';
import { FacilityModifierRepository } from '../repositories/FacilityModifierRepository';
import {
  SpaceModifierRepository,
  OtherItemsModifierRepository
} from '../repositories/ItemModifierRegistry';

export class FacilityController {
  // Returns availability of the space
  getSpaceAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { facilityId, spaceId, date } = req.params;

      const repository = new SpaceAvailabilityRepository(facilityId, spaceId);
      const numSpaces = await repository.getSpaceAvailability(
        date as FormattedDate
      );

      return res.json({ numSpaces });
    } catch (e) {
      next(e);
    }
  };

  // Adds availability of the space by date
  createSpaceAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { facilityId, spaceId, date } = req.params;
      const { numSpaces } = req.body;

      if (!DateTime.fromSQL(date).isValid) {
        throw ApiError.BadRequest('Invalid availability date format');
      }

      const repository = new SpaceAvailabilityRepository(facilityId, spaceId);
      await repository.setAvailabilityByDate(date as FormattedDate, {
        numSpaces: Number(numSpaces)
      });

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  };

  // Adds/updates `default` availability of the space
  createDefaultSpaceAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { facilityId, spaceId } = req.params;
      const { numSpaces } = req.body;

      const repository = new SpaceAvailabilityRepository(facilityId, spaceId);
      await repository.setAvailabilityDefault({ numSpaces: Number(numSpaces) });

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  };

  // Returns modifier of facility
  getFacilityModifier = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { facilityId, modifierKey } = req.params;

      const repository = new FacilityModifierRepository(facilityId);
      const modifier = await repository.getModifier(
        modifierKey as ModifiersKey
      );

      res.json(modifier);
    } catch (e) {
      next(e);
    }
  };

  // Returns modifier of the item: `spaces` or `otherItems`
  getItemModifier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId, itemKey, itemId, modifierKey } = req.params;
      let repository: SpaceModifierRepository | OtherItemsModifierRepository;

      switch (itemKey) {
        case 'spaces':
          repository = new SpaceModifierRepository(facilityId, itemId);
          break;
        case 'otherItems':
          repository = new OtherItemsModifierRepository(facilityId, itemId);
          break;
        default:
          throw ApiError.BadRequest('Invalid item key');
      }

      const modifier = await repository.getModifier(
        modifierKey as ModifiersKey
      );

      res.json(modifier);
    } catch (e) {
      next(e);
    }
  };
}

export default new FacilityController();
