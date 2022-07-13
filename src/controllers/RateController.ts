import { NextFunction, Request, Response } from 'express';
import { DBType, RateRepository } from '../repositories/RateRepository';
import { DefaultOrDateItemKey, FormattedDate } from '../services/DBService';
import { Rates } from '../proto/lpms';
import ApiError from '../exceptions/ApiError';

export class RateController {
  public async getRate(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityId, rateType, itemId, key } = req.params;

      const rateRepository = new RateRepository(facilityId, itemId);

      const rate = await rateRepository.getRate(
        key as DefaultOrDateItemKey,
        rateType as DBType
      );

      if (!rate) {
        throw ApiError.NotFound(
          `rate ${key} not exist in facility ${facilityId} ${rateType} ${itemId}`
        );
      }

      return res.json(rate);
    } catch (e) {
      next(e);
    }
  }

  public async setRate(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityId, rateType, itemId, key } = req.params;
      const { cost } = req.body;
      const rateRepository = new RateRepository(facilityId, itemId);

      const rate: Rates = {
        cost
      };

      if (key === 'default') {
        await rateRepository.setRateDefault(rate, rateType as DBType);
      } else {
        await rateRepository.setRate(
          key as FormattedDate,
          rate,
          rateType as DBType
        );
      }

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
}

export default new RateController();
