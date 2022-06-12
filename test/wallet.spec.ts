import { expect } from 'chai';
import supertest from 'supertest';
import ServerService from '../src/services/ServerService';
import { AppRole, walletAccountsIndexes } from '../src/types';
import userService from '../src/services/UserService';
import userRepository from '../src/repositories/UserRepository';
import WalletService from '../src/services/WalletService';

describe('WalletService', async () => {
  it('throws error when requesting wallet from uninitialized service');
});
