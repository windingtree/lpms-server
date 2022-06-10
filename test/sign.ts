import { BigNumber, constants, utils, Wallet } from 'ethers';
import { generateBidLine } from '../src/utils';

const wallet = Wallet.createRandom();

(async () => {
  console.log(
    await generateBidLine(
      wallet,
      utils.keccak256(utils.toUtf8Bytes('test')),
      utils.keccak256(utils.toUtf8Bytes('service provider')),
      utils.keccak256(utils.toUtf8Bytes('params')),
      [utils.keccak256(utils.toUtf8Bytes('example space'))],
      5,
      12093829,
      constants.AddressZero,
      BigNumber.from('1000')
    )
  );
})();
