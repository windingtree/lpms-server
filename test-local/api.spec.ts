import { expect } from 'chai';
import { utils } from 'ethers';
import supertest, { SuperTest, Test } from 'supertest';
import bootstrapService from '../src/services/BootstrapService';
import ServerService from '../src/services/ServerService';
import IpfsService from '../src/services/IpfsService';
import { setupFacility, setupAuth, snapshot, revert } from './setup';
import { facility, space, removeTestDB } from '../test/common';

describe('Local tests', () => {
  let ipfsService: IpfsService;
  let appService: ServerService;
  let requestWithSupertest: SuperTest<Test>;
  let facilityId: string;
  let accessToken: string;
  let snapshotId: string;

  const facilityRequestBody = facility;

  before(async () => {
    await bootstrapService.bootstrap();
    snapshotId = await snapshot();
    facilityId = await setupFacility();
    appService = new ServerService(3006);
    ipfsService = IpfsService.getInstance();
    await ipfsService.start();
    await appService.start();
    requestWithSupertest = supertest(appService.getApp);
    accessToken = await setupAuth(requestWithSupertest);
  });

  after(async () => {
    await requestWithSupertest
      .delete(`/api/facility/${facilityId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .expect(200);
    await ipfsService.stop();
    await appService.stop();
    await revert(snapshotId);
    removeTestDB();
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

      expect(res.body.name).to.equal(facilityRequestBody.name);
    });
  });

  describe('Items', () => {
    const spaceRequestBody = space;
    const spaceId = utils.keccak256(utils.toUtf8Bytes('test_space'));

    it('create item', async () => {
      await requestWithSupertest
        .post(`/api/item/${facilityId}/${spaceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .send({ descriptor: 'space', ...spaceRequestBody })
        .expect(200);
    });

    it('get items', async () => {
      const res = await requestWithSupertest
        .get(`/api/item/${facilityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .send(spaceRequestBody)
        .expect(200);

      expect(res.body.length).to.not.equal(0);
    });

    it('get item', async () => {
      const res = await requestWithSupertest
        .get(`/api/item/${facilityId}/${spaceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .expect(200);

      const { payload } = res.body;

      const numOfAdults =
        payload.maxNumberOfAdultOccupantsOneof.oneofKind ===
        'maxNumberOfAdultOccupants'
          ? payload.maxNumberOfAdultOccupantsOneof.maxNumberOfAdultOccupants
          : 0;

      expect(numOfAdults).to.be.equal(2);
    });

    it('update item', async () => {
      const updatedSpace = JSON.parse(JSON.stringify(spaceRequestBody)); //clone
      updatedSpace.payload.maxNumberOfAdultOccupantsOneof.maxNumberOfAdultOccupants = 3;
      await requestWithSupertest
        .put(`/api/item/${facilityId}/${spaceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .send({ descriptor: 'space', ...updatedSpace })
        .expect(200);
    });

    it('check update item', async () => {
      const res = await requestWithSupertest
        .get(`/api/item/${facilityId}/${spaceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .expect(200);

      const { payload } = res.body;

      const numOfAdults =
        payload.maxNumberOfAdultOccupantsOneof.oneofKind ===
        'maxNumberOfAdultOccupants'
          ? payload.maxNumberOfAdultOccupantsOneof.maxNumberOfAdultOccupants
          : 0;

      expect(numOfAdults).to.be.equal(3);
    });

    it('remove item', async () => {
      await requestWithSupertest
        .delete(`/api/item/${facilityId}/${spaceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .send(spaceRequestBody)
        .expect(200);
    });
  });
});
