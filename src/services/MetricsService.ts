import express, { Express } from 'express';
import client from 'prom-client';
import { prometheusPort } from '../config';

export class MetricsService {
  static restResponseTimeHistogram = new client.Histogram({
    name: 'rest_response_time_duration_seconds',
    help: 'REST API response time in seconds',
    labelNames: ['method', 'route', 'status_code']
  });

  static databaseResponseTimeHistogram = new client.Histogram({
    name: 'db_response_time_duration_seconds',
    help: 'Database response time in seconds',
    labelNames: ['operation', 'success']
  });

  static fatalErrorCounter = new client.Counter({
    name: 'fatal_errors_counter',
    help: 'fatal errors count'
  });

  static async startMetricsServer(): Promise<Express> {
    const app = express();

    const collectDefaultMetrics = client.collectDefaultMetrics;

    collectDefaultMetrics();

    app.get('/metrics', async (req, res) => {
      res.set('Content-Type', client.register.contentType);
      const response = await client.register.metrics();
      res.end(response);
    });

    return await new Promise((resolve, reject) => {
      try {
        app.listen(prometheusPort, () => {
          console.log(
            `Metrics server started at http://localhost:${prometheusPort}`
          );
          resolve(app);
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}

export default new MetricsService();
