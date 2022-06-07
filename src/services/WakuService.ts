import { Waku, WakuMessage } from 'js-waku';
import type { MessageType } from '@protobuf-ts/runtime';
import { wakuConfig } from '../config';
import log from './LogService';

export type WakuMessageHandler = (message: WakuMessage) => void;

export default class WakuService {
  protected waku: Waku;
  private static _instance: WakuService = new WakuService();

  constructor() {
    if (WakuService._instance) {
      throw new Error(
        'Error: Instantiation failed: Use WakuService.getInstance() instead of new'
      );
    }

    Waku.create(wakuConfig).then(
      (waku) => {
        log.green('Connecting to Waku...');

        waku.waitForRemotePeer(undefined, 10000).then(() => {
          log.green('...Connected');
          this.waku = waku;
        });
      },
      () => {
        log.red('...Failed');
      }
    );
  }

  public static getInstance(): WakuService {
    return WakuService._instance;
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
    return protoMessageInstance.fromBinary(wakuMessage.payload);
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
