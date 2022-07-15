import type { NextFunction, Request, Response } from 'express';
import ApiError from '../exceptions/ApiError';
import facilityService from '../services/FacilityService';
import facilityRepository from '../repositories/FacilityRepository';
import { ItemType } from '../proto/facility';
import stubService from '../services/StubService';
import mandatoryRepository from '../repositories/MandatoryRepository';
import { ItemDBValue } from '../types';

export class FacilityItemController {
  getAllItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId } = req.params;

      const items = await facilityService.getFacilityDbKeyValues(
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

      const item = await facilityRepository.getItemKey<ItemDBValue>(
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

      return res.json(item);
    } catch (e) {
      next(e);
    }
  };

  createItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId, itemId } = req.params;
      const { name, description, photos, type, payload } = req.body;

      if (
        await facilityRepository.getItemKey<ItemDBValue>(
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

      const metadata: ItemDBValue = {
        name,
        description,
        photos,
        type,
        ...(type === ItemType.SPACE ? { payload } : {})
      };

      await facilityService.setItemDbKeys(facilityId, 'items', itemId, [
        ['metadata', metadata]
      ]);

      await facilityService.saveFacilityMetadata(facilityId);

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
        !(await facilityRepository.getItemKey<ItemDBValue>(
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
        ...(type === ItemType.SPACE ? { payload } : {})
      };

      await facilityService.setItemDbKeys(facilityId, 'items', itemId, [
        ['metadata', metadata]
      ]);

      await facilityService.saveFacilityMetadata(facilityId);

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  };

  delItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId, itemId } = req.params;

      if (
        !(await facilityRepository.getItemKey<ItemDBValue>(
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

      await facilityService.saveFacilityMetadata(facilityId);

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  };

  async getStubsByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityId, itemId } = req.params;
      const { date } = req.body;

      const stubs = await stubService.getItemStubsByDate(
        facilityId,
        itemId,
        date
      );

      return res.json(stubs);
    } catch (e) {
      next(e);
    }
  }

  public async setMandatory(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityId, itemId } = req.params;
      const { ids } = req.body;

      const itemIds = (await facilityRepository.getFacilityKey(
        facilityId,
        'items'
      )) as string[];

      for (const id of ids) {
        if (!itemIds.includes(id)) {
          throw ApiError.NotFound(
            `Item ${id} not found in facility ${facilityId}`
          );
        }
      }

      await mandatoryRepository.addIds(facilityId, itemId, 'items', ids);

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  public async delMandatory(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityId, itemId } = req.params;
      const { ids } = req.body;

      await mandatoryRepository.delIds(facilityId, itemId, 'items', ids);

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
}

export default new FacilityItemController();
