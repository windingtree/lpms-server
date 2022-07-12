import { Router } from 'express';
import authMiddleware from '../middlewares/AuthMiddleware';
import roleMiddleware from '../middlewares/RoleMiddleware';
import { AppRole } from '../types';
import termController from '../controllers/TermController';

export default (router: Router): void => {
  router.get(
    '/term/:facilityId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    termController.getAllTerms
  );

  router.get(
    '/term/:facilityId/:termId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    termController.getTerm
  );

  router.post(
    '/term/:facilityId/:termId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    termController.setTerm
  );

  router.delete(
    '/term/:facilityId/:termId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    termController.delTerm
  );

  router.get(
    '/term/:facilityId/item/:itemId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    termController.getAllItemTerms
  );

  router.post(
    '/term/:facilityId/item/:itemId/:termId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    termController.setItemTerm
  );

  router.delete(
    '/term/:facilityId/item/:itemId/:termId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    termController.delItemTerm
  );

  router.post(
    '/term/:facilityId/:itemId/mandatory',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    termController.setMandatory
  );

  router.delete(
    '/term/:facilityId/:itemId/mandatory',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    termController.delMandatory
  );
};
