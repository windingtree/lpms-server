import type { NextFunction, Request, Response } from 'express';
import ApiError from '../exceptions/ApiError';
import facilityService from '../services/FacilityService';
import facilityRepository from '../repositories/FacilityRepository';
import { Item, ItemType, Space } from '../proto/facility';
import { validationResult } from 'express-validator';
import { FacilitySubLevels } from '../services/DBService';
import stubService from '../services/StubService';

export class FacilityItemController {
  getAllItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId } = req.params;

      const items = await facilityService.getAllFacilityItems(
        facilityId,
        'items'
      );

      return res.json(items);
    } catch (e) {
      next(e);
    }
  };

  getOneItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId, itemId } = req.params;

      const item = await facilityRepository.getItemKey<Item>(
        facilityId,
        'items',
        itemId,
        'metadata'
      );

      if (!item) {
        throw ApiError.NotFound(
          `Unable to get the item ${itemId} facility ${facilityId}`
        );
      }

      return res.json(facilityService.decodeItem(item));
    } catch (e) {
      next(e);
    }
  };

  createItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId, itemId } = req.params;
      const { name, description, photos, type, payload } = req.body;

      if (
        await facilityRepository.getItemKey<Item>(
          facilityId,
          'items',
          itemId,
          'metadata'
        )
      ) {
        throw ApiError.BadRequest(
          `The item: ${itemId} in facility ${facilityId} already exist`
        );
      }

      let metadata;

      if (type === ItemType.SPACE) {
        metadata = {
          name,
          description,
          photos,
          type,
          payload: Space.toBinary(payload)
        };
      } else {
        metadata = {
          name,
          description,
          photos,
          type
        };
      }

      await facilityService.setItemDbKeys(facilityId, 'items', itemId, [
        ['metadata', metadata]
      ]);

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  };

  updateItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId, itemId } = req.params;
      const { name, description, photos, type, payload } = req.body;

      if (
        !(await facilityRepository.getItemKey<Item>(
          facilityId,
          'items',
          itemId,
          'metadata'
        ))
      ) {
        throw ApiError.BadRequest(
          `The item ${itemId} in facility ${facilityId} not exist`
        );
      }

      const metadata = {
        name,
        description,
        photos,
        type,
        payload: Space.toBinary(payload)
      };

      await facilityService.setItemDbKeys(facilityId, 'items', itemId, [
        ['metadata', metadata]
      ]);

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  };

  delItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId, itemId } = req.params;

      if (
        !(await facilityRepository.getItemKey<Item>(
          facilityId,
          'items',
          itemId,
          'metadata'
        ))
      ) {
        throw ApiError.BadRequest(
          `The item ${itemId} in facility ${facilityId} not exist`
        );
      }

      await facilityService.delItemMetadata(facilityId, 'items', itemId);

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  };

  async getStubsByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityId, itemId } = req.params;
      const { date } = req.body;

      const stubs = await stubService.getSpaceStubsByDate(
        facilityId,
        itemId,
        date
      );

      return res.json(stubs);
    } catch (e) {
      next(e);
    }
  }
}

export default new FacilityItemController();
