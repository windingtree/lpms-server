import ServerService from './services/ServerService';
import { port, prometheusEnabled } from './config';
import bootstrapService from './services/BootstrapService';
import DBService from './services/DBService';
import { MetricsService } from './services/MetricsService';
import WakuService from './services/WakuService';
import { VidereService } from './services/VidereService';

process.on('unhandledRejection', async (error) => {
  console.log(error);
  await DBService.getInstance().close();
  process.exit(1);
});

const main = async (): Promise<void> => {
  const server = new ServerService(port);
  const wakuService = new WakuService();
  const videreService = new VidereService();

  await bootstrapService.bootstrap();

  if (prometheusEnabled) {
    await MetricsService.startMetricsServer();
  }

  await server.start();

  await wakuService.start();

  await videreService.start();
};

export default main().catch(async (error) => {
  console.log(error);
  await DBService.getInstance().close();
  process.exit(1);
});
