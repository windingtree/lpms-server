import { Request } from 'express';
import { Ask } from './proto/ask';
import { BidLine, BidTerm } from './proto/bidask';

export interface User {
  id: number;
  login: string;
  password: string;
  roles: AppRole[];
}

export interface UserDTO {
  id: number;
  login: string;
  roles: AppRole[];
}

export enum ServiceRole {
  ADMIN = 'admin',
  BIDDER = 'bidder',
  API = 'api'
}

export enum AppRole {
  MANAGER = 'manager',
  STAFF = 'staff'
}

export interface Token {
  refresh: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const walletAccounts = [
  ServiceRole.API,
  ServiceRole.BIDDER,
  AppRole.MANAGER,
  AppRole.STAFF
];

export enum walletAccountsIndexes {
  API = 0,
  BIDDER = 1,
  MANAGER = 2,
  STAFF = 3
}

export interface walletAccount {
  id: number;
  address: string;
  role: string;
}

export interface AuthRequest extends Request {
  user: UserDTO;
}

export interface BidLineAsk {
  ask: Ask;
  bidLine: BidLine;
  spaceId: string;
}

export interface Term {
  name: string;
  description: string;
  bidTerm: BidTerm;
}
