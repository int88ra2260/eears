const mockFindByPk = jest.fn();
const mockRoleFindAll = jest.fn();
const mockOverrideFindAll = jest.fn();
const mockScopeFindAll = jest.fn();

jest.mock('../models', () => ({
  Teacher: { findByPk: (...args) => mockFindByPk(...args) },
  RolePermission: { findAll: (...args) => mockRoleFindAll(...args) },
  UserPermissionOverride: { findAll: (...args) => mockOverrideFindAll(...args) },
  UserScope: { findAll: (...args) => mockScopeFindAll(...args) },
}));

const debugService = require('../services/accessControl/debugService');

describe('debug access service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ACCESS_PROFILE_JSON_FALLBACK_ENABLED;
  });

  it('user 有 override 時 diff 可辨識 table 多出的權限', async () => {
    mockFindByPk.mockResolvedValue({
      id: 1, role: 'teacher', teacherLevel: 'et_manager', permissions: null, scopes: ['english_table'], accessVersion: 2,
    });
    mockRoleFindAll.mockResolvedValue([{ permission: 'can_view_surveys' }]);
    mockOverrideFindAll.mockResolvedValue([{ permission: 'can_manage_surveys', value: 'allow' }]);
    mockScopeFindAll.mockResolvedValue([{ scopeType: 'event', scopeValue: 'english_table' }]);
    const table = await debugService.buildEffectiveAccessTableFirst({
      userId: 1, role: 'teacher', teacherLevel: 'et_manager', jsonPermissions: null, jsonScopes: ['english_table'],
    });
    const json = await debugService.buildEffectiveAccessJsonFirst({
      userId: 1, role: 'teacher', teacherLevel: 'et_manager', jsonPermissions: null, jsonScopes: ['english_table'],
    });
    const diff = debugService.diffAccess(table, json);
    expect(Array.isArray(diff.permissionsOnlyInTable)).toBe(true);
  });

  it('fallback 分析可判斷 table 不足導致 json_fallback', () => {
    const fallback = debugService.analyzeFallback({ source: 'json_fallback', consistency: { hasMismatch: true } }, { source: 'json_first' });
    expect(fallback.required).toBe(true);
    expect(fallback.reason).toContain('table 缺少');
  });

  it('suggestion 可指出 version mismatch', () => {
    const tips = debugService.generateSuggestion(
      { permissionsOnlyInTable: [], permissionsOnlyInJson: [], scopesOnlyInTable: [], scopesOnlyInJson: [] },
      {
        basic: { accessVersion: 5 },
        tokenVersion: 2,
        table: { rolePermissions: [{ permission: 'can_view_events_admin' }], overrides: [], scopes: [] },
      }
    );
    expect(tips.join(' ')).toContain('ACCESS_PROFILE_STALE');
  });
});

