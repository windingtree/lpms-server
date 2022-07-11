import { Router } from 'express';
import authMiddleware from '../middlewares/AuthMiddleware';
import facilityController from '../controllers/FacilityController';
import facilityItemController from '../controllers/FacilityItemController';

export default (router: Router): void => {
  router.get(
    '/stub/:facilityId',
    authMiddleware,
    facilityController.getAllFacilityStubs
  );

  router.get(
    '/stub/:facilityId/:date',
    authMiddleware,
    facilityController.getFacilityStubsByDate
  );

  router.get(
    '/stub/:facilityId/:itemId/:date',
    authMiddleware,
    facilityItemController.getStubsByDate
  );
};
