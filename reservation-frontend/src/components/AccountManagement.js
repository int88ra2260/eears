import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { P } from '../constants/permissions';
import { buildAccessProfile, hasPermission } from '../utils/accessControl';
import { SCOPE, ALL_SCOPES } from '../constants/scopes';
import {
  Table,
  Button,
  Modal,
  Form,
  Badge,
  Spinner,
  Alert,
  InputGroup
} from 'react-bootstrap';

const ROLE_OPTIONS = [
  { value: 'all', label: '全部角色' },
  { value: 'admin', label: '管理員' },
  { value: 'worker', label: '工讀生' },
  { value: 'teacher', label: '老師' }
];

const TEACHER_LEVEL_OPTIONS = [
  { value: 'regular', label: '一般老師' },
  { value: 'executive', label: '執行長' },
  { value: 'et_manager', label: 'English Table負責人' },
  { value: 'if_manager', label: 'International Forum負責人' },
  { value: 'jt_manager', label: 'Job Talk負責人' }
];

const STATUS_BADGE = {
  admin: 'bg-danger',
  worker: 'bg-primary',
  teacher: 'bg-success'
};

const PERMISSION_KEYS = Object.values(P);

const PERMISSION_LABELS = {
  [P.CAN_MANAGE_ACCOUNTS]: '帳號管理',
  [P.CAN_RESET_PASSWORDS]: '重設密碼',
  [P.CAN_VIEW_EVENTS_ADMIN]: '活動後台檢視',
  [P.CAN_MANAGE_EVENTS]: '活動管理',
  [P.CAN_VIEW_RESERVATIONS]: '預約名單檢視',
  [P.CAN_EXPORT_RESERVATIONS]: '預約匯出',
  [P.CAN_CHECKIN_STUDENTS]: '簽到作業',
  [P.CAN_VIEW_SURVEYS]: '問卷檢視',
  [P.CAN_MANAGE_SURVEYS]: '問卷管理',
  [P.CAN_EXPORT_SURVEYS]: '問卷匯出',
  [P.CAN_MANAGE_SURVEY_SETTINGS]: '問卷設定管理',
  [P.CAN_VIEW_CLASSES]: '班級檢視',
  [P.CAN_MANAGE_CLASSES]: '班級匯入/刪除',
  [P.CAN_IMPORT_BESTEP]: 'BESTEP 匯入',
  [P.CAN_EXPORT_BESTEP]: 'BESTEP 匯出',
  [P.CAN_VIEW_ENGLISH_TEST_METRICS]: '英檢總覽指標',
  [P.CAN_VIEW_ENGLISH_TESTS]: '英檢檢視',
  [P.CAN_MANAGE_ENGLISH_TESTS]: '英檢管理',
  [P.CAN_REVIEW_ENGLISH_TEST_REGISTRATIONS]: '培力英檢審核',
  [P.CAN_EXPORT_ENGLISH_TEST_DATA]: '培力英檢匯出',
  [P.CAN_VIEW_BLACKLIST]: '黑名單檢視',
  [P.CAN_MANAGE_BLACKLIST]: '黑名單管理',
  [P.CAN_RECORD_VIOLATIONS]: '登記違規',
  [P.CAN_VIEW_ANALYTICS]: '分析檢視',
  [P.CAN_EXPORT_REPORTS]: '報表下載',
  [P.CAN_MANAGE_SETTINGS]: '系統設定',
  [P.CAN_MANAGE_FEATURE_FLAGS]: 'Feature Flags',
  [P.CAN_MANAGE_ANNOUNCEMENTS]: '公告管理',
  [P.CAN_VIEW_AUDIT_LOGS]: '操作紀錄/稽核',
  [P.CAN_MANAGE_ENGLISH_TEST_TRACKING]: '英語學習歷程中心',
  [P.CAN_VIEW_INTERNAL_DIAGNOSTICS]: '系統診斷',
  [P.CAN_MANAGE_LEARNING_PARTNER_ADMIN]: '學習有伴後台管理',
};

const SCOPE_LABELS = {
  [SCOPE.ALL]: '全部（all）',
  [SCOPE.ENGLISH_TABLE]: 'English Table',
  [SCOPE.INTERNATIONAL_FORUM]: 'International Forum',
  [SCOPE.JOB_TALK]: 'Job Talk',
  [SCOPE.CLASS]: '班級（class）',
  [SCOPE.SURVEY_ENGLISH_TABLE]: 'ET 問卷（survey_english_table）',
  [SCOPE.ENGLISH_TEST]: '英檢（english_test）',
};

function pickPermissionLabel(key) {
  return PERMISSION_LABELS[key] || key;
}

function AccountManagement() {
  const { token, userRole, accessProfile: ctxProfile } = useOutletContext();
  const accessProfile = ctxProfile || buildAccessProfile(token || '', userRole || '');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({ role: 'all', search: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    email: '',
    role: 'teacher',
    teacherLevel: 'regular',
    department: '',
    phone: '',
    password: ''
  });
  const [saving, setSaving] = useState(false);
  const [resetInfo, setResetInfo] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'teacher',
    teacherLevel: 'regular',
    isActive: true,
    disabledReason: '',
    mustResetPassword: false,
  });
  const [editPermMode, setEditPermMode] = useState({}); // key -> inherit|allow|deny
  const [scopeMode, setScopeMode] = useState('inherit'); // inherit|custom
  const [customScopes, setCustomScopes] = useState([]);
  const [editSaving, setEditSaving] = useState(false);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }), [token]);

  const canManage = hasPermission(accessProfile, P.CAN_MANAGE_ACCOUNTS);

  const loadAccounts = useCallback(async () => {
    if (!token || !canManage) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('pageSize', 200);
      if (filters.role !== 'all') {
        params.append('role', filters.role);
      }
      if (filters.search) {
        params.append('search', filters.search.trim());
      }
      const response = await fetch(`/api/admin/teachers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '載入帳號資料失敗');
      }
      setAccounts(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters.role, filters.search, token, canManage]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleInputChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateAccount = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body = { ...createForm };
      if (!body.password) {
        delete body.password;
      }
      const response = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '建立帳號失敗');
      }
      setShowCreateModal(false);
      setCreateForm({ name: '', username: '', email: '', role: 'teacher', teacherLevel: 'regular', department: '', phone: '', password: '' });
      setSuccess('帳號建立成功');
      if (data.data?.temporaryPassword) {
        setResetInfo({
          username: data.data.username,
          password: data.data.temporaryPassword,
          message: '請將臨時密碼通知該使用者，首次登入後會強制修改。'
        });
      }
      loadAccounts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (account) => {
    try {
      setError('');
      const response = await fetch(`/api/admin/teachers/${account.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive: !account.isActive })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '更新帳號狀態失敗');
      }
      setSuccess(`帳號 ${account.username} 已${account.isActive ? '停用' : '啟用'}`);
      loadAccounts();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditModal = (account) => {
    setEditingAccount(account);
    setEditForm({
      name: account.name || '',
      email: account.email || '',
      role: account.role || 'teacher',
      teacherLevel: account.teacherLevel || 'regular',
      isActive: !!account.isActive,
      disabledReason: account.disabledReason || '',
      mustResetPassword: !!account.mustResetPassword,
    });

    const overrides = (account && account.permissions && typeof account.permissions === 'object') ? account.permissions : null;
    const nextMode = {};
    PERMISSION_KEYS.forEach((k) => {
      const v = overrides ? overrides[k] : undefined;
      nextMode[k] = v === true ? 'allow' : v === false ? 'deny' : 'inherit';
    });
    setEditPermMode(nextMode);

    const scopes = Array.isArray(account?.scopes) ? account.scopes : null;
    if (scopes && scopes.length) {
      setScopeMode('custom');
      setCustomScopes(scopes.filter((s) => ALL_SCOPES.includes(s)));
    } else {
      setScopeMode('inherit');
      setCustomScopes([]);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingAccount) return;
    setEditSaving(true);
    setError('');
    try {
      const permissions = {};
      Object.entries(editPermMode || {}).forEach(([k, mode]) => {
        if (mode === 'allow') permissions[k] = true;
        else if (mode === 'deny') permissions[k] = false;
      });
      const hasOverrides = Object.keys(permissions).length > 0;

      const scopes = scopeMode === 'custom' ? customScopes : null;

      const body = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        teacherLevel: editForm.role === 'teacher' ? editForm.teacherLevel : null,
        isActive: editForm.isActive,
        disabledReason: editForm.isActive ? null : (editForm.disabledReason || null),
        mustResetPassword: !!editForm.mustResetPassword,
        permissions: hasOverrides ? permissions : null,
        scopes,
      };
      const response = await fetch(`/api/admin/teachers/${editingAccount.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '更新失敗');
      }
      setSuccess('帳號已更新');
      setEditingAccount(null);
      loadAccounts();
    } catch (err) {
      setError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleResetPassword = async (account) => {
    try {
      setError('');
      const response = await fetch(`/api/admin/teachers/${account.id}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '重設密碼失敗');
      }
      if (data.data?.temporaryPassword) {
        setResetInfo({
          username: account.username,
          password: data.data.temporaryPassword,
          message: '已為使用者產生臨時密碼，請通知對方儘速登入並修改密碼。'
        });
      }
      loadAccounts();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!canManage) {
    return (
      <div className="alert alert-info mt-3" role="alert">
        您沒有檢視帳號管理的權限。
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-end align-items-center flex-wrap gap-2 mb-3">
        <div className="d-flex gap-2 flex-wrap">
          <InputGroup>
            <Form.Select
              value={filters.role}
              onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Form.Select>
          </InputGroup>
          <Form.Control
            placeholder="搜尋姓名、帳號或 Email"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            style={{ maxWidth: '260px' }}
          />
          <Button onClick={() => setShowCreateModal(true)}>新增帳號</Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <Table hover responsive bordered>
          <thead className="table-light">
            <tr>
              <th>帳號</th>
              <th>姓名</th>
              <th>Email</th>
              <th>角色</th>
              <th>老師層級</th>
              <th>自訂</th>
              <th>狀態</th>
              <th>需改密碼</th>
              <th>最後登入</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center text-muted">目前沒有帳號資料</td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.username}</td>
                  <td>{account.name}</td>
                  <td>{account.email}</td>
                  <td>
                    <Badge bg={STATUS_BADGE[account.role] || 'secondary'}>{account.role}</Badge>
                  </td>
                  <td>
                    {account.role === 'teacher' && account.teacherLevel ? (
                      <Badge bg="info">
                        {TEACHER_LEVEL_OPTIONS.find(opt => opt.value === account.teacherLevel)?.label || account.teacherLevel}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-1">
                      {account.permissions && Object.keys(account.permissions).length ? (
                        <Badge bg="warning" text="dark">自訂權限</Badge>
                      ) : (
                        <Badge bg="light" text="dark">預設權限</Badge>
                      )}
                      {Array.isArray(account.scopes) && account.scopes.length ? (
                        <Badge bg="warning" text="dark">自訂範圍</Badge>
                      ) : (
                        <Badge bg="light" text="dark">預設範圍</Badge>
                      )}
                    </div>
                  </td>
                  <td>
                    <Badge bg={account.isActive ? 'success' : 'secondary'}>
                      {account.isActive ? '啟用' : '停用'}
                    </Badge>
                  </td>
                  <td>{account.mustResetPassword ? '是' : '否'}</td>
                  <td>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : '—'}</td>
                  <td className="d-flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => openEditModal(account)}
                    >
                      編輯
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => handleResetPassword(account)}
                    >
                      重設密碼
                    </Button>
                    <Button
                      size="sm"
                      variant={account.isActive ? 'outline-danger' : 'outline-success'}
                      onClick={() => handleToggleStatus(account)}
                    >
                      {account.isActive ? '停用' : '啟用'}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>新增帳號</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateAccount}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>姓名 *</Form.Label>
              <Form.Control
                value={createForm.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>帳號 *</Form.Label>
              <Form.Control
                value={createForm.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control
                type="email"
                value={createForm.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>角色</Form.Label>
              <Form.Select
                value={createForm.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
              >
                {ROLE_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Form.Select>
            </Form.Group>
            {createForm.role === 'teacher' && (
              <Form.Group className="mb-3">
                <Form.Label>老師層級</Form.Label>
                <Form.Select
                  value={createForm.teacherLevel}
                  onChange={(e) => handleInputChange('teacherLevel', e.target.value)}
                >
                  {TEACHER_LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>系所/單位</Form.Label>
              <Form.Control
                value={createForm.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>電話</Form.Label>
              <Form.Control
                value={createForm.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>臨時密碼</Form.Label>
              <Form.Control
                type="password"
                placeholder="留空則自動產生"
                value={createForm.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>取消</Button>
            <Button type="submit" disabled={saving}>
              {saving ? '建立中...' : '建立'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!editingAccount} onHide={() => setEditingAccount(null)}>
        <Modal.Header closeButton>
          <Modal.Title>編輯帳號</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveEdit}>
          <Modal.Body>
            <p className="small text-muted mb-3">帳號：<strong>{editingAccount?.username}</strong>（使用者代號不可於此修改）</p>
            <Form.Group className="mb-3">
              <Form.Label>姓名 *</Form.Label>
              <Form.Control
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>角色</Form.Label>
              <Form.Select
                value={editForm.role}
                onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
              >
                {ROLE_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Form.Select>
            </Form.Group>
            {editForm.role === 'teacher' && (
              <Form.Group className="mb-3">
                <Form.Label>老師層級</Form.Label>
                <Form.Select
                  value={editForm.teacherLevel}
                  onChange={(e) => setEditForm((p) => ({ ...p, teacherLevel: e.target.value }))}
                >
                  {TEACHER_LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="edit-active"
                label="帳號啟用"
                checked={editForm.isActive}
                onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
            </Form.Group>

            {!editForm.isActive && (
              <Form.Group className="mb-3">
                <Form.Label>停用原因（可選）</Form.Label>
                <Form.Control
                  value={editForm.disabledReason}
                  onChange={(e) => setEditForm((p) => ({ ...p, disabledReason: e.target.value }))}
                  placeholder="例如：離職／暫停權限／測試帳號停用"
                />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="edit-must-reset"
                label="強制使用者下次登入需改密碼（mustResetPassword）"
                checked={!!editForm.mustResetPassword}
                onChange={(e) => setEditForm((p) => ({ ...p, mustResetPassword: e.target.checked }))}
              />
            </Form.Group>

            <hr />
            <div className="fw-semibold mb-2">Scopes（業務範圍）</div>
            <Form.Group className="mb-3">
              <Form.Select value={scopeMode} onChange={(e) => setScopeMode(e.target.value)}>
                <option value="inherit">使用預設 scopes（由 role/teacherLevel 推導）</option>
                <option value="custom">自訂 scopes（覆寫預設）</option>
              </Form.Select>
              <div className="small text-muted mt-1">
                自訂模式採「覆寫」：只會使用你勾選的 scopes。
              </div>
            </Form.Group>
            {scopeMode === 'custom' && (
              <div className="mb-3">
                {ALL_SCOPES.map((s) => (
                  <Form.Check
                    key={s}
                    type="checkbox"
                    id={`scope-${s}`}
                    label={SCOPE_LABELS[s] || s}
                    checked={customScopes.includes(s)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCustomScopes((prev) => checked ? Array.from(new Set([...prev, s])) : prev.filter((x) => x !== s));
                    }}
                  />
                ))}
              </div>
            )}

            <hr />
            <div className="fw-semibold mb-2">Permission Overrides（權限覆寫）</div>
            <div className="small text-muted mb-2">
              Inherit＝沿用預設；Allow＝強制開啟；Deny＝強制關閉（優先於預設）。
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto' }} className="border rounded p-2">
              {PERMISSION_KEYS.map((k) => (
                <div key={k} className="d-flex align-items-center justify-content-between gap-2 py-1">
                  <div className="small">{pickPermissionLabel(k)}</div>
                  <Form.Select
                    size="sm"
                    value={editPermMode?.[k] || 'inherit'}
                    onChange={(e) => setEditPermMode((p) => ({ ...(p || {}), [k]: e.target.value }))}
                    style={{ width: 140 }}
                  >
                    <option value="inherit">Inherit</option>
                    <option value="allow">Allow</option>
                    <option value="deny">Deny</option>
                  </Form.Select>
                </div>
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" type="button" onClick={() => setEditingAccount(null)}>取消</Button>
            <Button type="submit" disabled={editSaving}>{editSaving ? '儲存中...' : '儲存'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!resetInfo} onHide={() => setResetInfo(null)}>
        <Modal.Header closeButton>
          <Modal.Title>臨時密碼</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-1">帳號：<strong>{resetInfo?.username}</strong></p>
          <p className="mb-3">臨時密碼：<code>{resetInfo?.password}</code></p>
          <Alert variant="warning" className="mb-0">
            {resetInfo?.message}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setResetInfo(null)}>我已記錄</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default AccountManagement;


