import os from 'os';
import { Router } from 'express';
import { body, check } from 'express-validator';
import multer from 'multer';
import { AppRole } from '../types';
import authMiddleware from '../middlewares/AuthMiddleware';
import roleMiddleware from '../middlewares/RoleMiddleware';
import userController from '../controllers/UserController';
import storageController from '../controllers/StorageController';
import facilityController from '../controllers/FacilityController';
import walletController from '../controllers/WalletController';

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
 *         description: Availability date formatted as SQL date: "yyyy-MM-dd"
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
 *         description: Availability date formatted as SQL date: "yyyy-MM-dd"
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
 *         description: The facility Id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: spaceId
 *         required: true
 *         description: The facility space Id
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
 *         description: The facility Id
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
 *         description: The facility Id
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
 *         description: The item Id
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
  facilityController.getModifierOfItem
);
