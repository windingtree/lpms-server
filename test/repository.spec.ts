import {
  FacilityRuleRepository,
  SpaceRuleRepository
} from '../src/repositories/RuleRepository';
import { NoticeRequiredRule, Rates } from '../src/proto/lpms';
import { expect } from 'chai';
import { SpaceRateRepository } from '../src/repositories/ItemRateRepository';

describe('facility repository rule test', async () => {
  const facilityId = '0x1234567890';
  const spaceId = '0x1234567890';
  const facilityRuleRepository = new FacilityRuleRepository(facilityId);
  const spaceRuleRepository = new SpaceRuleRepository(facilityId, spaceId);

  it('set rule', async () => {
    const rule: NoticeRequiredRule = {
      value: 10
    };

    await facilityRuleRepository.setRule('notice_required', rule);
    await spaceRuleRepository.setRule('notice_required', rule);
  });

  it('get rule', async () => {
    const rule = (await facilityRuleRepository.getRule(
      'notice_required'
    )) as NoticeRequiredRule;
    const spaceRule = (await spaceRuleRepository.getRule(
      'notice_required'
    )) as NoticeRequiredRule;

    expect(rule.value).to.be.equal(10);
    expect(spaceRule.value).to.be.equal(10);
  });

  it('delete rule', async () => {
    await facilityRuleRepository.delRule('notice_required');
    await spaceRuleRepository.delRule('notice_required');
  });

  it('check rule not exist', async () => {
    const result = await facilityRuleRepository.getRule('notice_required');
    const result2 = await spaceRuleRepository.getRule('notice_required');

    expect(result).to.be.null;
    expect(result2).to.be.null;
  });
});

describe('repository rate test', async () => {
  const facilityId = '0x1234567890';
  const spaceId = '0x1234567890';
  const spaceRuleRepository = new SpaceRateRepository(facilityId, spaceId);

  it('set rate', async () => {
    const rate: Rates = {
      cost: 100
    };

    await spaceRuleRepository.setRateDefault(rate);
  });

  it('get rate', async () => {
    const spaceRate = await spaceRuleRepository.getRate('default');

    expect(spaceRate?.cost).to.be.equal(100);
  });

  it('delete rate', async () => {
    await spaceRuleRepository.delRate('default');
  });

  it('check rate not exist', async () => {
    let error;

    try {
      await spaceRuleRepository.getRate('default');
    } catch (e) {
      error = e;
    }
    expect(error.status).to.be.equal(404);
  });
});
