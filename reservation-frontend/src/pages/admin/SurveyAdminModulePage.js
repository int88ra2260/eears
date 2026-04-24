/**
 * 產品級問卷模組：總覽（串接 GET /api/admin/surveys）
 * 詳細編輯／版本／規則等可逐步擴充子路由。
 */
import React, { useEffect, useState, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import { buildAccessProfile, hasPermission } from '../../utils/accessControl';
import { P } from '../../constants/permissions';

export default function SurveyAdminModulePage() {
  const { token, userRole, accessProfile: ctxProfile } = useOutletContext();
  const accessProfile = ctxProfile || buildAccessProfile(token || '', userRole || '');
  const canView = hasPermission(accessProfile, P.CAN_VIEW_SURVEYS);
  const canManage = hasPermission(accessProfile, P.CAN_MANAGE_SURVEYS);
  const canPublish = hasPermission(accessProfile, P.CAN_PUBLISH_SURVEYS);
  const canResponses = hasPermission(accessProfile, P.CAN_VIEW_SURVEY_RESPONSES);
  const canAnalytics = hasPermission(accessProfile, P.CAN_VIEW_SURVEY_ANALYTICS);
  const canExportNew = hasPermission(accessProfile, P.CAN_EXPORT_SURVEY_RESPONSES);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'X-User-Role': accessProfile.role || 'worker',
    }),
    [token, accessProfile.role]
  );

  useEffect(() => {
    if (!token || !canView) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/admin/surveys', { headers });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || data.message || `載入失敗 (${res.status})`);
        }
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e.message || '載入失敗');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, canView, headers]);

  if (!canView) {
    return (
      <div className="container py-4">
        <Alert variant="warning">您沒有檢視問卷模組的權限。</Alert>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1 text-primary">問卷模組</h2>
          <p className="text-muted small mb-0">
            已發布版本為學生端正式來源；此列表來自資料庫（未遷移時可能為空）。
          </p>
        </div>
        {canManage && (
          <Button variant="outline-primary" size="sm" disabled title="請使用 API 或後續「新增問卷」表單">
            新增問卷（即將開放）
          </Button>
        )}
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          {loading && (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" variant="primary" />
            </div>
          )}
          {!loading && error && <Alert variant="danger">{error}</Alert>}
          {!loading && !error && rows.length === 0 && (
            <Alert variant="info" className="mb-0">
              尚無問卷資料。請先執行後端 migration（<code>20260410120000-create-survey-product-module-tables.js</code>
              ）以從 <code>surveys.json</code> 與 <code>survey_settings</code> 初始化。
            </Alert>
          )}
          {!loading && !error && rows.length > 0 && (
            <div className="table-responsive">
              <Table hover size="sm" className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>名稱</th>
                    <th>surveyKey</th>
                    <th>狀態</th>
                    <th>發布版號</th>
                    <th>啟用</th>
                    <th>必填</th>
                    <th>回答數</th>
                    <th>更新</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>
                        <code className="small">{r.surveyKey}</code>
                      </td>
                      <td>{r.status}</td>
                      <td>{r.publishedVersionNumber ?? '—'}</td>
                      <td>{r.isEnabled == null ? '—' : r.isEnabled ? '是' : '否'}</td>
                      <td>{r.isRequired == null ? '—' : r.isRequired ? '是' : '否'}</td>
                      <td>{r.responseCount}</td>
                      <td className="text-nowrap small">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—'}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          <Button
                            as="a"
                            size="sm"
                            variant="outline-secondary"
                            href={`/survey/${r.surveyKey}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            預覽
                          </Button>
                          {canResponses && (
                            <Link className="btn btn-sm btn-outline-primary" to={`/admin/survey-responses/${r.id}`}>
                              作答
                            </Link>
                          )}
                          {canAnalytics && (
                            <Link className="btn btn-sm btn-outline-primary" to={`/admin/survey-analytics/${r.id}`}>
                              統計
                            </Link>
                          )}
                          {canPublish && (
                            <span className="btn btn-sm btn-outline-secondary disabled">發布</span>
                          )}
                          {canExportNew && (
                            <span className="btn btn-sm btn-outline-secondary disabled">匯出(JSON)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <p className="small text-muted mt-3 mb-0">
        舊版「問卷管理」（依字串 surveyId 的統計／Excel）仍於{' '}
        <Link to="/admin/surveys">/admin/surveys</Link> 保留相容。
      </p>
    </div>
  );
}
