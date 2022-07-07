import { expect } from 'chai';
import { utils } from 'ethers';
import supertest from 'supertest';
import ServerService from '../src/services/ServerService';
import userService from '../src/services/UserService';
import { AppRole } from '../src/types';
import userRepository from '../src/repositories/UserRepository';
import {
  Availability,
  Condition,
  LOSRateModifier,
  NoticeRequiredRule
} from '../src/proto/lpms';
import { ItemAvailabilityRepository } from '../src/repositories/ItemAvailabilityRepository';

describe('API tests', async () => {
  const appService = new ServerService(3006);
  const requestWithSupertest = supertest(appService.getApp);

  const facilityId = utils.keccak256(utils.toUtf8Bytes('test_facility'));
  const spaceId = utils.keccak256(utils.toUtf8Bytes('test_space'));
  const managerLogin = 'test_manager_super_long_login';
  const managerPass = '123456qwerty';
  let accessToken: string;

  before(async () => {
    await userService.createUser(managerLogin, managerPass, [AppRole.MANAGER]);
    const loginRes = await requestWithSupertest
      .post('/api/user/login')
      .send({ login: managerLogin, password: managerPass })
      .set('Accept', 'application/json');
    accessToken = loginRes.body.accessToken;
  });

  after(async () => {
    const id = await userRepository.getUserIdByLogin(managerLogin);
    await userService.deleteUser(Number(id));
  });

  describe('Auth', () => {
    const testManagerLogin = `${managerLogin}_test`;

    it('make manager', async () => {
      await userService.createUser(testManagerLogin, managerPass, [
        AppRole.MANAGER
      ]);

      const userId = await userRepository.getUserIdByLogin(testManagerLogin);
      expect(userId).to.be.an('number');
    });

    it('login', async () => {
      const loginRes = await requestWithSupertest
        .post('/api/user/login')
        .send({ login: testManagerLogin, password: managerPass })
        .set('Accept', 'application/json');

      expect(loginRes.body.accessToken).to.be.a('string');
    });

    it('delete users', async () => {
      const id = await userRepository.getUserIdByLogin(testManagerLogin);
      await userService.deleteUser(Number(id));

      const checkId = await userRepository.getUserIdByLogin(testManagerLogin);
      expect(checkId).to.be.null;
    });
  });

  describe('Facilities', () => {
    it('should throw error not found with random facility id', async () => {
      await requestWithSupertest
        .get(
          `/api/facility/0x1234567890123456789012345678901234567890123456789012345678901211`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .expect(404);
    });
  });

  describe('Items', () => {
    it('should throw error not found with random space id', async () => {
      await requestWithSupertest
        .get(
          `/api/item/${facilityId}/0x1234567890123456789012345678901234567890123456789012345678901222`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .expect(404);
    });
  });

  describe('Rules', () => {
    const invalidId = '0x123';

    describe('Facility rules', () => {
      it('should fail if invalid ids provided as input', async () => {
        await requestWithSupertest
          .post(`/api/rule/${invalidId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .send({})
          .expect(400);
        await requestWithSupertest
          .get(`/api/rule/${invalidId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(400);
        await requestWithSupertest
          .delete(`/api/rule/${invalidId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(400);
      });

      it('create facility rule', async () => {
        const rule: NoticeRequiredRule = {
          value: 60 * 60
        };

        await requestWithSupertest
          .post(`/api/rule/${facilityId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .send({ descriptor: 'notice_required', ...rule })
          .expect(200);
      });

      it('get facility rule', async () => {
        const res = await requestWithSupertest
          .get(`/api/rule/${facilityId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(200);

        expect(res.body.value).to.be.equal(60 * 60);
      });

      it('remove facility rule', async () => {
        await requestWithSupertest
          .delete(`/api/rule/${facilityId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(200);
      });

      it('should throw error when get facility rule', async () => {
        await requestWithSupertest
          .get(`/api/rule/${facilityId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(404);
      });

      it('should throw error when get facility rule', async () => {
        await requestWithSupertest
          .get(`/api/rule/${facilityId}/length_of_stay`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(404);
      });
    });

    describe('Space rules', () => {
      it('should fail if invalid ids provided as input', async () => {
        await requestWithSupertest
          .get(`/api/rule/${invalidId}/${invalidId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(400);
        await requestWithSupertest
          .post(`/api/rule/${invalidId}/${invalidId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .send({})
          .expect(400);
        await requestWithSupertest
          .get(`/api/rule/${invalidId}/${invalidId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(400);
        await requestWithSupertest
          .delete(`/api/rule/${invalidId}/${invalidId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(400);
      });

      it('should throw not found space rule', async () => {
        await requestWithSupertest
          .get(`/api/rule/${facilityId}/${spaceId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(404);
      });

      it('create space rule', async () => {
        const rule: NoticeRequiredRule = {
          value: 60 * 60 * 2
        };

        await requestWithSupertest
          .post(`/api/rule/${facilityId}/${spaceId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .send({ descriptor: 'notice_required', ...rule })
          .expect(200);
      });

      it('get space rule', async () => {
        const res = await requestWithSupertest
          .get(`/api/rule/${facilityId}/${spaceId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(200);

        expect(res.body.value).to.be.equal(60 * 60 * 2);
      });

      it('remove space rule', async () => {
        await requestWithSupertest
          .delete(`/api/rule/${facilityId}/${spaceId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(200);
      });

      it('should throw error when get space rule', async () => {
        await requestWithSupertest
          .get(`/api/rule/${facilityId}/${spaceId}/notice_required`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(404);
      });

      it('should throw error when get space rule', async () => {
        await requestWithSupertest
          .get(`/api/rule/${facilityId}/${spaceId}/length_of_stay`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(404);
      });
    });
  });

  describe('Availability', () => {
    const invalidId = '0x123';

    it('should fail if invalid facilityId or spaceId provided', async () => {
      await requestWithSupertest
        .post(`/api/availability/${invalidId}/${invalidId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .send({})
        .expect(400);
      await requestWithSupertest
        .get(`/api/availability/${invalidId}/${invalidId}/default`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .expect(400);
      await requestWithSupertest
        .post(`/api/availability/${invalidId}/${invalidId}/2022-01-01`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .send({})
        .expect(400);
      await requestWithSupertest
        .get(`/api/availability/${invalidId}/${invalidId}/2022-01-01`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .expect(400);
    });

    it('create default space availability', async () => {
      const availability: Availability = {
        numSpaces: 10
      };
      await requestWithSupertest
        .post(`/api/availability/${facilityId}/${spaceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .send(availability)
        .expect(200);
    });

    it('check default space availability', async () => {
      const res = await requestWithSupertest
        .get(`/api/availability/${facilityId}/${spaceId}/default`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .expect(200);

      expect(res.body.numSpaces).to.be.equal(10);
    });

    it('create date space availability', async () => {
      const availability: Availability = {
        numSpaces: 20
      };
      await requestWithSupertest
        .post(`/api/availability/${facilityId}/${spaceId}/2022-01-01`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .send(availability)
        .expect(200);
    });

    it('check date space availability', async () => {
      const res = await requestWithSupertest
        .get(`/api/availability/${facilityId}/${spaceId}/2022-01-01`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .expect(200);

      expect(res.body.numSpaces).to.be.equal(20);
    });

    it('remove availability with repo', async () => {
      const repo = new ItemAvailabilityRepository(facilityId, spaceId);
      await repo.delAvailability('default');
      await repo.delAvailability('2022-01-01');
    });
  });

  describe('Modifiers', () => {
    describe('Facility modifiers', () => {
      it('create facility modifier', async () => {
        const modifier: LOSRateModifier = {
          condition: Condition.GTE,
          los: 2,
          valueOneof: {
            oneofKind: 'fixed',
            fixed: 25
          }
        };

        await requestWithSupertest
          .post(`/api/modifier/${facilityId}/length_of_stay`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .send({ descriptor: 'length_of_stay', ...modifier })
          .expect(200);
      });

      it('get facility modifier', async () => {
        const res = await requestWithSupertest
          .get(`/api/modifier/${facilityId}/length_of_stay`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(200);

        expect(res.body.los).to.be.equal(2);
      });

      it('remove facility modifier', async () => {
        await requestWithSupertest
          .delete(`/api/modifier/${facilityId}/length_of_stay`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(200);
      });
    });

    describe('Space modifiers', () => {
      it('create space modifier', async () => {
        const modifier: LOSRateModifier = {
          condition: Condition.GTE,
          los: 4,
          valueOneof: {
            oneofKind: 'fixed',
            fixed: 25
          }
        };

        await requestWithSupertest
          .post(`/api/modifier/${facilityId}/${spaceId}/length_of_stay`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .send({ descriptor: 'length_of_stay', ...modifier })
          .expect(200);
      });

      it('get space modifier', async () => {
        const res = await requestWithSupertest
          .get(`/api/modifier/${facilityId}/${spaceId}/length_of_stay`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(200);

        expect(res.body.los).to.be.equal(4);
      });

      it('remove space modifier', async () => {
        await requestWithSupertest
          .delete(`/api/modifier/${facilityId}/${spaceId}/length_of_stay`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept', 'application/json')
          .expect(200);
      });
    });
  });
});
