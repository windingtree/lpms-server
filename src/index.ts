import ServerService from './services/ServerService';
import { port, prometheusEnabled } from './config';
//import bootstrapService from './services/BootstrapService';
import { MetricsService } from './services/MetricsService';
import userRepository from './repositories/UserRepository';
import { AppRole } from './types';

process.on('unhandledRejection', async (error) => {
  console.log(error);
  process.exit(1);
});

const main = async (): Promise<void> => {
  const server = new ServerService(port);

  //await bootstrapService.bootstrap();

  if (prometheusEnabled) {
    await MetricsService.startMetricsServer();
  }

  await server.start();
};

export default main().catch(async (error) => {
  console.log(error);
  process.exit(1);
});
