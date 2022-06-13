import { expect } from 'chai';
import supertest from 'supertest';
import ServerService from '../src/services/ServerService';
import userService from '../src/services/UserService';
import { AppRole } from '../src/types';
import userRepository from '../src/repositories/UserRepository';
import { facility, space } from './common';

describe('facility rule test', async () => {
  const appService = await new ServerService(3006);
  const requestWithSupertest = await supertest(appService.getApp);

  const facilityRequestBody = {
    metadata: facility
  };

  const spaceRequestBody = {
    metadata: space
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

  it('create facility', async () => {
    await requestWithSupertest
      .post(`/api/facility/create/${facilityId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send(facilityRequestBody)
      .expect(200);
  });

  it('create facility with incorrect id', async () => {
    await requestWithSupertest
      .post(`/api/facility/create/0x1231212`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send(facilityRequestBody)
      .expect(400);
  });

  it('get all facilities', async () => {
    const res = await requestWithSupertest
      .get(`/api/facility/all`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json');

    expect(res.body.length).to.not.equal(0);
  });

  it('get 1 facility', async () => {
    const res = await requestWithSupertest
      .get(`/api/facility/${facilityId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json');

    expect(res.body.name).to.equal(facilityRequestBody.metadata.name);
  });

  it('should throw error not found with random facility id', async () => {
    const res = await requestWithSupertest
      .get(
        `/api/facility/1x1234567890123456789012345678901234567890123456789012345678901234`
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(404);
  });

  it('update facility', async () => {
    const updatedFacility = JSON.parse(JSON.stringify(facilityRequestBody)); //clone
    updatedFacility.metadata.name += ' updated';
    await requestWithSupertest
      .put(`/api/facility/update/${facilityId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send(updatedFacility)
      .expect(200);
  });

  it('check update facility', async () => {
    const res = await requestWithSupertest
      .get(`/api/facility/${facilityId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json');

    expect(res.body.name).to.equal(
      facilityRequestBody.metadata.name + ' updated'
    );
  });

  it('create space', async () => {
    await requestWithSupertest
      .post(`/api/facility/${facilityId}/spaces/create/${spaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send(spaceRequestBody)
      .expect(200);
  });

  it('get spaces', async () => {
    const res = await requestWithSupertest
      .get(`/api/facility/${facilityId}/spaces/get/all`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send(spaceRequestBody)
      .expect(200);

    expect(res.body.length).to.not.equal(0);
  });

  it('get space', async () => {
    const res = await requestWithSupertest
      .get(`/api/facility/${facilityId}/spaces/get/${spaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);

    expect(
      res.body.maxNumberOfAdultOccupantsOneof.maxNumberOfAdultOccupants
    ).to.be.equal(2);
  });

  it('should throw error not found with random space id', async () => {
    await requestWithSupertest
      .get(
        `/api/facility/${facilityId}/spaces/get/1x1234567890123456789012345678901234567890123456789012345678901234`
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(404);
  });

  it('update space', async () => {
    const updatedSpace = JSON.parse(JSON.stringify(spaceRequestBody)); //clone
    updatedSpace.metadata.maxNumberOfAdultOccupantsOneof.maxNumberOfAdultOccupants = 3;
    await requestWithSupertest
      .put(`/api/facility/${facilityId}/spaces/update/${spaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send(updatedSpace)
      .expect(200);
  });

  it('check update space', async () => {
    const res = await requestWithSupertest
      .get(`/api/facility/${facilityId}/spaces/get/${spaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);

    expect(
      res.body.maxNumberOfAdultOccupantsOneof.maxNumberOfAdultOccupants
    ).to.be.equal(3);
  });

  it('create facility rule', async () => {
    //todo test
  });

  it('get facility rule', async () => {
    //todo test
  });

  it('request space rule but get facility rule', async () => {
    //todo test
  });

  it('create space rule', async () => {
    //todo test
  });

  it('get space rule', async () => {
    //todo test
  });

  it('remove facility rule', async () => {
    //todo test
  });

  it('remove space rule', async () => {
    //todo test
  });

  it('remove space', async () => {
    await requestWithSupertest
      .delete(`/api/facility/${facilityId}/spaces/delete/${spaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .send(spaceRequestBody)
      .expect(200);
  });

  it('remove facility', async () => {
    await requestWithSupertest
      .delete(`/api/facility/delete/${facilityId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);
  });

  it('delete users', async () => {
    const id = await userRepository.getUserIdByLogin(managerLogin);
    await userService.deleteUser(Number(id));

    const checkId = await userRepository.getUserIdByLogin(managerLogin);
    expect(checkId).to.be.null;
  });
});
