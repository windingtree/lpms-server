import { Router } from 'express';
import authMiddleware from '../middlewares/AuthMiddleware';
import { descriptorMiddleware } from '../middlewares/ValidationMiddleware';
import facilityController from '../controllers/FacilityController';

export default (router: Router): void => {
  router.get(
    '/rule/:facilityId/:ruleKey',
    authMiddleware,
    facilityController.getRuleOfFacility
  );

  router.post(
    '/rule/:facilityId/:ruleKey',
    authMiddleware,
    descriptorMiddleware,
    facilityController.createFacilityRule
  );

  router.delete(
    '/rule/:facilityId/:ruleKey',
    authMiddleware,
    facilityController.delRuleOfFacility
  );

  router.get(
    '/rule/:facilityId/:itemId/:ruleKey',
    authMiddleware,
    facilityController.getRuleOfItem
  );

  router.post(
    '/rule/:facilityId/:itemId/:ruleKey',
    authMiddleware,
    descriptorMiddleware,
    facilityController.createItemRule
  );

  router.delete(
    '/rule/:facilityId/:itemId/:ruleKey',
    authMiddleware,
    facilityController.delRuleOfItem
  );
};
