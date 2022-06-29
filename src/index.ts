import ServerService from './services/ServerService';
import { port, prometheusEnabled } from './config';
import bootstrapService from './services/BootstrapService';
import DBService from './services/DBService';
import { MetricsService } from './services/MetricsService';
import WakuService from './services/WakuService';
import videreService from './services/VidereService';
import pingPongService from './services/PingPongService';
import auctioneerService from './services/AuctioneerService';
import IpfsService from './services/IpfsService';
import bidService from './services/BidService';

process.on('unhandledRejection', async (error) => {
  console.log(error);
  await DBService.getInstance().close();
  process.exit(1);
});

const main = async (): Promise<void> => {
  const server = new ServerService(port);
  const wakuService = WakuService.getInstance();
  const ipfsService = IpfsService.getInstance();

  await bootstrapService.bootstrap();

  if (prometheusEnabled) {
    await MetricsService.startMetricsServer();
  }

  await server.start();

  await wakuService.start();
  await ipfsService.start();

  await videreService.addService(pingPongService);
  await videreService.addService(auctioneerService);
  await videreService.start();
  bidService.poller(60);
};

export default main().catch(async (error) => {
  console.log(error);
  await DBService.getInstance().close();
  await WakuService.getInstance().stop();
  await IpfsService.getInstance().stop();
  process.exit(1);
});
