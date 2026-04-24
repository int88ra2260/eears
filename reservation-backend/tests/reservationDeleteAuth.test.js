const request = require('supertest');
const express = require('express');

const P = {
  CAN_MANAGE_EVENTS: 'can_manage_events',
};

const hasPermission = (user, permission) =>
  Boolean(user && Array.isArray(user.permissions) && user.permissions.includes(permission));

const canAccessEventType = (user, eventType) => {
  if (!user) return false;
  if (Array.isArray(user.allowedEventTypes) && user.allowedEventTypes.includes('all')) return true;
  return Array.isArray(user.allowedEventTypes) && user.allowedEventTypes.includes(eventType);
};

jest.mock('../middlewares/auth', () => ({
  authMiddleware: (req, _res, next) => next(),
  optionalAuthMiddleware: (req, _res, next) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader === 'Bearer manage-events-et') {
      req.user = {
        role: 'teacher',
        permissions: [P.CAN_MANAGE_EVENTS],
        allowedEventTypes: ['English Table'],
      };
    } else if (authHeader === 'Bearer no-permission') {
      req.user = {
        role: 'teacher',
        permissions: [],
        allowedEventTypes: ['English Table'],
      };
    } else if (authHeader === 'Bearer no-scope') {
      req.user = {
        role: 'teacher',
        permissions: [P.CAN_MANAGE_EVENTS],
        allowedEventTypes: ['Job Talk'],
      };
    }
    next();
  },
  requirePermission: () => (_req, _res, next) => next(),
  requirePermissionAndEventAccess: () => (_req, _res, next) => next(),
  hasPermission,
  canAccessEventType,
  P,
}));

const mockReservationFindByPk = jest.fn();
const mockUserFindByPk = jest.fn();

jest.mock('../models', () => ({
  Event: {},
  Reservation: {
    findByPk: (...args) => mockReservationFindByPk(...args),
  },
  User: {
    findByPk: (...args) => mockUserFindByPk(...args),
  },
  sequelize: {
    transaction: jest.fn(async () => ({
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
  },
}));

jest.mock('../middlewares/checkSurvey', () => ({
  checkSurvey: (_req, _res, next) => next(),
}));

jest.mock('../utils/reservationTime', () => ({
  calculateReservationTime: jest.fn(() => new Date()),
}));

jest.mock('../utils/validators', () => ({
  validateStudentId: jest.fn(() => true),
  validateName: jest.fn(() => true),
}));

jest.mock('../config/email', () => ({
  sendEmail: jest.fn(),
  transporter: {},
}));

jest.mock('../services/auditLogService', () => ({
  logAuditAsync: jest.fn(),
}));

jest.mock('../services/notificationService', () => ({
  createFromEmailTemplate: jest.fn(() => Promise.resolve()),
}));

jest.mock('../utils/emailQueue', () => ({
  enqueue: jest.fn(() => Promise.resolve()),
}));

const reservationRouter = require('../routes/reservationRouter');

function makeReservation({
  eventType = 'English Table',
  date = '2026-04-10',
  startTime = '15:00:00',
  cancellationCode = '123456',
} = {}) {
  return {
    id: 99,
    userId: 1,
    studentId: 'A12345678',
    studentName: 'Test Student',
    studentEmail: 'test@example.com',
    checkinStatus: '未簽到',
    cancellationCode,
    Event: {
      id: 88,
      name: 'Mock Event',
      eventType,
      date,
      startTime,
      endTime: '17:00:00',
    },
    destroy: jest.fn(async () => {}),
  };
}

describe('DELETE /api/reservations/:id auth regression', () => {
  let app;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-10T10:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', reservationRouter);
  });

  it('前台：正確驗證碼可取消成功', async () => {
    const reservation = makeReservation({
      date: '2026-04-10',
      startTime: '15:00:00',
      cancellationCode: '111222',
    });
    mockReservationFindByPk.mockResolvedValueOnce(reservation);

    const res = await request(app)
      .delete('/api/reservations/99')
      .send({ cancellationCode: '111222' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('已取消');
    expect(reservation.destroy).toHaveBeenCalledTimes(1);
  });

  it('前台：錯誤驗證碼會失敗', async () => {
    const reservation = makeReservation({
      date: '2026-04-10',
      startTime: '15:00:00',
      cancellationCode: '111222',
    });
    mockReservationFindByPk.mockResolvedValueOnce(reservation);

    const res = await request(app)
      .delete('/api/reservations/99')
      .send({ cancellationCode: '999999' });

    expect(res.status).toBe(400);
    expect(String(res.body.error || '')).toContain('驗證碼錯誤');
    expect(reservation.destroy).not.toHaveBeenCalled();
  });

  it('前台：活動前 2 小時內取消會失敗', async () => {
    const reservation = makeReservation({
      date: '2026-04-10',
      startTime: '11:00:00',
      cancellationCode: '111222',
    });
    mockReservationFindByPk.mockResolvedValueOnce(reservation);

    const res = await request(app)
      .delete('/api/reservations/99')
      .send({ cancellationCode: '111222' });

    expect(res.status).toBe(400);
    expect(String(res.body.error || '')).toContain('2小時');
    expect(reservation.destroy).not.toHaveBeenCalled();
  });

  it('後台：有 can_manage_events 且有 event scope 可刪除成功', async () => {
    const reservation = makeReservation({
      eventType: 'English Table',
      cancellationCode: '111222',
    });
    mockReservationFindByPk.mockResolvedValueOnce(reservation);

    const res = await request(app)
      .delete('/api/reservations/99')
      .set('Authorization', 'Bearer manage-events-et')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('已取消');
    expect(reservation.destroy).toHaveBeenCalledTimes(1);
  });

  it('後台：有 token 但無權限或無 scope 直接 403', async () => {
    const reservation1 = makeReservation({ eventType: 'English Table' });
    mockReservationFindByPk.mockResolvedValueOnce(reservation1);
    const r1 = await request(app)
      .delete('/api/reservations/99')
      .set('Authorization', 'Bearer no-permission')
      .send({});

    expect(r1.status).toBe(403);
    expect(String(r1.body.error || '')).toContain('權限不足');
    expect(reservation1.destroy).not.toHaveBeenCalled();

    const reservation2 = makeReservation({ eventType: 'English Table' });
    mockReservationFindByPk.mockResolvedValueOnce(reservation2);
    const r2 = await request(app)
      .delete('/api/reservations/99')
      .set('Authorization', 'Bearer no-scope')
      .send({});

    expect(r2.status).toBe(403);
    expect(String(r2.body.error || '')).toContain('權限不足');
    expect(reservation2.destroy).not.toHaveBeenCalled();
  });
});

