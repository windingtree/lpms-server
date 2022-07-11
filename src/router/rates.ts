import { Router } from 'express';
import authMiddleware from '../middlewares/AuthMiddleware';
import rateController from '../controllers/RateController';

export default (router: Router): void => {
  router.get(
    '/rate/:facilityId/:itemType/:itemId/:key',
    authMiddleware,
    rateController.getRate
  );

  router.post(
    '/rate/:facilityId/:itemType/:itemId/:key',
    authMiddleware,
    rateController.setRate
  );
};
