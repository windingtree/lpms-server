import os from 'os';
import { Router } from 'express';
import { body, check, param } from 'express-validator';
import multer from 'multer';
import { AppRole } from '../types';
import authMiddleware from '../middlewares/AuthMiddleware';
import roleMiddleware from '../middlewares/RoleMiddleware';
import userController from '../controllers/UserController';
import storageController from '../controllers/StorageController';
import facilityController from '../controllers/FacilityController';
import walletController from '../controllers/WalletController';
import facilityItemController from '../controllers/FacilityItemController';
import { validateBytes32StringRule } from '../rules/Bytes32StringRules';
import { descriptorMiddleware } from '../middlewares/ValidationMiddleware';

const router = Router();
const upload = multer({ dest: os.tmpdir() });

//start users
router.post(
  '/user/login',
  body('login').isString(),
  body('password').isString(),
  userController.login
);

router.get('/user/get-all', authMiddleware, userController.getAll);

router.post(
  '/user/create',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  check('login').isString(),
  check('password').isString(),
  body('roles').isArray({ min: 1 }),
  body('roles.*').isIn([AppRole.STAFF, AppRole.MANAGER]),
  userController.createUser
);

router.put(
  '/user/update-password',
  authMiddleware,
  check('userId').isNumeric(),
  check('password').isString(),
  userController.updateUserPassword
);

router.put(
  '/user/update-roles',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  check('userId').isNumeric(),
  body('roles').isArray({ min: 1 }),
  body('roles.*').isIn([AppRole.STAFF, AppRole.MANAGER]),
  userController.updateUserRoles
);

router.post('/user/refresh', userController.refresh);

router.post('/user/logout', authMiddleware, userController.logout);
//end users

//wallets
router.get('/addresses', walletController.getWallets);
//end wallets

//storage
router.post(
  '/storage/file',
  authMiddleware,
  upload.single('file'),
  storageController.uploadFile
);

router.post(
  '/storage/metadata',
  authMiddleware,
  upload.single('file'),
  storageController.uploadMetadata
);
//end storage

//availability
router.get(
  '/facility/:facilityId/space/:spaceId/availability/:date',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.getSpaceAvailability
);

router.post(
  '/facility/:facilityId/space/:spaceId/availability/:date',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.createSpaceAvailability
);

router.post(
  '/facility/:facilityId/space/:spaceId/availability',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.createDefaultSpaceAvailability
);
//end availability

//modifiers
router.get(
  '/facility/:facilityId/modifier/:modifierKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.getModifierOfFacility
);

router.post(
  '/facility/:facilityId/modifier/:modifierKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  descriptorMiddleware,
  facilityController.createFacilityModifier
);

router.delete(
  '/facility/:facilityId/modifier/:modifierKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.removeModifierOfFacility
);

router.get(
  '/facility/:facilityId/:itemKey/:itemId/modifier/:modifierKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.getModifierOfItem
);

router.post(
  '/facility/:facilityId/:itemKey/:itemId/modifier/:modifierKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  descriptorMiddleware,
  facilityController.createItemModifier
);

router.delete(
  '/facility/:facilityId/:itemKey/:itemId/modifier/:modifierKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.removeModifierOfItem
);
//end modifiers

//rules
router.get(
  '/facility/:facilityId/rule/:ruleKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.getRuleOfFacility
);

router.post(
  '/facility/:facilityId/rule/:ruleKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  descriptorMiddleware,
  facilityController.createFacilityRule
);

router.delete(
  '/facility/:facilityId/rule/:ruleKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.delRuleOfFacility
);

router.get(
  '/facility/:facilityId/spaces/:itemId/rule/:ruleKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.getRuleOfItem
);

router.post(
  '/facility/:facilityId/spaces/:itemId/rule/:ruleKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  descriptorMiddleware,
  facilityController.createItemRule
);

router.delete(
  '/facility/:facilityId/spaces/:itemId/rule/:ruleKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.delRuleOfItem
);
//end rules

//activate/deactivate services of facility
router.post(
  '/facility/:facilityId/activate',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.activateServices
);

router.post(
  '/facility/:facilityId/deactivate',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.deactivateServices
);
//end activate/deactivate services of facility

//facility
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
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.get
);

router.post(
  '/facility/:facilityId',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.update
);

router.delete(
  '/facility/:facilityId',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.delete
);

router.get(
  '/facility/:facilityId/:itemKey',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityItemController.getAllItems
);

router.get(
  '/facility/:facilityId/:itemKey/:itemId',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityItemController.getOneItem
);

router.post(
  '/facility/:facilityId/:itemKey/:itemId',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  descriptorMiddleware,
  facilityItemController.createItem
);

router.put(
  '/facility/:facilityId/:itemKey/:itemId',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  descriptorMiddleware,
  facilityItemController.updateItem
);

router.delete(
  '/facility/:facilityId/:itemKey/:itemId',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityItemController.delItem
);
//end facility

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
