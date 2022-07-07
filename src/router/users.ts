import { AppRole } from '../types';
import { Router } from 'express';
import { body, check } from 'express-validator';
import userController from '../controllers/UserController';
import authMiddleware from '../middlewares/AuthMiddleware';
import roleMiddleware from '../middlewares/RoleMiddleware';

export default (router: Router): void => {
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

  router.delete(
    '/user',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    check('userId').isNumeric(),
    userController.deleteUser
  );

  router.post('/user/refresh', userController.refresh);

  router.post('/user/logout', authMiddleware, userController.logout);
};
