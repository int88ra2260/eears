/**
 * 問卷表單驗證與正規化（與舊 surveyRouter 邏輯一致，供公開／後台共用）
 */

function validateSurveyData(data, config) {
  const questions = config.questions || [];
  for (const question of questions) {
    if (question.required) {
      const value = data[question.id];
      if (value === undefined || value === null || value === '') {
        return { isValid: false, error: `請填寫：${question.label}` };
      }

      if (question.type === 'likert') {
        const score = parseInt(value, 10);
        if (Number.isNaN(score) || score < 1 || score > 5) {
          return { isValid: false, error: `${question.label}分數必須在1-5之間` };
        }
      }

      if (question.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { isValid: false, error: `${question.label}格式不正確` };
        }
      }
    }
  }
  return { isValid: true };
}

function processSurveyData(data, config) {
  const processed = { ...data };
  const questions = config.questions || [];

  for (const question of questions) {
    if (question.type === 'checkbox' && data[question.id]) {
      if (Array.isArray(data[question.id])) {
        processed[question.id] = data[question.id];
      } else {
        processed[question.id] = [data[question.id]];
      }
    }
  }

  if (processed.studentName && !processed.name) {
    processed.name = processed.studentName;
  }
  if (processed.studentEmail && !processed.email) {
    processed.email = processed.studentEmail;
  }
  if (processed.interview_email && !processed.interviewEmail) {
    processed.interviewEmail = processed.interview_email;
  }
  if (processed.reason_attend && !processed.reasonAttend) {
    processed.reasonAttend = processed.reason_attend;
  }
  if (processed.information_channel && !processed.informationChannel) {
    processed.informationChannel = processed.information_channel;
  }
  if (processed.ability_improved && !processed.abilityImproved) {
    processed.abilityImproved = processed.ability_improved;
  }
  if (processed.ability_description && !processed.abilityDescription) {
    processed.abilityDescription = processed.ability_description;
  }
  if (processed.other_comments && !processed.otherComments) {
    processed.otherComments = processed.other_comments;
  }

  return processed;
}

module.exports = {
  validateSurveyData,
  processSurveyData,
};
