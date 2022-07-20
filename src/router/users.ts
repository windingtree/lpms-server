import { AppRole } from '../types';
import { Router } from 'express';
import userController from '../controllers/UserController';
import authMiddleware from '../middlewares/AuthMiddleware';
import roleMiddleware from '../middlewares/RoleMiddleware';

export default (router: Router): void => {
  router.post('/user/login', userController.login);

  router.get('/user/get-all', authMiddleware, userController.getAll);

  router.post(
    '/user/create',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    userController.createUser
  );

  router.put(
    '/user/update-password',
    authMiddleware,
    userController.updateUserPassword
  );

  router.put(
    '/user/update-roles',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    userController.updateUserRoles
  );

  router.delete(
    '/user',
    authMiddleware,
    roleMiddleware([AppRole.MANAGER]),
    userController.deleteUser
  );

  router.post('/user/refresh', userController.refresh);

  router.post('/user/logout', authMiddleware, userController.logout);
};
