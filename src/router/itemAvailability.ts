import { Router } from 'express';
import authMiddleware from '../middlewares/AuthMiddleware';
import facilityController from '../controllers/FacilityController';

export default (router: Router): void => {
  router.get(
    '/availability/:facilityId/:itemId/:date',
    authMiddleware,
    facilityController.getItemAvailability
  );

  router.post(
    '/availability/:facilityId/:itemId/:date',
    authMiddleware,
    facilityController.createItemAvailability
  );

  router.post(
    '/availability/:facilityId/:itemId',
    authMiddleware,
    facilityController.createDefaultItemAvailability
  );
};
