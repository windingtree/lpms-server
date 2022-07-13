import { Router } from 'express';
import authMiddleware from '../middlewares/AuthMiddleware';
import rateController from '../controllers/RateController';

export default (router: Router): void => {
  router.get(
    '/rate/:facilityId/:itemId/:key/:rateType',
    authMiddleware,
    rateController.getRate
  );

  router.post(
    '/rate/:facilityId/:itemId/:key/:rateType',
    authMiddleware,
    rateController.setRate
  );
};
