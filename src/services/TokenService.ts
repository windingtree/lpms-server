import jwt from 'jsonwebtoken';
import {
  accessTokenKey,
  accessTokenMaxAge,
  refreshTokenKey,
  refreshTokenMaxAge
} from '../config';
import { Tokens } from '../types';
import tokenRepository, {
  TokenRepository
} from '../repositories/TokenRepository';

export class TokenService {
  private repository: TokenRepository;

  constructor() {
    this.repository = tokenRepository;
  }

  public generateTokens(payload): Tokens {
    const accessToken = jwt.sign(payload, accessTokenKey, {
      expiresIn: accessTokenMaxAge
    });
    const refreshToken = jwt.sign(payload, refreshTokenKey, {
      expiresIn: refreshTokenMaxAge
    });

    return {
      accessToken,
      refreshToken
    };
  }

  public async saveToken(refreshToken: string, userId: number) {
    const tokens = await this.repository.getUserTokens(userId);
    const verifiedTokens = this.getVerifiedUserTokens(tokens);

    verifiedTokens.push(refreshToken);

    return await this.repository.putUserTokens(String(userId), verifiedTokens);
  }

  public getVerifiedUserTokens(tokens: Array<string>): string[] {
    const verifiedTokens: string[] = [];

    tokens.forEach((token) => {
      jwt.verify(token, refreshTokenKey, (err) => {
        if (!err) {
          verifiedTokens.push(token);
        }
      });
    });

    return verifiedTokens;
  }

  public async revokeToken(token: string) {
    const data = jwt.verify(token, refreshTokenKey);
    const userId = data.id;
    const tokens = await this.repository.getUserTokens(userId);
    const neededTokens = tokens.filter((i) => {
      return i !== token;
    });

    return await this.repository.putUserTokens(String(userId), neededTokens);
  }

  public async revokeAllUserTokens(userId: number) {
    return await this.repository.deleteUserTokens(String(userId));
  }

  public validateRefreshToken(refreshToken) {
    try {
      return jwt.verify(refreshToken, refreshTokenKey);
    } catch (e) {
      return null;
    }
  }

  public validateAccessToken(accessToken) {
    try {
      return jwt.verify(accessToken, accessTokenKey);
    } catch (e) {
      return null;
    }
  }

  public async checkRefreshInDB(token): Promise<boolean> {
    try {
      const data = jwt.verify(token, refreshTokenKey);
      const userId = data.id;
      const tokens = await this.repository.getUserTokens(userId);
      return tokens.includes(token);
    } catch (e) {
      return false;
    }
  }
}

export default new TokenService();
