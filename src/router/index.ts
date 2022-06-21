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

const router = Router();

/**
 * @swagger
 * /user/login:
 *  post:
 *    summary: get access token
 *    tags: [Auth service]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *                login:
 *                  type: string
 *                  description: user's login
 *                password:
 *                  type: string
 *                  description: user's password
 *
 *    responses:
 *      200:
 *        description: It's ok
 *      400:
 *        description: Handled Error
 *      500:
 *        description: Some server error
 */
router.post(
  '/user/login',
  body('login').isString(),
  body('password').isString(),
  userController.login
);

/**
 * @swagger
 * /user/get-all:
 *   get:
 *     summary: get all users
 *     tags: [Auth service]
 *     responses:
 *       200:
 *         description: get all users
 *       401:
 *         description: User is not Auth
 */
router.get('/user/get-all', authMiddleware, userController.getAll);

/**
 * @swagger
 * /user/create:
 *  post:
 *    security:
 *       - bearerAuth: []
 *    summary: create a new user (only for manager role)
 *    tags: [Auth service]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *                login:
 *                  type: string
 *                  description: user's login
 *                password:
 *                  type: string
 *                  description: user's password
 *                roles:
 *                  type: array
 *                  items:
 *                    type: string
 *                    enum: [manager, staff]
 *                  description: roles (staff, manager)
 *    responses:
 *      200:
 *        description: It's ok
 *      400:
 *        description: Handled Error
 *      401:
 *        description: User is not Auth
 *      403:
 *        description: Access denied
 *      500:
 *        description: Some server error
 */
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

/**
 * @swagger
 * /user/update-password:
 *  put:
 *    security:
 *       - bearerAuth: []
 *    summary: update password
 *    tags: [Auth service]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *                userId:
 *                  type: number
 *                  description: user's id
 *                password:
 *                  type: string
 *                  description: new user password
 *    responses:
 *      200:
 *        description: It's ok
 *      400:
 *        description: Handled Error
 *      401:
 *        description: User is not Auth
 *      403:
 *        description: Access denied
 *      500:
 *        description: Some server error
 */
router.put(
  '/user/update-password',
  authMiddleware,
  check('userId').isNumeric(),
  check('password').isString(),
  userController.updateUserPassword
);

/**
 * @swagger
 * /user/update-roles:
 *  put:
 *    security:
 *       - bearerAuth: []
 *    summary: update role (only for manager role)
 *    tags: [Auth service]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *                userId:
 *                  type: number
 *                  description: user's id
 *                roles:
 *                  type: array
 *                  items:
 *                    type: string
 *                    enum: [manager, staff]
 *                  description: roles (staff, manager)
 *    responses:
 *      200:
 *        description: It's ok
 *      400:
 *        description: Handled Error
 *      401:
 *        description: User is not Auth
 *      403:
 *        description: Access denied
 *      500:
 *        description: Some server error
 */
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

/**
 * @swagger
 * /user/logout:
 *  post:
 *    security:
 *       - bearerAuth: []
 *    summary: logout
 *    tags: [Auth service]
 *    responses:
 *      200:
 *        description: It's ok
 *      400:
 *        description: Handled Error
 *      401:
 *        description: User is not Auth
 *      500:
 *        description: Some server error
 */
router.post('/user/logout', authMiddleware, userController.logout);

/**
 * @swagger
 * /addresses:
 *   get:
 *     summary: get all addresses
 *     tags: [Auth service]
 *     responses:
 *       200:
 *         description: get all users
 *       401:
 *         description: User is not Auth
 */
router.get('/addresses', walletController.getWallets);

const upload = multer({ dest: os.tmpdir() });

/**
 * @swagger
 * /storage/file:
 *  post:
 *    security:
 *      - bearerAuth: []
 *    summary: file
 *    tags: [Storage service]
 *    requestBody:
 *      required: true
 *      content:
 *        multipart/form-data:
 *          schema:
 *            type: object
 *            properties:
 *              filename:
 *                type: array
 *                items:
 *                  type: string
 *                  format: binary
 *    responses:
 *      200:
 *        description: It's ok
 *      400:
 *        description: Handled Error
 *      401:
 *        description: User is not Auth
 *      403:
 *        description: Access denied
 *      500:
 *        description: Some server error
 */
router.post(
  '/storage/file',
  authMiddleware,
  upload.single('file'),
  storageController.uploadFile
);

/**
 * @swagger
 * /storage/metadata:
 *  post:
 *    security:
 *      - bearerAuth: []
 *    summary: file
 *    tags: [Storage service]
 *    requestBody:
 *      required: true
 *      content:
 *        multipart/form-data:
 *          schema:
 *            type: object
 *            properties:
 *              filename:
 *                type: array
 *                items:
 *                  type: string
 *                  format: binary
 *    responses:
 *      200:
 *        description: It's ok
 *      400:
 *        description: Handled Error
 *      401:
 *        description: User is not Auth
 *      403:
 *        description: Access denied
 *      500:
 *        description: Some server error
 */
router.post(
  '/storage/metadata',
  authMiddleware,
  upload.single('file'),
  storageController.uploadMetadata
);

export default router;

/**
 * @swagger
 * /facility/{facilityId}/space/{spaceId}/availability/{date}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: get availability by date
 *     tags: [Facility service, availability]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility Id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: spaceId
 *         description: The facility space Id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: date
 *         description: Availability date formatted as SQL date - "yyyy-MM-dd"
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 numSpaces:
 *                   type: number
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.get(
  '/facility/:facilityId/space/:spaceId/availability/:date',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.getSpaceAvailability
);

/**
 * @swagger
 * /facility/{facilityId}/space/{spaceId}/availability/{date}:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: add availability of the space at date
 *     tags: [Facility service, availability]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numSpaces:
 *                 type: number
 *                 description: Number of available spaces to add
 *             required:
 *               - numSpaces
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility Id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: spaceId
 *         description: The facility space Id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: date
 *         description: Availability date formatted as SQL date - "yyyy-MM-dd"
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       500:
 *         description: Some server error
 */
router.post(
  '/facility/:facilityId/space/:spaceId/availability/:date',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.createSpaceAvailability
);

/**
 * @swagger
 * /facility/{facilityId}/space/{spaceId}/availability:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: add/update default availability of the space
 *     tags: [Facility service, availability]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numSpaces:
 *                 type: number
 *                 description: Number of available spaces to add
 *             required:
 *               - numSpaces
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: spaceId
 *         required: true
 *         description: The facility space id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       500:
 *         description: Some server error
 */
router.post(
  '/facility/:facilityId/space/:spaceId/availability',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.createDefaultSpaceAvailability
);

/**
 * @swagger
 * /facility/{facilityId}/modifier/{modifierKey}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: get modifier of the facility
 *     tags: [Facility service, modifiers]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: modifierKey
 *         description: The facility modifier key
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["day_of_week", "occupancy", "length_of_stay"]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               # @todo Add definition of DayOfWeekRateModifer, OccupancyRateModifier, LOSRateModifier
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.get(
  '/facility/:facilityId/modifier/:modifierKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.getModifierOfFacility
);

/**
 * @swagger
 * /facility/{facilityId}/{itemKey}/{itemId}/modifier/{modifierKey}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: get modifier of the item kind of space or otherItems
 *     tags: [Facility service, modifiers]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemKey
 *         description: Type of item
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["spaces", "otherItems"]
 *       - in: path
 *         name: itemId
 *         description: The item id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: modifierKey
 *         description: The facility modifier key
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["day_of_week", "occupancy", "length_of_stay"]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               # @todo Add definition of DayOfWeekRateModifer, OccupancyRateModifier, LOSRateModifier
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.get(
  '/facility/:facilityId/:itemKey/:itemId/modifier/:modifierKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.getModifierOfItem
);

/**
 * @swagger
 * /facility/{facilityId}/modifier/{modifierKey}:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: add modifier to the facility
 *     tags: [Facility service, modifiers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             # @todo Add definition of DayOfWeekRateModifer, OccupancyRateModifier, LOSRateModifier
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: modifierKey
 *         description: The facility modifier key
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["day_of_week", "occupancy", "length_of_stay"]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.post(
  '/facility/:facilityId/modifier/:modifierKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.createFacilityModifier
);

/**
 * @swagger
 * /facility/{facilityId}/{itemKey}/{itemId}/modifier/{modifierKey}:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: add modifier to the facility
 *     tags: [Facility service, modifiers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             # @todo Add definition of DayOfWeekRateModifer, OccupancyRateModifier, LOSRateModifier
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemKey
 *         description: Type of item
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["spaces", "otherItems"]
 *       - in: path
 *         name: itemId
 *         description: The item id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: modifierKey
 *         description: The facility modifier key
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["day_of_week", "occupancy", "length_of_stay"]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.post(
  '/facility/:facilityId/:itemKey/:itemId/modifier/:modifierKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.createItemModifier
);

/**
 * @swagger
 * /facility/{facilityId}/modifier/{modifierKey}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: remove modifier from the facility
 *     tags: [Facility service, modifiers]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: modifierKey
 *         description: The facility modifier key
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["day_of_week", "occupancy", "length_of_stay"]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.delete(
  '/facility/:facilityId/modifier/:modifierKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.removeModifierOfFacility
);

/**
 * @swagger
 * /facility/{facilityId}/{itemKey}/{itemId}/modifier/{modifierKey}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: remove modifier of the item kind of space or otherItems
 *     tags: [Facility service, modifiers]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemKey
 *         description: Type of item
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["spaces", "otherItems"]
 *       - in: path
 *         name: itemId
 *         description: The item id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: modifierKey
 *         description: The facility modifier key
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["day_of_week", "occupancy", "length_of_stay"]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.delete(
  '/facility/:facilityId/:itemKey/:itemId/modifier/:modifierKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.removeModifierOfItem
);

/**
 * @swagger
 * /facility/{facilityId}/rule/{ruleKey}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: get rule of the facility
 *     tags: [Facility service, rules]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: ruleKey
 *         description: The facility rule key
 *         required: true
 *         schema:
 *           type: string
 *           enum: ['notice_required', 'length_of_stay']
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.get(
  '/facility/:facilityId/rule/:ruleKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.getRuleOfFacility
);

/**
 * @swagger
 * /facility/{facilityId}/spaces/{itemId}/rule/{ruleKey}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: get rule of the item kind of space or otherItems
 *     tags: [Facility service, rules]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         description: The item id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: ruleKey
 *         description: The facility rule key
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["day_of_week", "occupancy", "length_of_stay"]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               # @todo Add definition of DayOfWeekRateModifer, OccupancyRateModifier, LOSRateModifier
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.get(
  '/facility/:facilityId/spaces/:itemId/rule/:ruleKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.getRuleOfItem
);

/**
 * @swagger
 * /facility/{facilityId}/rule/{ruleKey}:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: add rule to the facility
 *     tags: [Facility service, rules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: ruleKey
 *         description: The facility rule key
 *         required: true
 *         schema:
 *           type: string
 *           enum: ['notice_required', 'length_of_stay']
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.post(
  '/facility/:facilityId/rule/:ruleKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.createFacilityRule
);

/**
 * @swagger
 * /facility/{facilityId}/spaces/{itemId}/rule/{ruleKey}:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: add rule to the facility
 *     tags: [Facility service, rules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         description: The item id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: ruleKey
 *         description: The facility rule key
 *         required: true
 *         schema:
 *           type: string
 *           enum: ['notice_required', 'length_of_stay']
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.post(
  '/facility/:facilityId/spaces/:itemId/rule/:ruleKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.createItemRule
);

/**
 * @swagger
 * /facility/{facilityId}/rule/{ruleKey}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: remove rule from the facility
 *     tags: [Facility service, rules]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: ruleKey
 *         description: The facility rule key
 *         required: true
 *         schema:
 *           type: string
 *           enum: ['notice_required', 'length_of_stay']
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.delete(
  '/facility/:facilityId/rule/:ruleKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.delRuleOfFacility
);

/**
 * @swagger
 * /facility/{facilityId}/spaces/{itemId}/rule/{ruleKey}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: remove rule of the item kind of space or otherItems
 *     tags: [Facility service, rules]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         description: The item id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: ruleKey
 *         description: The facility rule key
 *         required: true
 *         schema:
 *           type: string
 *           enum: ['notice_required', 'length_of_stay']
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.delete(
  '/facility/:facilityId/spaces/:itemId/rule/:ruleKey',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.delRuleOfItem
);

/**
 * @swagger
 * /facility/{facilityId}/activate:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: activate facility services for facility by id
 *     tags: [Facility service]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.post(
  '/facility/:facilityId/activate',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.activateServices
);

/**
 * @swagger
 * /facility/{facilityId}/deactivate:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: deactivate facility services for facility by id
 *     tags: [Facility service]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.post(
  '/facility/:facilityId/deactivate',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.deactivateServices
);

/**
 * @swagger
 * /facility:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: get all facilities
 *     tags: [Facility service]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               # @todo array of facilities
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.get(
  '/facility',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  facilityController.getAll
);

/**
 * @swagger
 * /facility/{facilityId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: get facility metadata
 *     tags: [Facility service]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               # @todo 1 facility
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.get(
  '/facility/:facilityId',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.get
);

/**
 * @swagger
 * /facility/{facilityId}:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: update the facility Id metadata
 *     tags: [Facility service]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.post(
  '/facility/:facilityId',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.update
);

/**
 * @swagger
 * /facility/{facilityId}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: update
 *     tags: [Facility service]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.delete(
  '/facility/:facilityId',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.delete
);

/**
 * @swagger
 * /facility/{facilityId}/{itemKey}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: get all facilities
 *     tags: [Facility service]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemKey
 *         description: The item key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               # @todo array of items
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.get(
  '/facility/:facilityId/:itemKey',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityItemController.getAllItems
);

/**
 * @swagger
 * /facility/{facilityId}/{itemKey}/{itemId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: get item metadata
 *     tags: [Facility service]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemKey
 *         description: The item key
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         description: The item id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               # @todo item metadata
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.get(
  '/facility/:facilityId/:itemKey/:itemId',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityItemController.getOneItem
);

/**
 * @swagger
 * /facility/{facilityId}/{itemKey}/{itemId}:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: create item metadata
 *     tags: [Facility service]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemKey
 *         description: The item key
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         description: The item id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.post(
  '/facility/:facilityId/:itemKey/:itemId',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityItemController.createItem
);

/**
 * @swagger
 * /facility/{facilityId}/{itemKey}/{itemId}:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: update item metadata
 *     tags: [Facility service]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemKey
 *         description: The item key
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         description: The item id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.put(
  '/facility/:facilityId/:itemKey/:itemId',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityItemController.updateItem
);

/**
 * @swagger
 * /facility/{facilityId}/{itemKey}/{itemId}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: delete item metadata
 *     tags: [Facility service]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemKey
 *         description: The item key
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         description: The item id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.delete(
  '/facility/:facilityId/:itemKey/:itemId',
  authMiddleware,
  roleMiddleware([AppRole.MANAGER]),
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityItemController.delItem
);

/**
 * @swagger
 * /facility/{facilityId}/stub:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: get all facility stubs (page, )
 *     tags: [Facility service]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: index
 *         description: index, default = 0
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: perPage
 *         description: elements of page, default 10
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.get(
  '/facility/:facilityId/stub',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.getAllFacilityStubs
);

/**
 * @swagger
 * /facility/{facilityId}/stub/:date:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: create item metadata
 *     tags: [Facility service]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: date
 *         description: date YYYY-MM-DD
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.get(
  '/facility/:facilityId/stub/:date',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityController.getFacilityStubsByDate
);

/**
 * @swagger
 * /facility/{facilityId}/space/{itemId}/stub/{date}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: stubs of space by date
 *     tags: [Facility service]
 *     parameters:
 *       - in: path
 *         name: facilityId
 *         description: The facility id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         description: The item id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: date
 *         description: date YYYY-MM-DD
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: User is not Auth
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not Found
 *       500:
 *         description: Some server error
 */
router.get(
  '/facility/:facilityId/space/:itemId/stub/:date',
  authMiddleware,
  param('facilityId').custom((v) => validateBytes32StringRule(v)),
  facilityItemController.delItem
);
