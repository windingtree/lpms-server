import { AppRole, User, UserDTO } from '../types';
import bcrypt from 'bcrypt';
import tokenService, { TokenService } from './TokenService';
import ApiError from '../exceptions/ApiError';
import { defaultManagerLogin } from '../config';
import { MetricsService } from './MetricsService';
import userRepository, { UserRepository } from '../repositories/UserRepository';
import mainRepository, { MainRepository } from '../repositories/MainRepository';

export class UserService {
  private tokenService: TokenService;
  private repository: UserRepository;
  private mainRepository: MainRepository;

  constructor() {
    this.tokenService = tokenService;
    this.repository = userRepository;
    this.mainRepository = mainRepository;
  }

  public async getAllUsers() {
    const users = new Set<UserDTO>();
    const dbUsers: User[] = await this.repository.getAllUsers();

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
    const userExists = await this.repository.getUserIdByLogin(login);
    if (userExists) {
      throw ApiError.BadRequest('User already exists');
    }

    const id = await this.mainRepository.getId();
    const rounds = 2;
    const hashedPassword = await bcrypt.hash(String(password), rounds);
    await this.repository.createUser(id, login, hashedPassword, roles);

    await this.mainRepository.setUserDBIncrement(String(id));

    // if (login !== defaultManagerLogin && roles.includes(AppRole.MANAGER)) {
    //   await this.deleteDefaultManagerAccount();
    // }
  }

  public async getUserByLogin(login: string): Promise<User | null> {
    const id = await this.repository.getUserIdByLogin(login);
    if (!id) {
      return null;
    }
    return await this.repository.getUserById(id);
  }

  public getUserDTO(user: User): UserDTO {
    return {
      id: user.id,
      login: user.login,
      roles: user.roles
    };
  }

  public async deleteUser(id: number): Promise<void> {
    try {
      const user = await this.repository.getUserById(id);
      const login = user.login;

      await this.repository.deleteUser(String(id), login);
      await this.tokenService.revokeAllUserTokens(id);
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
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
      if (!user) {
        throw ApiError.BadRequest('Incorrect login');
      }

      const passwordCorrect = await this.checkCredentials(user, password);
      if (!passwordCorrect) {
        throw ApiError.BadRequest('Incorrect password');
      }

      const userDTO = this.getUserDTO(user);

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

  private async deleteDefaultManagerAccount(): Promise<void> {
    const managerId = await this.repository.getUserIdByLogin(
      defaultManagerLogin
    );

    if (managerId) {
      await this.deleteUser(managerId);
    }
  }

  public async updateUserPassword(
    userId: number,
    password: string
  ): Promise<void> {
    try {
      const user = await this.repository.getUserById(userId);
      const rounds = 2;
      user.password = await bcrypt.hash(String(password), rounds);

      await this.repository.updateUser(String(userId), user);
    } catch (e) {
      if (e.status === 404) {
        throw ApiError.BadRequest('User not found');
      }
      throw e;
    }
  }

  public async updateUserRoles(
    userId: number,
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
