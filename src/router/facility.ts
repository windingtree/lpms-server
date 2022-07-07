import { Router } from 'express';
import { AppRole } from '../types';
import authMiddleware from '../middlewares/AuthMiddleware';
import roleMiddleware from '../middlewares/RoleMiddleware';
import facilityController from '../controllers/FacilityController';

export default (router: Router): void => {
  router.get(
    '/facility',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    facilityController.getAll
  );

  router.get(
    '/facility/:facilityId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    facilityController.get
  );

  router.post(
    '/facility/:facilityId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    facilityController.update
  );

  router.delete(
    '/facility/:facilityId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    facilityController.delete
  );

  router.post(
    '/facility/:facilityId/activate',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    facilityController.activateServices
  );

  router.post(
    '/facility/:facilityId/deactivate',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    facilityController.deactivateServices
  );
};
