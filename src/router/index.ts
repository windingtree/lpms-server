import { RouterInitializer } from '../types';
import { Router } from 'express';

import usersRoutes from './users';

const routes: RouterInitializer[] = [usersRoutes];

const router = Router();

routes.forEach((initializer) => initializer(router));

export default router;
