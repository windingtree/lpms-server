import { Ask } from '../proto/ask';

export class SearchService {
  public search = async (facilityId: string, ask: Ask): Promise<string[]> => {
    throw new Error('Not Implemented Yet');
  };
}
