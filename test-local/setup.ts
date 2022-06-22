import { resolve } from 'path';
import dotenv from 'dotenv';
import { providers, utils, Wallet } from 'ethers';
import { SuperTest, Test } from 'supertest';
import {
  LineRegistry__factory,
  ServiceProviderRegistry__factory,
  ServiceProviderRegistry,
  Vat__factory,
  LineRegistry
} from '../typechain-videre';
import { checkEnvVariables } from '../src/config';
import { AppRole, walletAccountsIndexes } from '../src/types';
import userService from '../src/services/UserService';
import walletService from '../src/services/WalletService';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

checkEnvVariables(['APP_NETWORK_PROVIDER', 'APP_VERIFYING_CONTRACT']);

// deploying "TimestampRegistry" (tx: 0xd66e3642ae845b602ef3ff0dfeb3dd31900542469f9e0bc7c9cb1087a2baeae1)...: deployed at 0x5FbDB2315678afecb367f032d93F642f64180aa3 with 123193 gas
// deploying "MockERC20" (tx: 0xdfe9793698a51db71a855a9328997a4dd0131691558a3deb2e4ba3b5aef5376c)...: deployed at 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 with 1906944 gas
// deploying "ServiceProviderRegistry" (tx: 0xee3aa3c98f4ee1d6102fcb1f741977496a23183f38d609cdbd372739b07079a6)...: deployed at 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 with 1552817 gas
// deploying "LineRegistry" (tx: 0xe349533b2a015f065f54b51b112d6cce74c5dd51cc5a390c29bf64bf25404a59)...: deployed at 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 with 708544 gas
// deploying "Vat" (tx: 0x44e63f632fd7b0877f451768741a02ef85e639d654857a1c75acadd9dde11973)...: deployed at 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 with 1152043 gas
// deploying "GemJoin" (tx: 0xae271d31ed2e50a20846c568af26dac5097c64e0211504f203c89a679946e87c)...: deployed at 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 with 605780 gas
// deploying "Stays" (tx: 0x9c83e0b4e2480a35d59cb89a67661c53b1cf81312206fbda901d84906b12793a)...: deployed at 0x0165878A594ca255338adfa4d48449f69242Eb8F with 2522770 gas

enum VidereAddresses {
  TimestampRegistry = '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  MockERC20 = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  ServiceProviderRegistry = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  LineRegistry = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  Vat = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  GemJoin = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  Stays = '0x0165878A594ca255338adfa4d48449f69242Eb8F'
}

enum VidereUsers {
  Deployer = 0,
  Alice = 1,
  Bob = 2,
  Carol = 3
}

const provider: Record<string, providers.JsonRpcProvider> = {};

export const getProvider = (providerUri = process.env.APP_NETWORK_PROVIDER) => {
  if (!providerUri) {
    throw new Error('Provider URI must be provided');
  }

  const key = utils.formatBytes32String(providerUri);

  if (provider[key]) {
    return provider[key];
  }

  provider[key] = new providers.JsonRpcProvider(String(providerUri));
  return provider[key];
};

export const getLineRegistryContract = (): LineRegistry => {
  const provider = getProvider();
  return LineRegistry__factory.connect(
    String(process.env.APP_VERIFYING_CONTRACT),
    provider
  );
};

export const getServiceProviderRegistryContractFromLine = async (
  wallet: Wallet
): Promise<ServiceProviderRegistry> => {
  const provider = getProvider();
  const lineRegistryContract = getLineRegistryContract();
  const serviceProviderRegistryAddress =
    await lineRegistryContract.serviceProviderRegistry();
  return ServiceProviderRegistry__factory.connect(
    serviceProviderRegistryAddress,
    provider
  ).connect(wallet);
};

export const getAddresses = (): Promise<string[]> =>
  Promise.all(
    Array(4)
      .fill(0)
      .map((_, index) => walletService.getWalletAddressByIndex(index))
  );

export const getHardhatWalletByIdex = (index: number) => {
  const provider = getProvider('http://127.0.0.1:8545/');
  const wallet = new Wallet(
    utils.HDNode.fromMnemonic(
      'test test test test test test test test test test test junk'
    ).derivePath(`m/44'/60'/0'/0/${index}`)
  );
  return wallet.connect(provider);
};

export const sendEther = async (
  fromWallet: Wallet,
  to: string,
  value: string
): Promise<void> => {
  const sendTx = {
    to,
    value: utils.parseEther(value)
  };
  const tx = await fromWallet.sendTransaction(sendTx);
  await tx.wait();
};

export const snapshot = async () => {
  const provider = getProvider('http://127.0.0.1:8545/');
  return await provider.send('evm_snapshot', []);
};

export const revert = async (id: string) => {
  const provider = getProvider('http://127.0.0.1:8545/');
  return await provider.send('evm_revert', [id]);
};

export const setupAuth = async (request: SuperTest<Test>): Promise<string> => {
  const managerLogin = utils.formatBytes32String(Math.random().toString());
  const managerPass = utils.formatBytes32String(Math.random().toString());
  await userService.createUser(managerLogin, managerPass, [AppRole.MANAGER]);
  const response = await request
    .post('/api/user/login')
    .send({ login: managerLogin, password: managerPass })
    .set('Accept', 'application/json');
  return response.body.accessToken;
};

export const setupFacility = async (): Promise<string> => {
  const WHITELIST_ROLE = utils.keccak256(
    utils.toUtf8Bytes('videre.roles.whitelist')
  );
  const LINE = utils.formatBytes32String('stays');
  const SALT = utils.arrayify(utils.formatBytes32String('SALT'));

  const deployer = getHardhatWalletByIdex(VidereUsers.Deployer);
  const bob = getHardhatWalletByIdex(VidereUsers.Bob);

  const vat = Vat__factory.connect(VidereAddresses.Vat, deployer);

  const lRegistryDeployer = LineRegistry__factory.connect(
    VidereAddresses.LineRegistry,
    deployer
  );

  const spRegistryDeployer = ServiceProviderRegistry__factory.connect(
    VidereAddresses.ServiceProviderRegistry,
    deployer
  );

  const lRegistryBob = LineRegistry__factory.connect(
    VidereAddresses.LineRegistry,
    bob
  );

  const spRegistryBob = ServiceProviderRegistry__factory.connect(
    VidereAddresses.ServiceProviderRegistry,
    bob
  );

  // authorize the Stays contract to use the `vat`
  await vat.rely(VidereAddresses.Stays);

  // authorize the GemJoin contract to use the `vat`
  await vat.rely(VidereAddresses.GemJoin);

  // register the industry (line)
  await lRegistryDeployer['file(bytes32,bytes32,address)'](
    utils.formatBytes32String('terms'),
    LINE,
    VidereAddresses.Stays
  );

  // add bob to the whitelist for registering
  const bobAddress = await bob.getAddress();
  await spRegistryDeployer.grantRole(WHITELIST_ROLE, bobAddress);

  // register a service provider
  const serviceProvider = await spRegistryBob.callStatic.enroll(SALT);

  // Get service addresses from the server
  const lpmsAddresses = await getAddresses();

  // use multicall to batch everything together in an atomic transaction for the service provider registry!
  await spRegistryBob.multicall([
    // enroll
    ServiceProviderRegistry__factory.createInterface().encodeFunctionData(
      'enroll',
      [SALT]
    ),
    ServiceProviderRegistry__factory.createInterface().encodeFunctionData(
      'grantRole',
      [
        utils.keccak256(
          utils.solidityPack(
            ['bytes32', 'uint256'],
            [serviceProvider, walletAccountsIndexes.API]
          )
        ),
        lpmsAddresses[walletAccountsIndexes.API]
      ]
    ),
    ServiceProviderRegistry__factory.createInterface().encodeFunctionData(
      'grantRole',
      [
        utils.keccak256(
          utils.solidityPack(
            ['bytes32', 'uint256'],
            [serviceProvider, walletAccountsIndexes.BIDDER]
          )
        ),
        lpmsAddresses[walletAccountsIndexes.BIDDER]
      ]
    ),
    ServiceProviderRegistry__factory.createInterface().encodeFunctionData(
      'grantRole',
      [
        utils.keccak256(
          utils.solidityPack(
            ['bytes32', 'uint256'],
            [serviceProvider, walletAccountsIndexes.MANAGER]
          )
        ),
        lpmsAddresses[walletAccountsIndexes.MANAGER]
      ]
    ),
    ServiceProviderRegistry__factory.createInterface().encodeFunctionData(
      'grantRole',
      [
        utils.keccak256(
          utils.solidityPack(
            ['bytes32', 'uint256'],
            [serviceProvider, walletAccountsIndexes.STAFF]
          )
        ),
        lpmsAddresses[walletAccountsIndexes.STAFF]
      ]
    )
  ]);

  // register the service provider with the line
  await lRegistryBob.register(LINE, serviceProvider);

  // top up server API address
  await sendEther(deployer, lpmsAddresses[walletAccountsIndexes.API], '1');

  return serviceProvider;
};
