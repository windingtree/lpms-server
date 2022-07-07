import { RouterInitializer } from '../types';
import { Router } from 'express';

import usersRoutes from './users';
import walletRoutes from './wallet';
import storageRoutes from './storage';
import itemAvailabilityRoutes from './itemAvailability';
import modifiersRoutes from './modifiers';
import rulesRoutes from './rules';
import facilityRoutes from './facility';
import itemRoutes from './items';
import stubsRoutes from './stubs';
import termRoutes from './terms';

const routes: RouterInitializer[] = [
  usersRoutes,
  walletRoutes,
  storageRoutes,
  itemAvailabilityRoutes,
  modifiersRoutes,
  rulesRoutes,
  facilityRoutes,
  itemRoutes,
  stubsRoutes,
  termRoutes
];

const router = Router();

routes.forEach((initializer) => initializer(router));

export default router;
