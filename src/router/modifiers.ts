import { Router } from 'express';
import authMiddleware from '../middlewares/AuthMiddleware';
import facilityController from '../controllers/FacilityController';
import { descriptorMiddleware } from '../middlewares/ValidationMiddleware';

export default (router: Router): void => {
  router.get(
    '/modifier/:facilityId/:modifierKey',
    authMiddleware,
    facilityController.getModifierOfFacility
  );

  router.post(
    '/modifier/:facilityId/:modifierKey',
    authMiddleware,
    descriptorMiddleware,
    facilityController.createFacilityModifier
  );

  router.delete(
    '/modifier/:facilityId/:modifierKey',
    authMiddleware,
    facilityController.removeModifierOfFacility
  );

  router.get(
    '/modifier/:facilityId/:itemId/:modifierKey',
    authMiddleware,
    facilityController.getModifierOfItem
  );

  router.post(
    '/modifier/:facilityId/:itemId/:modifierKey',
    authMiddleware,
    descriptorMiddleware,
    facilityController.createItemModifier
  );

  router.delete(
    '/modifier/:facilityId/:itemId/:modifierKey',
    authMiddleware,
    facilityController.removeModifierOfItem
  );
};
