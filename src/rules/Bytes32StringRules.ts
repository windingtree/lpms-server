import { utils } from 'ethers';
import ApiError from '../exceptions/ApiError';

// @todo Remove this validator because now all Ids are validated using pattern in swagger schema

export function validateBytes32StringRule(str: string) {
  try {
    const isBytes32String =
      str === utils.defaultAbiCoder.encode(['bytes32'], [str]);
    if (isBytes32String) return true;
  } catch (_) {
    throw ApiError.BadRequest('Incorrect Id');
  }
}
