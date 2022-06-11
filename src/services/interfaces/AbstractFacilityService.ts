/* eslint-disable @typescript-eslint/no-empty-function */
import WakuService from '../WakuService';

export type UnsubscribeHandler = () => void;
export interface Unsubscribe {
  h3Index: string;
  handler: UnsubscribeHandler;
}

export class AbstractFacilityService {
  protected waku: WakuService;

  protected unsubscribes = new Map<string, Unsubscribe>();
  public locsManaged = new Map<string, string[]>();
  public facilityToLoc = new Map<string, string>();

  constructor() {
    if (!this.waku) this.waku = WakuService.getInstance();
  }

  public async start(facilityId: string, h3Index: string): Promise<void> {}
  public async stop(facilityId: string): Promise<void> {}
}
