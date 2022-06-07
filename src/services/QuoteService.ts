import { BigNumber } from 'ethers';
import { Ask } from '../proto/ask';

export class QuoteService {
  public quote = async (
    facilityId: string,
    spaceId: string,
    ask: Ask
  ): Promise<BigNumber> => {
    throw new Error('Not Implemented Yet');
  };
}
