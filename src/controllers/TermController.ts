import { NextFunction, Request, Response } from 'express';
import termRepository from '../repositories/TermRepository';
import termService from '../services/TermService';
import ApiError from '../exceptions/ApiError';

export class TermController {
  public async getAllTerms(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityId } = req.params;
      const terms = await termService.getAllFacilityTerms(facilityId);

      return res.json(terms);
    } catch (e) {
      next(e);
    }
  }

  public async getTerm(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityId, termId } = req.params;
      const term = await termRepository.getTerm(facilityId, termId);

      if (!term) {
        throw ApiError.NotFound(
          `term ${termId} not exist in facility ${facilityId}`
        );
      }

      return res.json(term);
    } catch (e) {
      next(e);
    }
  }

  public async setTerm(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityId, termId } = req.params;

      await termService.setTerm(facilityId, termId, req.body);

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  public async delTerm(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityId, termId } = req.params;

      if (await termService.checkExistTermInItems(facilityId, termId)) {
        throw ApiError.BadRequest(`Term ${termId} exist in items`);
      }

      await termService.delTerm(facilityId, termId);

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  public async getAllItemTerms(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { facilityId, itemId } = req.params;

      const terms = await termService.getAllItemTerms(
        facilityId,
        'items',
        itemId
      );

      return res.json(terms);
    } catch (e) {
      next(e);
    }
  }

  public async setItemTerm(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityId, itemId, termId } = req.params;

      await termRepository.addTermToItemIndex(
        facilityId,
        'items',
        itemId,
        termId
      );

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  public async delItemTerm(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityId, itemId, termId } = req.params;

      await termRepository.delTermFromItemIndex(
        facilityId,
        'items',
        itemId,
        termId
      );

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
}

export default new TermController();
