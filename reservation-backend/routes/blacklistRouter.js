// routes/blacklistRouter.js
const express = require('express');
const dayjs = require('dayjs');
const nodemailer = require('nodemailer'); // ★ 如需寄信
const fs = require('fs');
const path = require('path');
const { authMiddleware, workerMiddleware, adminMiddleware } = require('../middlewares/auth');

// 請自行改成你的gmail帳號 & 應用程式密碼
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your_gmail@gmail.com',
    pass: 'your_app_password'
  }
});

const router = express.Router();
const { User, BlackListRecord, Reservation, Event, EventViolation } = require('../models');
const auditLogService = require('../services/auditLogService');


// ========== 登記違規 ==========
// POST /api/blacklist/recordViolation
router.post('/recordViolation', authMiddleware, workerMiddleware, async (req, res) => {
  try {
    const { studentId, name, reason } = req.body;
    
    // 參數驗證：確保至少提供 studentId 或 name 其中一個
    const hasStudentId = studentId && studentId !== undefined && studentId !== null && String(studentId).trim() !== '';
    const hasName = name && name !== undefined && name !== null && String(name).trim() !== '';
    
    if (!hasStudentId && !hasName) {
      return res.status(400).json({ 
        success: false,
        errorCode: 'MISSING_IDENTIFIER',
        message: '請提供學號或姓名',
        error: '請提供學號或姓名'
      });
    }

    let user = null;
    if (hasStudentId) {
      const trimmedStudentId = String(studentId).trim();
      user = await User.findOne({ where: { studentId: trimmedStudentId } });
    }
    
    if (!user && hasName) {
      const trimmedName = String(name).trim();
      user = await User.findOne({ where: { name: trimmedName } });
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: '找不到對應的學生',
        error: '找不到對應的學生'
      });
    }

    // ★ 新增一筆 BlackListRecord 到資料庫
    await BlackListRecord.create({
      userId: user.id,
      recordedAt: new Date(),
      reason: reason || '違規'
    });

    // 累加違規次數，不歸零
    user.violationCount += 1;

    // 若違規次數 >= 2 => 進入黑名單
    if (user.violationCount >= 2) {
      const now = dayjs();
      const dayOfWeek = now.day(); // 0=Sunday, 1=Monday, ... 6=Saturday
      let daysToAdd = 0;

      if (dayOfWeek === 0) {
        // 如果今天是禮拜天 => +7天
        daysToAdd = 7;
      } else {
        // 其他 => 到下個禮拜天再加一週 => 14 - dayOfWeek
        daysToAdd = 14 - dayOfWeek;
      }

      // 設定解鎖時間 (下個或下下個禮拜天) 的 23:59:59
      const unlockDate = now
        .add(daysToAdd, 'day')
        .hour(23)
        .minute(59)
        .second(59);

      user.isBlacklisted = true;
      user.blacklistUntil = unlockDate.toDate();
      // 不歸零 violationCount
      await user.save();

      // 取消該使用者未來預約
      const reservations = await Reservation.findAll({
        where: { userId: user.id },
        include: [Event],
      });

      for (const r of reservations) {
        const eventStart = dayjs(`${r.Event.date}T${r.Event.startTime}`);
        // 若該活動尚未開始，且開始時間 < unlockDate，就取消
        if (eventStart.isAfter(now) && eventStart.isBefore(unlockDate)) {
          await r.destroy();

          // 發送黑名單通知郵件 (使用佇列，非阻塞)
          const emailQueue = require('../utils/emailQueue');
          const requestId = req.requestId;
          emailQueue.enqueue('blacklistNotification', {
            name: user.name,
            studentId: user.studentId,
            email: user.email,
            eventName: r.Event.name,
            eventType: r.Event.eventType,
            date: r.Event.date,
            startTime: r.Event.startTime,
            endTime: r.Event.endTime,
            unlockDate: unlockDate.format('YYYY/MM/DD HH:mm')
          }, {
            requestId,
            relatedEntityType: 'blacklist',
            relatedEntityId: user.id,
          }).catch(err => {
            console.error('郵件加入佇列失敗:', err);
            // 不影響黑名單流程
          });
        }
      }

      auditLogService.logAuditAsync({
        module: 'blacklist',
        action: 'record_violation_blacklist',
        entityType: 'User',
        entityId: user.id,
        targetSummary: `studentId=${user.studentId} violationCount=${user.violationCount}`,
        afterData: { blacklisted: true, unlockDate: unlockDate.toISOString() },
        req,
      });
      return res.json({
        message: `已達第二次違規，使用者進入黑名單至 ${unlockDate.format('YYYY/MM/DD HH:mm:ss')}，並取消該期間內預約`,
      });
    } else {
      // 第一次違規
      await user.save();
      auditLogService.logAuditAsync({
        module: 'blacklist',
        action: 'record_violation_first',
        entityType: 'User',
        entityId: user.id,
        targetSummary: `studentId=${user.studentId} violationCount=${user.violationCount}`,
        afterData: { violationCount: user.violationCount },
        req,
      });
      return res.json({ message: '已紀錄此違規行為' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
});

// ========== 批次登記違規 ==========
// POST /api/blacklist/batchRecordViolations
router.post('/batchRecordViolations', authMiddleware, workerMiddleware, async (req, res) => {
  try {
    const { violations } = req.body;
    if (!violations || !Array.isArray(violations)) {
      return res.status(400).json({ message: '請提供有效的違規資料' });
    }

    const results = {
      successCount: 0,
      failureCount: 0,
      failures: []
    };

    for (const violation of violations) {
      try {
        const { studentId, name, reason } = violation;
        if (!studentId && !name) {
          results.failureCount++;
          results.failures.push({ violation, error: '請提供學號或姓名' });
          continue;
        }

        let user = await User.findOne({ where: { studentId } });
        if (!user && name) {
          user = await User.findOne({ where: { name } });
        }
        if (!user) {
          results.failureCount++;
          results.failures.push({ violation, error: '找不到對應的學生' });
          continue;
        }

        // 新增違規紀錄
        await BlackListRecord.create({
          userId: user.id,
          recordedAt: new Date(),
          reason: reason || '違規'
        });

        // 累加違規次數
        user.violationCount += 1;

        // 若違規次數 >= 2 => 進入黑名單
        if (user.violationCount >= 2) {
          const now = dayjs();
          const dayOfWeek = now.day();
          let daysToAdd = 0;

          if (dayOfWeek === 0) {
            daysToAdd = 7;
          } else {
            daysToAdd = 14 - dayOfWeek;
          }

          const unlockDate = now
            .add(daysToAdd, 'day')
            .hour(23)
            .minute(59)
            .second(59);

          user.isBlacklisted = true;
          user.blacklistUntil = unlockDate.toDate();
          await user.save();

          // 取消該使用者未來預約
          const reservations = await Reservation.findAll({
            where: { userId: user.id },
            include: [Event],
          });

          for (const r of reservations) {
            const eventDate = dayjs(r.Event.date);
            if (eventDate.isAfter(now)) {
              await r.destroy();
            }
          }
        } else {
          await user.save();
        }

        results.successCount++;
      } catch (err) {
        console.error('處理單筆違規錯誤:', err);
        results.failureCount++;
        results.failures.push({ violation, error: err.message });
      }
    }

    res.json(results);
  } catch (err) {
    console.error('批次登記違規錯誤:', err);
    res.status(500).json({ message: '批次登記失敗' });
  }
});


// 學期日期範圍判斷函數
function getSemesterInfo(date) {
  const eventDate = new Date(date);
  const year = eventDate.getFullYear();
  const month = eventDate.getMonth() + 1; // getMonth() 返回 0-11
  
  // 113-2學期: 2025/02/01 到 2025/07/31
  if (year === 2025 && month >= 2 && month <= 7) {
    return '113-2';
  }
  // 114-1學期: 2025/08/01 到 2026/01/31
  if ((year === 2025 && month >= 8) || (year === 2026 && month <= 1)) {
    return '114-1';
  }
  // 114-2學期: 2026/02/01 到 2026/07/31
  if (year === 2026 && month >= 2 && month <= 7) {
    return '114-2';
  }
  // 115-1學期: 2026/09/01 到 2027/01/31
  if ((year === 2026 && month >= 9) || (year === 2027 && month <= 1)) {
    return '115-1';
  }
  // 115-2學期: 2027/02/01 到 2027/07/31
  if (year === 2027 && month >= 2 && month <= 7) {
    return '115-2';
  }
  
  return 'other';
}

// 取得當前學期
function getCurrentSemester() {
  const now = new Date();
  return getSemesterInfo(now.toISOString().split('T')[0]);
}

// ========== 取得所有違規紀錄 ==========
// GET /api/blacklist
router.get('/', authMiddleware, workerMiddleware, async (req, res) => {
  try {
    const { semester } = req.query;
    
    // 取得所有 BlackListRecord，關聯對應的使用者 (User)
    let records = await BlackListRecord.findAll({
      order: [['recordedAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: [
            'id',
            'studentId',
            'name',
            'email',
            'violationCount',
            'isBlacklisted',
            'blacklistUntil'
          ]
        }
      ]
    });

    // 為每個記錄添加活動資訊
    for (let record of records) {
      // 檢查 User 是否存在
      if (!record.User || !record.User.id) {
        record.dataValues.eventType = null;
        record.dataValues.eventDate = null;
        record.dataValues.eventName = null;
        continue;
      }

      // 查找該使用者最近的活動違規記錄
      const eventViolation = await EventViolation.findOne({
        where: { userId: record.User.id },
        include: [
          {
            model: Event,
            attributes: ['eventType', 'date', 'name']
          }
        ],
        order: [['recordedAt', 'DESC']]
      });

      if (eventViolation && eventViolation.Event) {
        record.dataValues.eventType = eventViolation.Event.eventType;
        record.dataValues.eventDate = eventViolation.Event.date;
        record.dataValues.eventName = eventViolation.Event.name;
      } else {
        // 如果沒有找到 EventViolation，嘗試從 Reservation 中查找相關活動
        const reservation = await Reservation.findOne({
          where: { userId: record.User.id },
          include: [
            {
              model: Event,
              attributes: ['eventType', 'date', 'name']
            }
          ],
          order: [['timestamp', 'DESC']]
        });

        if (reservation && reservation.Event) {
          record.dataValues.eventType = reservation.Event.eventType;
          record.dataValues.eventDate = reservation.Event.date;
          record.dataValues.eventName = reservation.Event.name;
        } else {
          record.dataValues.eventType = null;
          record.dataValues.eventDate = null;
          record.dataValues.eventName = null;
        }
      }
    }

    // 如果有指定學期，進行篩選
    if (semester && semester !== 'all') {
      records = records.filter(record => {
        const recordSemester = getSemesterInfo(record.recordedAt);
        return recordSemester === semester;
      });
    }

    return res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// DELETE /api/blacklist/:recordId
router.delete('/:recordId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { recordId } = req.params;
    const record = await BlackListRecord.findOne({
      where: { id: recordId },
      include: [User]
    });
    if (!record) {
      return res.status(404).json({ message: '找不到該違規紀錄' });
    }

    const user = record.User;
    if (!user) {
      return res.status(404).json({ message: '紀錄未關聯到使用者' });
    }

    // user.violationCount -= 1，但不得小於 0
    if (user.violationCount > 0) user.violationCount -= 1;

    // 若減完後 < 2 => 不需要在黑名單
    if (user.violationCount < 2) {
      user.isBlacklisted = false;
      user.blacklistUntil = null;
    }
    await user.save();

    // 刪除該筆違規紀錄
    await record.destroy();

    return res.json({ message: '已成功刪除該筆違規紀錄' });
  } catch (err) {
    console.error('刪除違規紀錄錯誤:', err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
});

module.exports = router;
