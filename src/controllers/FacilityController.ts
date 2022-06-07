import type { NextFunction, Request, Response } from 'express';
import type {
  FacilityIndexKey,
  FormattedDate,
  ModifiersKey,
  ModifiersValues
} from '../services/DBService';
import { DateTime } from 'luxon';
import ApiError from '../exceptions/ApiError';
import { SpaceAvailabilityRepository } from '../repositories/SpaceAvailabilityRepository';
import {
  FacilityModifierRepository,
  ItemModifierRepository
} from '../repositories/ModifierRepository';

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

      const repository = new ItemModifierRepository(
        facilityId,
        itemKey as FacilityIndexKey,
        itemId
      );

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

      const repository = new ItemModifierRepository(
        facilityId,
        itemKey as FacilityIndexKey,
        itemId
      );

      await repository.setModifier(
        modifierKey as ModifiersKey,
        modifier as ModifiersValues
      );

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  };

  // Removes a modifier from the facility
  removeModifierOfFacility = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { facilityId, modifierKey } = req.params;

      const repository = new FacilityModifierRepository(facilityId);
      await repository.delModifier(modifierKey as ModifiersKey);

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  };

  // Removes modifier of the item: `spaces` or `otherItems`
  removeModifierOfItem = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { facilityId, itemKey, itemId, modifierKey } = req.params;

      const repository = new ItemModifierRepository(
        facilityId,
        itemKey as FacilityIndexKey,
        itemId
      );

      await repository.delModifier(modifierKey as ModifiersKey);

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  };
}

export default new FacilityController();
