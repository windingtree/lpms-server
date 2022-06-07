import { FacilityRuleRepository, SpaceRuleRepository } from '../src/repositories/RuleRepository';
import { NoticeRequiredRule } from '../src/proto/lpms';
import { expect } from 'chai';

describe('facility repository test', async () => {
  const facilityId = '0x1234567890';
  const spaceId = '0x1234567890';
  const facilityRuleRepository = new FacilityRuleRepository(facilityId);
  const spaceRuleRepository = new SpaceRuleRepository(facilityId, spaceId);

  it('set rule', async () => {
    const rule: NoticeRequiredRule = {
      numDays: 10
    };

    await facilityRuleRepository.setRule('notice_required', rule);
    await spaceRuleRepository.setRule('notice_required', rule);
  });

  it('get rule', async () => {
    const rule = await facilityRuleRepository.getRule('notice_required') as NoticeRequiredRule;
    const spaceRule = await spaceRuleRepository.getRule('notice_required') as NoticeRequiredRule;

    expect(rule.numDays).to.be.equal(10);
    expect(spaceRule.numDays).to.be.equal(10);
  });

  it('delete rule', async () => {
    await facilityRuleRepository.delRule('notice_required');
    await spaceRuleRepository.delRule('notice_required');
  });

  it('check rule not exist', async () => {
    let error;

    try {
      await facilityRuleRepository.getRule('notice_required');
    } catch (e) {
      error = e;
    }
    expect(error.status).to.be.equal(404);

    try {
      await spaceRuleRepository.getRule('notice_required');
    } catch (e) {
      error = e;
    }
    expect(error.status).to.be.equal(404);
  });
});
