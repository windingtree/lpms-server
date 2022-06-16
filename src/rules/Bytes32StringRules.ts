import { utils } from 'ethers';
import ApiError from '../exceptions/ApiError';

export function validateBytes32StringRule(string: string) {
  try {
    const isBytes32String =
      string === utils.defaultAbiCoder.encode(['bytes32'], [string]);
    if (isBytes32String) return true;
  } catch (_) {
    throw ApiError.BadRequest('Incorrect Id');
  }
}
