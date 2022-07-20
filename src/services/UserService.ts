import { AppRole, User, UserDbData, UserDTO } from '../types';
import bcrypt from 'bcrypt';
import tokenService, { TokenService } from './TokenService';
import ApiError from '../exceptions/ApiError';
import { MetricsService } from './MetricsService';
import userRepository, { UserRepository } from '../repositories/UserRepository';

export class UserService {
  private tokenService: TokenService;
  private repository: UserRepository;

  constructor() {
    this.tokenService = tokenService;
    this.repository = userRepository;
  }

  public async getAllUsers() {
    const users = new Set<UserDTO>();
    const dbUsers: UserDbData[] = await this.repository.getAllUsers();

    dbUsers.map((i) => {
      const userDTO = this.getUserDTO(i);
      users.add(userDTO);
    });

    return Array.from(users);
  }

  public async createUser(
    login: string,
    password: string,
    roles: AppRole[]
  ): Promise<void> {
    const rounds = 2;
    const hashedPassword = await bcrypt.hash(String(password), rounds);
    await this.repository.createUser(login, hashedPassword, roles);
  }

  public async getUserByLogin(login: string): Promise<UserDbData> {
    return await this.repository.getUserByLogin(login);
  }

  public getUserDTO(user: UserDbData): UserDTO {
    if (!user._id) {
      throw ApiError.BadRequest('Incorrect userId');
    }

    return {
      id: user._id.toString(),
      login: user.login,
      roles: user.roles
    };
  }

  public async deleteUser(id: string): Promise<void> {
    await this.repository.deleteUser(id);
  }

  public async checkCredentials(
    user: User,
    password: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  }

  public async login(login, password) {
    const metricsLabels = {
      operation: 'login'
    };
    const timer = MetricsService.databaseResponseTimeHistogram.startTimer();

    try {
      const user = await this.getUserByLogin(login);
      if (!user || !user._id) {
        throw ApiError.BadRequest('Incorrect login');
      }

      const passwordCorrect = await this.checkCredentials(user, password);
      if (!passwordCorrect) {
        throw ApiError.BadRequest('Incorrect password');
      }

      const userDTO: UserDTO = this.getUserDTO(user);

      const tokens = this.tokenService.generateTokens(userDTO);
      await this.tokenService.saveToken(tokens.refreshToken, userDTO.id);

      timer({ ...metricsLabels, success: 'true' });

      return {
        ...userDTO,
        ...tokens
      };
    } catch (e) {
      timer({ ...metricsLabels, success: 'false' });
      throw e;
    }
  }

  public async logout(token: string) {
    await this.tokenService.revokeToken(token);
  }

  public async refresh(refreshToken) {
    if (!refreshToken) {
      throw ApiError.UnauthorizedError();
    }
    const data = this.tokenService.validateRefreshToken(refreshToken);
    const tokenInDB = await this.tokenService.checkRefreshInDB(refreshToken);

    if (!data || !tokenInDB) {
      throw ApiError.UnauthorizedError();
    }

    const user = await this.repository.getUserById(data.id);
    const userDTO = this.getUserDTO(user);
    const tokens = this.tokenService.generateTokens(userDTO);
    await this.tokenService.revokeToken(refreshToken);
    await this.tokenService.saveToken(tokens.refreshToken, userDTO.id);

    return {
      ...userDTO,
      ...tokens
    };
  }

  public async updateUserPassword(
    userId: string,
    password: string
  ): Promise<void> {
    try {
      const rounds = 2;
      const newPassword = await bcrypt.hash(String(password), rounds);

      await this.repository.updateUser(userId, { password: newPassword });
    } catch (e) {
      if (e.status === 404) {
        throw ApiError.BadRequest('User not found');
      }
      throw e;
    }
  }

  public async updateUserRoles(
    userId: string,
    roles: AppRole[]
  ): Promise<void> {
    try {
      const user = await this.repository.getUserById(userId);
      user.roles = roles;

      await this.repository.updateUser(String(userId), user);
    } catch (e) {
      if (e.status === 404) {
        throw ApiError.BadRequest('User not found');
      }
      throw e;
    }
  }
}

export default new UserService();
