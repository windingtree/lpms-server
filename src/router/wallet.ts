import { Router } from 'express';
import walletController from '../controllers/WalletController';

export default (router: Router): void => {
  router.get('/addresses', walletController.getWallets);
};
