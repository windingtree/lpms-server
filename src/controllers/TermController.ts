import { NextFunction, Request, Response } from 'express';
import termRepository from '../repositories/TermRepository';
import termService from '../services/TermService';

export class TermController {
  public async getAllTerms(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityId } = req.params;
      await termService.getAllFacilityTerms(facilityId);

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  public async getTerm(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityId, termId } = req.params;
      await termRepository.getTerm(facilityId, termId);

      return res.json({ success: true });
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
      const { facilityId, itemId } = req.params;
      const { termId } = req.body;

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
      const { facilityId, itemId } = req.params;
      const { termId } = req.body;

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
