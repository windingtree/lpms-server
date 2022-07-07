import { removeTestDB } from './common';

describe('Wallet Service', async () => {
  after(removeTestDB);
  it('throws error when requesting wallet from uninitialized service');
});
