import ServerService from './services/ServerService';
import { port, prometheusEnabled } from './config';
import bootstrapService from './services/BootstrapService';
import DBService from './services/DBService';
import { MetricsService } from './services/MetricsService';
// import WakuService from './services/WakuService';

process.on('unhandledRejection', async (error) => {
  console.log(error);
  await DBService.getInstance().close();
  process.exit(1);
});

const main = async (): Promise<ServerService> => {
  const server = new ServerService(port);
  // const waku = WakuService.getInstance;

  await bootstrapService.bootstrap();

  if (prometheusEnabled) {
    await MetricsService.startMetricsServer();
  }

  return server.start();
};

export default main().catch(async (error) => {
  console.log(error);
  await DBService.getInstance().close();
  process.exit(1);
});
