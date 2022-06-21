import { expect } from 'chai';
import supertest, { SuperTest, Test } from 'supertest';
import ServerService from '../src/services/ServerService';
import { setupFacility, setupAuth } from './setup';
import { facility } from '../test/common';

describe('Local tests', () => {
  let appService: ServerService;
  let requestWithSupertest: SuperTest<Test>;
  let facilityId: string;
  let accessToken: string;

  const facilityRequestBody = {
    metadata: facility
  };

  before(async () => {
    facilityId = await setupFacility();
    appService = new ServerService(3006);
    await appService.start();
    requestWithSupertest = supertest(appService.getApp);
    accessToken = await setupAuth(requestWithSupertest);
  });

  after(async () => {
    await appService.stop();
  });

  describe('Facility', () => {
    it('create facility', async () => {
      await requestWithSupertest
        .post(`/api/facility/${facilityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .send(facilityRequestBody)
        .expect(200);
    });

    it('create facility with incorrect id', async () => {
      await requestWithSupertest
        .post(`/api/facility/0x1231212`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .send(facilityRequestBody)
        .expect(400);
    });

    it('get all facilities', async () => {
      const res = await requestWithSupertest
        .get(`/api/facility`)
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

    it('remove facility', async () => {
      await requestWithSupertest
        .delete(`/api/facility/${facilityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .expect(200);
    });
  });
});
