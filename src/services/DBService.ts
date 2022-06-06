import { AbstractSublevel } from 'abstract-level';
import { Level } from 'level';
import { Token, User } from '../types';
import {
  Facility as FacilityMetadata,
  Item as ItemMetadata,
  Space as SpaceMetadata
} from '../proto/facility';
import {
  Availability,
  DayOfWeekLOSRule,
  DayOfWeekRateModifer,
  LOSRateModifier,
  NoticeRequiredRule,
  OccupancyRateModifier,
  Rates,
  StubStorage
} from '../proto/lpms';
import { Stub } from '../proto/stub';
import { Person } from '../proto/person';

export type LevelDefaultTyping = string | Buffer | Uint8Array;
export type DBLevel = Level<string, string | string[]>;
export type StringAbstractDB = AbstractSublevel<
  DBLevel,
  LevelDefaultTyping,
  string,
  string
>;
export type Rules = NoticeRequiredRule | DayOfWeekLOSRule;
export type RulesItemKey = 'notice_required' | 'length_of_stay';
export type ModifiersValues =
  | DayOfWeekRateModifer
  | OccupancyRateModifier
  | LOSRateModifier;
export type ModifiersKey = 'day_of_week' | 'occupancy' | 'length_of_stay';
export type FacilityKey = 'metadata';
export type FacilityIndexKey = 'stubs' | 'spaces' | 'otherItems';
export type FacilityValues = FacilityMetadata | string[];
export type FacilitySpaceValues = ItemMetadata | SpaceMetadata;
export type FacilityItemValues = ItemMetadata | FacilitySpaceValues;
export type FormattedDate = `${number}-${number}-${number}`;
export type DefaultOrDateItemKey = 'default' | FormattedDate;
export type FacilityStubKey = string | FormattedDate;
export type FacilityStubValues = string[] | StubStorage;
export type SpaceStubKey = FormattedDate | `${FormattedDate}-num_booked`;
export type SpaceStubValues = string[] | number;

export default class DBService {
  protected db: DBLevel;
  protected userDB: AbstractSublevel<DBLevel, LevelDefaultTyping, string, User>;
  protected loginDB: StringAbstractDB;
  protected tokenDB: AbstractSublevel<
    DBLevel,
    LevelDefaultTyping,
    string,
    Token
  >;

  private static _instance: DBService = new DBService();

  constructor() {
    if (DBService._instance) {
      throw new Error(
        'Error: Instantiation failed: Use DBService.getInstance() instead of new.'
      );
    }
    DBService._instance = this;
    this.db = new Level<string, string>('./database', {
      valueEncoding: 'json',
      createIfMissing: true,
      errorIfExists: false
    });
    this.userDB = this.db.sublevel<string, User>('User', {
      valueEncoding: 'json'
    });
    this.loginDB = this.db.sublevel<string, string>('Login', {
      valueEncoding: 'json'
    });
    this.tokenDB = this.db.sublevel<string, Token>('Token', {
      valueEncoding: 'json'
    });
  }

  public static getInstance(): DBService {
    return DBService._instance;
  }

  public async open() {
    await this.db.open();
  }

  public async close() {
    await this.db.close();
  }

  public getUserDB() {
    return this.userDB;
  }

  public getLoginDB() {
    return this.loginDB;
  }

  public getTokenDB() {
    return this.tokenDB;
  }

  public getDB() {
    return this.db;
  }

  public getFacilityDB(facilityId: string) {
    const prefix = 'f_';
    return this.db.sublevel<string, FacilityValues>(prefix + facilityId, {
      valueEncoding: 'json'
    });
  }

  public getFacilityItemDB(
    facilityId: string,
    itemType: FacilityIndexKey,
    itemId: string
  ) {
    const key = `${itemType}_${itemId}`;
    return this.getFacilityDB(facilityId).sublevel<string, FacilityItemValues>(
      key,
      { valueEncoding: 'json' }
    );
  }

  public getFacilityRulesDB(facilityId: string) {
    return this.getFacilityDB(facilityId).sublevel<RulesItemKey, Rules>(
      'rules',
      { valueEncoding: 'json' }
    );
  }

  public getFacilityModifiersDB(facilityId: string) {
    return this.getFacilityDB(facilityId).sublevel<
      ModifiersKey,
      ModifiersValues
    >('modifiers', { valueEncoding: 'json' });
  }

  public getFacilityStubsDB(facilityId: string) {
    return this.getFacilityDB(facilityId).sublevel<
      FacilityStubKey,
      FacilityStubValues
    >('stubs', { valueEncoding: 'json' });
  }

  public getFacilityPiiDB(facilityId: string) {
    return this.getFacilityDB(facilityId).sublevel<string, Person>('pii', {
      valueEncoding: 'json'
    });
  }

  public getSpaceAvailabilityDB(facilityId: string, itemId: string) {
    return this.getFacilityItemDB(facilityId, 'spaces', itemId).sublevel<
      DefaultOrDateItemKey,
      Availability
    >('availability', { valueEncoding: 'json' });
  }

  public getSpaceRatesDB(facilityId: string, spaceId: string) {
    return this.getFacilityItemDB(facilityId, 'spaces', spaceId).sublevel<
      DefaultOrDateItemKey,
      Rates
    >('rates', { valueEncoding: 'json' });
  }

  public getSpaceRulesDB(facilityId: string, spaceId: string) {
    return this.getFacilityItemDB(facilityId, 'spaces', spaceId).sublevel<
      RulesItemKey,
      Rules
    >('rules', { valueEncoding: 'json' });
  }

  public getSpaceModifiersDB(facilityId: string, spaceId: string) {
    return this.getFacilityItemDB(facilityId, 'spaces', spaceId).sublevel<
      ModifiersKey,
      ModifiersValues
    >('modifiers', { valueEncoding: 'json' });
  }

  public getSpaceStubsDB(facilityId: string, spaceId: string) {
    return this.getFacilityItemDB(facilityId, 'spaces', spaceId).sublevel<
      SpaceStubKey,
      SpaceStubValues
    >('stubs', { valueEncoding: 'json' });
  }
}
