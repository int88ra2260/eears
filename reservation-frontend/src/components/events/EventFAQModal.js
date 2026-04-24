/**
 * 常見問題 FAQ Modal：取消預約、黑名單、活動規定三 Tab
 * 供 EventList 使用，內部自管 activeFAQTab；Tab 列表由 eventsContentConfig 驅動
 */
import React, { useState } from 'react';
import { FAQ_TABS } from '../../constants/eventsContentConfig';

export default function EventFAQModal({ show, onClose, t }) {
  const [activeFAQTab, setActiveFAQTab] = useState('cancel');

  if (!show) return null;

  return (
    <>
      <div className="modal fade show" style={{ display: 'block' }} role="dialog">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{t('faq.title')}</h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">
              <ul className="nav nav-tabs mb-3" id="faqTabs" role="tablist">
                {FAQ_TABS.map((tab) => (
                  <li key={tab.id} className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeFAQTab === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveFAQTab(tab.id)}
                      type="button"
                    >
                      {t(tab.labelKey)}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="tab-content">
                {activeFAQTab === 'cancel' && (
                  <div className="tab-pane show active">
                    <div className="mb-4">
                      <h6 className="text-primary mb-3">
                        <i className="fas fa-question-circle me-2" />
                        {t('faq.cancelQuestion')}
                      </h6>
                      <div className="alert alert-info" role="alert">
                        <strong>📝 {t('faq.cancelSteps')}</strong>
                        <ol className="mb-0 mt-2">
                          <li>{t('faq.cancelStep1')}</li>
                          <li>{t('faq.cancelStep2')}</li>
                          <li>{t('faq.cancelStep3')}</li>
                          <li>{t('faq.cancelStep4')}</li>
                          <li>{t('faq.cancelStep5')}</li>
                        </ol>
                      </div>
                      <div className="mt-3">
                        <h6 className="text-warning">
                          <i className="fas fa-exclamation-triangle me-2" />
                          {t('faq.importantReminder')}
                        </h6>
                        <ul className="text-muted">
                          <li>{t('faq.cancelRemind1')}</li>
                          <li>{t('faq.cancelRemind2')}</li>
                          <li>{t('faq.cancelRemind3')}</li>
                          <li>{t('faq.cancelRemind4')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {activeFAQTab === 'blacklist' && (
                  <div className="tab-pane show active">
                    <div className="mb-4">
                      <h6 className="text-primary mb-3">
                        <i className="fas fa-ban me-2" />
                        {t('faq.blacklistQuestion')}
                      </h6>
                      <div className="alert alert-warning" role="alert">
                        <strong>⚠️ {t('faq.blacklistMechanism')}</strong>
                        <p className="mb-0 mt-2">{t('faq.blacklistRule')}</p>
                      </div>
                      <div className="mt-3">
                        <h6 className="text-danger">
                          <i className="fas fa-times-circle me-2" />
                          {t('faq.violationsInclude')}
                        </h6>
                        <ul className="text-muted">
                          <li>{t('faq.violation1')}</li>
                          <li>{t('faq.violation2')}</li>
                          <li>{t('faq.violation3')}</li>
                        </ul>
                      </div>
                      <div className="mt-3">
                        <h6 className="text-info">
                          <i className="fas fa-lightbulb me-2" />
                          {t('faq.blacklistImpact')}
                        </h6>
                        <ul className="text-muted">
                          <li>{t('faq.impact1')}</li>
                          <li>{t('faq.impact2')}</li>
                          <li>{t('faq.impact3')}</li>
                          <li>{t('faq.impact4')}</li>
                        </ul>
                      </div>
                      <div className="mt-3">
                        <h6 className="text-success">
                          <i className="fas fa-check-circle me-2" />
                          {t('faq.howToAvoid')}
                        </h6>
                        <ul className="text-muted">
                          <li>{t('faq.avoid1')}</li>
                          <li>{t('faq.avoid2')}</li>
                          <li>{t('faq.avoid3')}</li>
                          <li>{t('faq.avoid4')}</li>
                          <li>{t('faq.avoid5')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {activeFAQTab === 'rules' && (
                  <div className="tab-pane show active">
                    <div className="mb-4">
                      <h6 className="text-primary mb-3">
                        <i className="fas fa-gavel me-2" />
                        {t('faq.rulesTitle')}
                      </h6>
                      <div className="alert alert-danger" role="alert">
                        <strong>🚫 {t('faq.rulesImportant')}</strong>
                        <ul className="mb-0 mt-2">
                          <li>{t('faq.ruleNoOnsite')}</li>
                          <li>{t('faq.ruleNoStampService')}</li>
                          <li>{t('faq.ruleNoLate5')}</li>
                        </ul>
                      </div>
                      <div className="mt-3">
                        <h6 className="text-warning">
                          <i className="fas fa-calendar-times me-2" />
                          {t('faq.ruleNoOnsiteDetail')}
                        </h6>
                        <ul className="text-muted">
                          <li>{t('faq.ruleNoOnsiteD1')}</li>
                          <li>{t('faq.ruleNoOnsiteD2')}</li>
                          <li>{t('faq.ruleNoOnsiteD3')}</li>
                          <li>{t('faq.ruleNoOnsiteD4')}</li>
                        </ul>
                      </div>
                      <div className="mt-3">
                        <h6 className="text-warning">
                          <i className="fas fa-stamp me-2" />
                          {t('faq.ruleNoStampDetail')}
                        </h6>
                        <ul className="text-muted">
                          <li>{t('faq.ruleNoStampD1')}</li>
                          <li>{t('faq.ruleNoStampD2')}</li>
                          <li>{t('faq.ruleNoStampD3')}</li>
                          <li>{t('faq.ruleNoStampD4')}</li>
                        </ul>
                      </div>
                      <div className="mt-3">
                        <h6 className="text-warning">
                          <i className="fas fa-clock me-2" />
                          {t('faq.ruleLateDetail')}
                        </h6>
                        <ul className="text-muted">
                          <li>{t('faq.ruleLateD1')}</li>
                          <li>{t('faq.ruleLateD2')}</li>
                          <li>{t('faq.ruleLateD3')}</li>
                          <li>{t('faq.ruleLateD4')}</li>
                          <li>{t('faq.ruleLateD5')}</li>
                        </ul>
                      </div>
                      <div className="mt-3">
                        <h6 className="text-info">
                          <i className="fas fa-list-check me-2" />
                          {t('faq.otherRules')}
                        </h6>
                        <ul className="text-muted">
                          <li>{t('faq.otherR1')}</li>
                          <li>{t('faq.otherR2')}</li>
                          <li>{t('faq.otherR3')}</li>
                          <li>{t('faq.otherR4')}</li>
                          <li>{t('faq.otherR5')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                {t('home.gotIt')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
