import ServerService from './services/ServerService';
import { port, prometheusEnabled } from './config';
import bootstrapService from './services/BootstrapService';
import DBService from './services/DBService';
import { MetricsService } from './services/MetricsService';
import WakuService from './services/WakuService';
import videreService from './services/VidereService';
import PingPongService from './services/PingPongService';

process.on('unhandledRejection', async (error) => {
  console.log(error);
  await DBService.getInstance().close();
  process.exit(1);
});

const main = async (): Promise<void> => {
  const server = new ServerService(port);
  const wakuService = WakuService.getInstance();

  await bootstrapService.bootstrap();

  if (prometheusEnabled) {
    await MetricsService.startMetricsServer();
  }

  await server.start();

  await wakuService.start();

  await videreService.addService(PingPongService);
  await videreService.start();
};

export default main().catch(async (error) => {
  console.log(error);
  await DBService.getInstance().close();
  process.exit(1);
});
