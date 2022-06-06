import type { NextFunction, Request, Response } from 'express';
import type {
  FormattedDate,
  ModifiersKey,
  ModifiersValues
} from '../services/DBService';
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
  getModifierOfFacility = async (
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
  getModifierOfItem = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
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

      let modifier: ModifiersValues;

      try {
        modifier = await repository.getModifier(modifierKey as ModifiersKey);
      } catch (e) {
        if (e.status !== 404) {
          throw e;
        }

        // If item does not contain such modifier then try to lookup the facility
        const facilityRepository = new FacilityModifierRepository(facilityId);
        modifier = await facilityRepository.getModifier(
          modifierKey as ModifiersKey
        );
      }

      res.json(modifier);
    } catch (e) {
      next(e);
    }
  };

  // Creates a modifier for the facility
  createFacilityModifier = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { facilityId, modifierKey } = req.params;
      const modifier = req.body;

      const repository = new FacilityModifierRepository(facilityId);
      await repository.setModifier(
        modifierKey as ModifiersKey,
        modifier as ModifiersValues
      );

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  };

  // Creates a modifier for the item: spaces or otherItems
  createItemModifier = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { facilityId, itemKey, itemId, modifierKey } = req.params;
      const modifier = req.body;
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

      await repository.setModifier(
        modifierKey as ModifiersKey,
        modifier as ModifiersValues
      );

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  };
}

export default new FacilityController();
