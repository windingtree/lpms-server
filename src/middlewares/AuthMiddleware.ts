import ApiError from '../exceptions/ApiError';
import tokenService from '../services/TokenService';
import userService from '../services/UserService';
import userRepository from '../repositories/UserRepository';
import { UserDTO } from '../types';

export default async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next(ApiError.UnauthorizedError());
    }

    const accessToken = authHeader.split(' ')[1];
    if (!accessToken) {
      return next(ApiError.UnauthorizedError());
    }

    const userData: UserDTO = tokenService.validateAccessToken(accessToken);

    if (!userData) {
      return next(ApiError.UnauthorizedError());
    }

    const userExists = await userRepository.getUserByLogin(userData.login);

    if (!userExists) {
      return next(ApiError.UnauthorizedError());
    }

    const user = await userRepository.getUserById(userData.id);
    req.user = userService.getUserDTO(user);
    next();
  } catch (e) {
    return next(ApiError.UnauthorizedError());
  }
};
