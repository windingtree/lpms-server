import { Router } from 'express';
import { AppRole } from '../types';
import authMiddleware from '../middlewares/AuthMiddleware';
import roleMiddleware from '../middlewares/RoleMiddleware';
import { descriptorMiddleware } from '../middlewares/ValidationMiddleware';
import facilityItemController from '../controllers/FacilityItemController';

export default (router: Router): void => {
  router.get(
    '/item/:facilityId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    facilityItemController.getAllItems
  );

  router.get(
    '/item/:facilityId/:itemId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    facilityItemController.getOneItem
  );

  router.post(
    '/item/:facilityId/:itemId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    descriptorMiddleware,
    facilityItemController.createItem
  );

  router.put(
    '/item/:facilityId/:itemId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    descriptorMiddleware,
    facilityItemController.updateItem
  );

  router.delete(
    '/item/:facilityId/:itemId',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    facilityItemController.delItem
  );

  router.post(
    '/item/:facilityId/:itemId/mandatory',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    facilityItemController.setMandatory
  );

  router.delete(
    '/item/:facilityId/:itemId/mandatory',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    facilityItemController.delMandatory
  );
};
