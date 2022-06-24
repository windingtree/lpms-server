import { expect } from 'chai';
import supertest from 'supertest';
import ServerService from '../src/services/ServerService';
import userService from '../src/services/UserService';
import { AppRole } from '../src/types';
import userRepository from '../src/repositories/UserRepository';
import { space } from './common';
import {
  Availability,
  Condition,
  LOSRateModifier,
  NoticeRequiredRule
} from '../src/proto/lpms';
import { SpaceAvailabilityRepository } from '../src/repositories/SpaceAvailabilityRepository';
import { ItemType } from '../src/proto/facility';

describe('facility rule test', async () => {
  const appService = await new ServerService(3006);
  const requestWithSupertest = await supertest(appService.getApp);

  const spaceRequestBody = {
    descriptor: 'space',
    type: ItemType.SPACE,
    name: 'some name',
    description: 'some description',
    photos: [
      {
        uri: '/image1.jpg',
        description: 'Chic guesthouse'
      }
    ],
    payload: space
  };

  const facilityId =
    '0x1234567890123456789012345678901234567890123456789012345678901234';
  const spaceId =
    '0x9234567890123456789012345678901234567890123456789012345678901239';
  const managerLogin = 'test_manager_super_long_login';
  const managerPass = '123456qwerty';
  let accessToken;

  it('make manager', async () => {
    await userService.createUser(managerLogin, managerPass, [AppRole.MANAGER]);

    const userId = await userRepository.getUserIdByLogin(managerLogin);
    expect(userId).to.be.an('number');
  });

  it('login', async () => {
    const loginRes = await requestWithSupertest
      .post('/api/user/login')
      .send({ login: managerLogin, password: managerPass })
      .set('Accept', 'application/json');

    accessToken = loginRes.body.accessToken;

    expect(accessToken).to.be.a('string');
  });

  it('should throw error not found with random facility id', async () => {
    await requestWithSupertest
      .get(
        `/api/facility/0x1234567890123456789012345678901234567890123456789012345678901211`
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(404);
  });

  it('create space', async () => {
    await requestWithSupertest
      .post(`/api/facility/${facilityId}/spaces/${spaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send(spaceRequestBody)
      .expect(200);
  });

  it('get spaces', async () => {
    const res = await requestWithSupertest
      .get(`/api/facility/${facilityId}/spaces`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send(spaceRequestBody)
      .expect(200);

    expect(res.body.length).to.not.equal(0);
  });

  it('get space', async () => {
    const res = await requestWithSupertest
      .get(`/api/facility/${facilityId}/spaces/${spaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);

    expect(
      res.body.payload.maxNumberOfAdultOccupantsOneof.maxNumberOfAdultOccupants
    ).to.be.equal(2);
  });

  it('should throw error not found with random space id', async () => {
    await requestWithSupertest
      .get(
        `/api/facility/${facilityId}/spaces/0x1234567890123456789012345678901234567890123456789012345678901222`
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(404);
  });

  it('update space', async () => {
    const updatedSpace = JSON.parse(JSON.stringify(spaceRequestBody)); //clone
    updatedSpace.payload.maxNumberOfAdultOccupantsOneof.maxNumberOfAdultOccupants = 3;
    await requestWithSupertest
      .put(`/api/facility/${facilityId}/spaces/${spaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send(updatedSpace)
      .expect(200);
  });

  it('check update space', async () => {
    const res = await requestWithSupertest
      .get(`/api/facility/${facilityId}/spaces/${spaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);

    expect(
      res.body.payload.maxNumberOfAdultOccupantsOneof.maxNumberOfAdultOccupants
    ).to.be.equal(3);
  });

  it('create facility rule', async () => {
    const rule: NoticeRequiredRule = {
      value: 60 * 60
    };

    await requestWithSupertest
      .post(`/api/facility/${facilityId}/rule/notice_required`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send({ descriptor: 'notice_required', ...rule })
      .expect(200);
  });

  it('get facility rule', async () => {
    const res = await requestWithSupertest
      .get(`/api/facility/${facilityId}/rule/notice_required`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);

    expect(res.body.value).to.be.equal(60 * 60);
  });

  it('should throw not found space rule', async () => {
    await requestWithSupertest
      .get(`/api/facility/${facilityId}/spaces/${spaceId}/rule/notice_required`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(404);
  });

  it('create space rule', async () => {
    const rule: NoticeRequiredRule = {
      value: 60 * 60 * 2
    };

    await requestWithSupertest
      .post(
        `/api/facility/${facilityId}/spaces/${spaceId}/rule/notice_required`
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send({ descriptor: 'notice_required', ...rule })
      .expect(200);
  });

  it('get space rule', async () => {
    const res = await requestWithSupertest
      .get(`/api/facility/${facilityId}/spaces/${spaceId}/rule/notice_required`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);

    expect(res.body.value).to.be.equal(60 * 60 * 2);
  });

  it('remove facility rule', async () => {
    await requestWithSupertest
      .delete(`/api/facility/${facilityId}/rule/notice_required`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);
  });

  it('remove space rule', async () => {
    await requestWithSupertest
      .delete(
        `/api/facility/${facilityId}/spaces/${spaceId}/rule/notice_required`
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);
  });

  it('should throw error when get facility rule', async () => {
    await requestWithSupertest
      .get(`/api/facility/${facilityId}/rule/notice_required`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(404);
  });

  it('should throw error when get space rule', async () => {
    await requestWithSupertest
      .get(`/api/facility/${facilityId}/spaces/${spaceId}/rule/notice_required`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(404);
  });

  //start//

  it('create default space availability', async () => {
    const availability: Availability = {
      numSpaces: 10
    };
    ///facility/:facilityId/space/:spaceId/availability
    await requestWithSupertest
      .post(`/api/facility/${facilityId}/space/${spaceId}/availability`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send(availability)
      .expect(200);
  });

  it('check default space availability', async () => {
    const res = await requestWithSupertest
      .get(`/api/facility/${facilityId}/space/${spaceId}/availability/default`)
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
      .post(
        `/api/facility/${facilityId}/space/${spaceId}/availability/2022-01-01`
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send(availability)
      .expect(200);
  });

  it('check date space availability', async () => {
    const res = await requestWithSupertest
      .get(
        `/api/facility/${facilityId}/space/${spaceId}/availability/2022-01-01`
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);

    expect(res.body.numSpaces).to.be.equal(20);
  });

  it('remove availability with repo', async () => {
    const repo = new SpaceAvailabilityRepository(facilityId, spaceId);
    await repo.delAvailability('default');
    await repo.delAvailability('2022-01-01');
  });

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
      .post(`/api/facility/${facilityId}/modifier/length_of_stay`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send({ descriptor: 'length_of_stay', ...modifier })
      .expect(200);
  });

  it('get facility modifier', async () => {
    const res = await requestWithSupertest
      .get(`/api/facility/${facilityId}/modifier/length_of_stay`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);

    expect(res.body.los).to.be.equal(2);
  });

  it('request space modifier but get facility modifier', async () => {
    const res = await requestWithSupertest
      .get(
        `/api/facility/${facilityId}/spaces/${spaceId}/modifier/length_of_stay`
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);

    expect(res.body.los).to.be.equal(2);
  });

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
      .post(
        `/api/facility/${facilityId}/spaces/${spaceId}/modifier/length_of_stay`
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send({ descriptor: 'length_of_stay', ...modifier })
      .expect(200);
  });

  it('get space modifier', async () => {
    const res = await requestWithSupertest
      .get(
        `/api/facility/${facilityId}/spaces/${spaceId}/modifier/length_of_stay`
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);

    expect(res.body.los).to.be.equal(4);
  });

  it('remove facility modifier', async () => {
    await requestWithSupertest
      .delete(`/api/facility/${facilityId}/modifier/length_of_stay`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);
  });

  it('remove space modifier', async () => {
    await requestWithSupertest
      .delete(
        `/api/facility/${facilityId}/spaces/${spaceId}/modifier/length_of_stay`
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);
  });

  it('should throw error when get facility rule', async () => {
    await requestWithSupertest
      .get(`/api/facility/${facilityId}/modifier/length_of_stay`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(404);
  });

  it('should throw error when get space rule', async () => {
    await requestWithSupertest
      .get(
        `/api/facility/${facilityId}/spaces/${spaceId}/modifier/length_of_stay`
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(404);
  });

  it('remove space', async () => {
    await requestWithSupertest
      .delete(`/api/facility/${facilityId}/spaces/${spaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send(spaceRequestBody)
      .expect(200);
  });

  it('delete users', async () => {
    const id = await userRepository.getUserIdByLogin(managerLogin);
    await userService.deleteUser(Number(id));

    const checkId = await userRepository.getUserIdByLogin(managerLogin);
    expect(checkId).to.be.null;
  });
});
