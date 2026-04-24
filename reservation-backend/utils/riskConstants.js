// utils/riskConstants.js
// Phase 2.5：風險規則集中設定

const RISK_WEIGHTS = {
  noShow: 2,
  lowParticipation: 3,
  noBestep: 2,
  violation: 3
};

const RISK_THRESHOLDS = {
  high: 8,
  medium: 4
};

const RISK_REASON_KEYS = {
  noShow: {
    key: 'noShow',
    label: '多次未到'
  },
  lowParticipation: {
    key: 'lowParticipation',
    label: '參與不足'
  },
  noBestep: {
    key: 'noBestep',
    label: '未完成 BESTEP 報名'
  },
  violation: {
    key: 'violation',
    label: '有違規紀錄'
  }
};

const DEFAULT_PARTICIPATION_THRESHOLD = 2;

module.exports = {
  RISK_WEIGHTS,
  RISK_THRESHOLDS,
  RISK_REASON_KEYS,
  DEFAULT_PARTICIPATION_THRESHOLD
};

