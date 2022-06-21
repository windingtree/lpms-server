import { Waku, WakuMessage } from 'js-waku';
import type { MessageType } from '@protobuf-ts/runtime';
import { wakuConfig } from '../config';
import log from './LogService';

export type WakuMessageHandler = (message: WakuMessage) => void;

export default class WakuService {
  protected waku: Waku;
  private static _instance: WakuService = new WakuService();
  public isConnected: boolean;

  constructor() {
    if (WakuService._instance) {
      throw new Error(
        'Error: Instantiation failed: Use WakuService.getInstance() instead of new'
      );
    }
  }

  public static getInstance(): WakuService {
    return WakuService._instance;
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        Waku.create(wakuConfig).then(
          (waku) => {
            log.green('Connecting to Waku...');

            waku.waitForRemotePeer(undefined, 10000).then(() => {
              log.green('...Connected');
              this.waku = waku;
              this.isConnected = true;
              resolve();
            });
          },
          () => {
            log.red('...Failed');
          }
        );
      } catch (e) {
        console.log(e);
        reject(e);
      }
    });
  }

  public async stop(): Promise<void> {
    if (this.isConnected) {
      await this.waku.stop();
      this.isConnected = false;
    }
  }

  public async sendMessage<T extends object>(
    protoMessageInstance: MessageType<T>,
    message: T,
    topic: string
  ): Promise<void> {
    const msg = await WakuMessage.fromBytes(
      protoMessageInstance.toBinary(message),
      topic
    );
    await this.waku.relay.send(msg);
  }

  public processMessage<T extends object>(
    protoMessageInstance: MessageType<T>,
    wakuMessage: WakuMessage
  ): T | undefined {
    if (!wakuMessage.payload) return;
    try {
      return protoMessageInstance.fromBinary(wakuMessage.payload);
    } catch (e) {
      return;
    }
  }

  public async makeWakuObserver(
    messageHandler: WakuMessageHandler,
    topics: string[]
  ) {
    this.waku.relay.addObserver(messageHandler, topics);
    log.green('Subscribed to topics:' + topics);

    return () => {
      this.waku.relay.deleteObserver(messageHandler, topics);
      log.yellow('Unsubscribed from topics:' + topics);
    };
  }
}
