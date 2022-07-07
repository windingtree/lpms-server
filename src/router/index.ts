import { Router } from 'express';
import { param } from 'express-validator';
import authMiddleware from '../middlewares/AuthMiddleware';
import facilityController from '../controllers/FacilityController';
import facilityItemController from '../controllers/FacilityItemController';
import { validateBytes32StringRule } from '../rules/Bytes32StringRules';

import usersRoutes from './users';
import walletRoutes from './wallet';
import storageRoutes from './storage';
import itemAvailabilityRoutes from './itemAvailability';
import modifiersRoutes from './modifiers';
import rulesRoutes from './rules';
import facilityRoutes from './facility';
import itemRoutes from './items';

const router = Router();

// Auth and users APIs
usersRoutes(router);

// Wallet APIs
walletRoutes(router);

// Storage (IPFS) APIs
storageRoutes(router);

// Item availability APIs
itemAvailabilityRoutes(router);

// Modifiers APIs
modifiersRoutes(router);

// Rules APIs
rulesRoutes(router);

// Facility APIs
facilityRoutes(router);

// Item APIs
itemRoutes(router);

//stub
router.get(
  '/facility/:facilityId/stub',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.getAllFacilityStubs
);

router.get(
  '/facility/:facilityId/stub/:date',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.getFacilityStubsByDate
);

router.get(
  '/facility/:facilityId/space/:itemId/stub/:date',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityItemController.delItem
);
//stubs

export default router;
