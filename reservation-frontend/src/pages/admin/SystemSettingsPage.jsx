import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import useToast from '../../components/ui/useToast';

function ToggleRow({ title, desc, value, loading, onChange }) {
  return (
    <div className="d-flex justify-content-between align-items-center border rounded p-3 mb-2">
      <div>
        <div className="fw-semibold">{title}</div>
        <div className="small text-muted">{desc}</div>
      </div>
      <div className="form-check form-switch m-0">
        <input
          className="form-check-input"
          type="checkbox"
          checked={!!value}
          disabled={loading}
          onChange={(e) => onChange(e.target.checked)}
        />
      </div>
    </div>
  );
}

export default function SystemSettingsPage() {
  const { token, userRole } = useOutletContext();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState({
    surveyRequired: false,
    englishTestRegistrationEnabled: true,
    englishTestRegistrationGroupEnabled: true,
    learningPartnerEnabled: true,
  });

  const [flags, setFlags] = useState({});
  const [flagsError, setFlagsError] = useState('');
  const [lastFeedback, setLastFeedback] = useState(null);

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-User-Role': userRole || 'worker',
  }), [token, userRole]);

  const load = async () => {
    setLoading(true);
    setError('');
    const tasks = await Promise.allSettled([
      fetch('/api/settings/survey-required', { headers: authHeaders }).then((r) => r.json()),
      fetch('/api/settings/english-test-registration-enabled', { headers: authHeaders }).then((r) => r.json()),
      fetch('/api/settings/english-test-registration-group-enabled', { headers: authHeaders }).then((r) => r.json()),
      fetch('/api/settings/learning-partner-enabled', { headers: authHeaders }).then((r) => r.json()),
      fetch('/api/admin/feature-flags', { headers: authHeaders }).then(async (r) => (r.ok ? r.json() : null)),
    ]);

    const surveyRequired = tasks[0].status === 'fulfilled' ? !!tasks[0].value.enabled : false;
    const englishReg = tasks[1].status === 'fulfilled' ? tasks[1].value.enabled !== false : true;
    const englishGroup = tasks[2].status === 'fulfilled' ? tasks[2].value.enabled !== false : true;
    const lpEnabled = tasks[3].status === 'fulfilled' ? tasks[3].value.enabled !== false : true;

    setSettings({
      surveyRequired,
      englishTestRegistrationEnabled: englishReg,
      englishTestRegistrationGroupEnabled: englishGroup,
      learningPartnerEnabled: lpEnabled,
    });

    if (tasks[4].status === 'fulfilled' && tasks[4].value?.success) {
      setFlags(tasks[4].value.data || {});
      setFlagsError('');
    } else {
      setFlags({});
      setFlagsError('Feature Flags 讀取失敗或權限不足。');
    }

    if (tasks.slice(0, 4).every((t) => t.status === 'rejected')) {
      setError('無法載入系統設定，請確認權限或稍後再試。');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const updateSetting = async (path, key, enabled) => {
    setSaving(true);
    try {
      const res = await fetch(path, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '更新失敗');
      setSettings((prev) => ({ ...prev, [key]: enabled }));
      const feedback = {
        type: 'success',
        message: `設定已更新：${key} -> ${enabled ? '啟用' : '停用'}`,
        at: new Date().toLocaleString('zh-TW'),
      };
      setLastFeedback(feedback);
      toast.success('設定已更新');
    } catch (e) {
      const feedback = {
        type: 'danger',
        message: '設定更新失敗',
        at: new Date().toLocaleString('zh-TW'),
      };
      setLastFeedback(feedback);
      toast.error('設定更新失敗');
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = async (flagName, value) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/feature-flags/${encodeURIComponent(flagName)}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '更新 Feature Flag 失敗');
      setFlags((prev) => ({ ...prev, [flagName]: value }));
      const feedback = {
        type: 'success',
        message: `Feature Flag 已更新：${flagName} -> ${value ? '啟用' : '停用'}`,
        at: new Date().toLocaleString('zh-TW'),
      };
      setLastFeedback(feedback);
      toast.success('設定已更新');
    } catch (e) {
      const feedback = {
        type: 'danger',
        message: '設定更新失敗',
        at: new Date().toLocaleString('zh-TW'),
      };
      setLastFeedback(feedback);
      toast.error('設定更新失敗');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="d-flex align-items-center gap-2 p-4" role="status" aria-busy="true">
        <Spinner animation="border" size="sm" />
        <div>載入系統設定中...</div>
      </div>
    );
  if (error) return <div className="alert alert-warning">{error}</div>;

  return (
    <div>
      <div className="d-flex justify-content-end align-items-center mb-3">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} disabled={saving}>
          {saving ? '儲存中...' : '重新整理'}
        </button>
      </div>
      {lastFeedback ? (
        <div className={`alert alert-${lastFeedback.type} py-2`} role="status">
          <div>{lastFeedback.message}</div>
          <div className="small opacity-75">時間：{lastFeedback.at}</div>
        </div>
      ) : null}

      <div className="card shadow-sm mb-3">
        <div className="card-header">系統開關</div>
        <div className="card-body">
          <ToggleRow
            title="問卷強制門檻"
            desc="控制特定活動是否需先完成問卷"
            value={settings.surveyRequired}
            loading={saving}
            onChange={(v) => updateSetting('/api/settings/survey-required', 'surveyRequired', v)}
          />
          <ToggleRow
            title="英檢個人報名開關"
            desc="控制英檢個人報名功能啟用/停用"
            value={settings.englishTestRegistrationEnabled}
            loading={saving}
            onChange={(v) => updateSetting('/api/settings/english-test-registration-enabled', 'englishTestRegistrationEnabled', v)}
          />
          <ToggleRow
            title="英檢團體報名開關"
            desc="控制英檢團體報名功能啟用/停用"
            value={settings.englishTestRegistrationGroupEnabled}
            loading={saving}
            onChange={(v) => updateSetting('/api/settings/english-test-registration-group-enabled', 'englishTestRegistrationGroupEnabled', v)}
          />
          <ToggleRow
            title="Learning Partner 開關"
            desc="控制 Learning Partner 報名流程啟用/停用"
            value={settings.learningPartnerEnabled}
            loading={saving}
            onChange={(v) => updateSetting('/api/settings/learning-partner-enabled', 'learningPartnerEnabled', v)}
          />
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-header">Feature Flags</div>
        <div className="card-body">
          {flagsError ? (
            <div className="alert alert-warning mb-0">{flagsError}</div>
          ) : Object.keys(flags).length === 0 ? (
            <div className="text-muted small">目前沒有可顯示的 Feature Flags。</div>
          ) : (
            Object.entries(flags).map(([flagName, value]) => (
              <ToggleRow
                key={flagName}
                title={flagName}
                desc="系統功能旗標"
                value={!!value}
                loading={saving}
                onChange={(v) => toggleFlag(flagName, v)}
              />
            ))
          )}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header">其他設定入口</div>
        <div className="card-body d-flex flex-wrap gap-2">
          <Link to="/admin/survey-settings" className="btn btn-outline-primary btn-sm">問卷設定管理</Link>
          <Link to="/admin/announcements" className="btn btn-outline-primary btn-sm">公告管理</Link>
          <Link to="/admin/english-test" className="btn btn-outline-primary btn-sm">英檢管理</Link>
          <Link to="/admin/logs" className="btn btn-outline-secondary btn-sm">操作紀錄</Link>
        </div>
      </div>
    </div>
  );
}

