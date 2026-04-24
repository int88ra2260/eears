// scripts/generate-complete-demo-data.js
// 生成完整的 DEMO 測試資料（114-1 學期）
// 用於展示「班級參與概況」功能

const { sequelize } = require('../models');
const {
  Class,
  ClassMembership,
  EnglishTestRegistration,
  LearningPartnerTeam,
  LearningPartnerTeamMember,
  BestepAttendance,
  BestepExamScore,
  BestepExamSession,
  BestepTeamRanking,
  Event,
  Reservation,
  User
} = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const SEMESTER = '114-1';
const SEMESTER_START = '2025-08-01';
const SEMESTER_END = '2026-01-31';
const LR_EXAM_DATE = '2025-12-15';
const SW_EXAM_DATE = '2025-12-16';

// 測試學生資料（30位學生）
const DEMO_STUDENTS = [
  { studentId: 'E12345678', name: '王小明', department: '資訊工程學系', grade: 2, email: 'e12345678@student.nsysu.edu.tw' },
  { studentId: 'E12345679', name: '李小華', department: '資訊工程學系', grade: 2, email: 'e12345679@student.nsysu.edu.tw' },
  { studentId: 'E12345680', name: '張小美', department: '資訊工程學系', grade: 3, email: 'e12345680@student.nsysu.edu.tw' },
  { studentId: 'E12345681', name: '陳小強', department: '電機工程學系', grade: 2, email: 'e12345681@student.nsysu.edu.tw' },
  { studentId: 'E12345682', name: '林小芳', department: '電機工程學系', grade: 3, email: 'e12345682@student.nsysu.edu.tw' },
  { studentId: 'E12345683', name: '黃小偉', department: '機械工程學系', grade: 2, email: 'e12345683@student.nsysu.edu.tw' },
  { studentId: 'E12345684', name: '吳小玲', department: '機械工程學系', grade: 3, email: 'e12345684@student.nsysu.edu.tw' },
  { studentId: 'E12345685', name: '劉小傑', department: '材料工程學系', grade: 2, email: 'e12345685@student.nsysu.edu.tw' },
  { studentId: 'E12345686', name: '周小雅', department: '材料工程學系', grade: 3, email: 'e12345686@student.nsysu.edu.tw' },
  { studentId: 'E12345687', name: '鄭小豪', department: '化學工程學系', grade: 2, email: 'e12345687@student.nsysu.edu.tw' },
  { studentId: 'E12345688', name: '許小雯', department: '化學工程學系', grade: 3, email: 'e12345688@student.nsysu.edu.tw' },
  { studentId: 'E12345689', name: '謝小宏', department: '物理學系', grade: 2, email: 'e12345689@student.nsysu.edu.tw' },
  { studentId: 'E12345690', name: '羅小婷', department: '物理學系', grade: 3, email: 'e12345690@student.nsysu.edu.tw' },
  { studentId: 'E12345691', name: '蔡小宇', department: '數學系', grade: 2, email: 'e12345691@student.nsysu.edu.tw' },
  { studentId: 'E12345692', name: '楊小萱', department: '數學系', grade: 3, email: 'e12345692@student.nsysu.edu.tw' },
  { studentId: 'E12345693', name: '趙小翔', department: '生物科學系', grade: 2, email: 'e12345693@student.nsysu.edu.tw' },
  { studentId: 'E12345694', name: '孫小晴', department: '生物科學系', grade: 3, email: 'e12345694@student.nsysu.edu.tw' },
  { studentId: 'E12345695', name: '馬小龍', department: '海洋科學系', grade: 2, email: 'e12345695@student.nsysu.edu.tw' },
  { studentId: 'E12345696', name: '朱小鳳', department: '海洋科學系', grade: 3, email: 'e12345696@student.nsysu.edu.tw' },
  { studentId: 'E12345697', name: '陳小華', department: '資訊工程學系', grade: 1, email: 'e12345697@student.nsysu.edu.tw' },
  { studentId: 'E12345698', name: '林小強', department: '電機工程學系', grade: 1, email: 'e12345698@student.nsysu.edu.tw' },
  { studentId: 'E12345699', name: '黃小芳', department: '機械工程學系', grade: 1, email: 'e12345699@student.nsysu.edu.tw' },
  { studentId: 'E12345700', name: '吳小偉', department: '材料工程學系', grade: 1, email: 'e12345700@student.nsysu.edu.tw' },
  { studentId: 'E12345701', name: '劉小雅', department: '化學工程學系', grade: 1, email: 'e12345701@student.nsysu.edu.tw' },
  { studentId: 'E12345702', name: '周小豪', department: '物理學系', grade: 1, email: 'e12345702@student.nsysu.edu.tw' },
  { studentId: 'E12345703', name: '鄭小雯', department: '數學系', grade: 1, email: 'e12345703@student.nsysu.edu.tw' },
  { studentId: 'E12345704', name: '許小宏', department: '生物科學系', grade: 1, email: 'e12345704@student.nsysu.edu.tw' },
  { studentId: 'E12345705', name: '謝小婷', department: '海洋科學系', grade: 1, email: 'e12345705@student.nsysu.edu.tw' },
  { studentId: 'E12345706', name: '羅小宇', department: '資訊工程學系', grade: 4, email: 'e12345706@student.nsysu.edu.tw' },
  { studentId: 'E12345707', name: '蔡小萱', department: '電機工程學系', grade: 4, email: 'e12345707@student.nsysu.edu.tw' }
];

// 測試班級資料
const DEMO_CLASSES = [
  { name: '英文中級 GEEN116', teacherName: '莊家雄', department: '外語教學中心' },
  { name: '英文進階 GEEN218', teacherName: '莊家雄', department: '外語教學中心' }
];

// 活動類型
const EVENT_TYPES = ['English Table', 'English Club', 'Job Talk', 'International Forum'];

// 輔助函數：生成英文姓名
function generateEnglishName(chineseName, index) {
  const lastNames = ['Wang', 'Li', 'Chang', 'Chen', 'Lin', 'Huang', 'Wu', 'Liu', 'Chou', 'Cheng', 'Hsu', 'Hsieh', 'Lo', 'Tsai', 'Yang', 'Chao', 'Sun', 'Ma', 'Chu'];
  const firstNames = ['Ming', 'Hua', 'Mei', 'Chiang', 'Fang', 'Wei', 'Ling', 'Chieh', 'Ya', 'Hao', 'Wen', 'Hung', 'Ting', 'Yu', 'Hsuan', 'Hsiang', 'Ching', 'Lung', 'Feng'];
  
  return {
    lastNameEn: lastNames[index % lastNames.length],
    firstNameEn: firstNames[index % firstNames.length]
  };
}

// 輔助函數：生成身分證字號
function generateIdNumber(index) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVXYWZIO';
  const letter = letters[index % letters.length];
  const numbers = String(10000000 + index).slice(-8);
  return `${letter}${numbers}`;
}

// 輔助函數：生成日期（學期範圍內）
function generateDateInSemester(offsetDays = 0) {
  const start = new Date(SEMESTER_START);
  const end = new Date(SEMESTER_END);
  const range = end.getTime() - start.getTime();
  const randomTime = start.getTime() + (Math.random() * range) + (offsetDays * 24 * 60 * 60 * 1000);
  const date = new Date(randomTime);
  return date.toISOString().split('T')[0];
}

// 輔助函數：生成成績
function generateScore(studentId, index) {
  const passed = index < DEMO_STUDENTS.length * 0.6;
  
  if (passed) {
    const levels = ['B2', 'C1', 'C2'];
    const scores = [120, 130, 140, 145];
    return {
      listeningScore: scores[Math.floor(Math.random() * scores.length)],
      readingScore: scores[Math.floor(Math.random() * scores.length)],
      speakingScore: scores[Math.floor(Math.random() * scores.length)],
      writingScore: scores[Math.floor(Math.random() * scores.length)],
      listeningLevel: levels[Math.floor(Math.random() * levels.length)],
      readingLevel: levels[Math.floor(Math.random() * levels.length)],
      speakingLevel: levels[Math.floor(Math.random() * levels.length)],
      writingLevel: levels[Math.floor(Math.random() * levels.length)]
    };
  } else {
    const lowLevels = ['A1', 'A2', 'B1'];
    const highLevels = ['B2', 'C1'];
    return {
      listeningScore: 80 + Math.floor(Math.random() * 50),
      readingScore: 80 + Math.floor(Math.random() * 50),
      speakingScore: 80 + Math.floor(Math.random() * 50),
      writingScore: 80 + Math.floor(Math.random() * 50),
      listeningLevel: Math.random() > 0.3 ? highLevels[Math.floor(Math.random() * highLevels.length)] : lowLevels[Math.floor(Math.random() * lowLevels.length)],
      readingLevel: Math.random() > 0.3 ? highLevels[Math.floor(Math.random() * highLevels.length)] : lowLevels[Math.floor(Math.random() * lowLevels.length)],
      speakingLevel: Math.random() > 0.3 ? highLevels[Math.floor(Math.random() * highLevels.length)] : lowLevels[Math.floor(Math.random() * lowLevels.length)],
      writingLevel: Math.random() > 0.3 ? highLevels[Math.floor(Math.random() * highLevels.length)] : lowLevels[Math.floor(Math.random() * lowLevels.length)]
    };
  }
}

async function generateDemoData() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🚀 開始生成完整 DEMO 測試資料（114-1 學期）...\n');

    // 1. 建立班級
    console.log('📚 建立班級...');
    const classes = [];
    for (const classData of DEMO_CLASSES) {
      const [classRecord, created] = await Class.findOrCreate({
        where: {
          name: classData.name,
          semester: SEMESTER
        },
        defaults: {
          ...classData,
          semester: SEMESTER
        },
        transaction
      });
      classes.push(classRecord);
      console.log(`  ${created ? '✅ 新增' : 'ℹ️  已存在'}: ${classData.name}`);
    }

    // 2. 建立班級成員
    console.log('\n👥 建立班級成員...');
    for (let i = 0; i < DEMO_STUDENTS.length; i++) {
      const student = DEMO_STUDENTS[i];
      const classIndex = i % classes.length;
      const classRecord = classes[classIndex];
      
      await ClassMembership.findOrCreate({
        where: {
          classId: classRecord.id,
          studentId: student.studentId,
          semester: SEMESTER
        },
        defaults: {
          classId: classRecord.id,
          studentId: student.studentId,
          semester: SEMESTER,
          studentName: student.name,
          department: student.department,
          email: student.email,
          grade: student.grade
        },
        transaction
      });
    }
    console.log(`  ✅ 共建立 ${DEMO_STUDENTS.length} 位學生`);

    // 3. 建立培力英檢報名（80% 報名成功）
    console.log('\n📝 建立培力英檢報名...');
    const registrations = [];
    for (let i = 0; i < DEMO_STUDENTS.length; i++) {
      const student = DEMO_STUDENTS[i];
      const englishName = generateEnglishName(student.name, i);
      const idNumber = generateIdNumber(i);
      const willRegister = Math.random() < 0.8; // 80% 報名
      
      if (willRegister) {
        const [registration] = await EnglishTestRegistration.findOrCreate({
          where: {
            studentId: student.studentId
          },
          defaults: {
            studentId: student.studentId,
            name: student.name,
            idNumber: idNumber,
            email: student.email,
            studentNameZh: student.name,
            lastNameEn: englishName.lastNameEn,
            firstNameEn: englishName.firstNameEn,
            birthDate: '2000-01-01',
            examType: 'LRSW',
            hasTakenBESTEP: '否',
            hasCEFRB2: i < 10 ? '是' : '否',
            passedExamTypes: i < 10 ? ['TOEIC', 'IELTS'] : null,
            nationalId: idNumber,
            phone: `0912345${String(i).padStart(3, '0')}`,
            postalCode: '804',
            city: '高雄市',
            district: '鼓山區',
            address: '鼓山區蓮海路70號',
            degreeLevel: '大學部',
            grade: student.grade.toString(),
            college: '工學院',
            department: student.department,
            isLowIncome: '否',
            hasDisabilityCard: '否',
            agreedToTerms: true,
            infoSource: '學校公告',
            status: 'success',
            semester: SEMESTER,
            approvedAt: new Date('2025-10-01')
          },
          transaction
        });
        registrations.push(registration);
      }
    }
    console.log(`  ✅ 共建立 ${registrations.length} 筆報名記錄（${registrations.length}/${DEMO_STUDENTS.length} 位學生報名）`);

    // 4. 建立團體報名（前 12 位學生分成 3 隊）
    console.log('\n👫 建立團體報名...');
    const teams = [];
    const registeredStudents = DEMO_STUDENTS.filter((_, i) => registrations.some(r => r.studentId === DEMO_STUDENTS[i].studentId));
    const teamMembers = registeredStudents.slice(0, 12);
    
    for (let i = 0; i < 3; i++) {
      const members = teamMembers.slice(i * 4, (i + 1) * 4);
      if (members.length < 3) break; // 至少需要 3 人
      
      const representative = members[0];
      const registration = registrations.find(r => r.studentId === representative.studentId);
      
      if (!registration) continue;
      
      const [team] = await LearningPartnerTeam.findOrCreate({
        where: {
          representativeStudentId: representative.studentId,
          activeFlag: 1
        },
        defaults: {
          teamName: `隊伍${i + 1}`,
          representativeStudentId: representative.studentId,
          teamSize: members.length,
          status: 'approved',
          activeFlag: 1,
          expiresAt: new Date('2026-12-31'),
          approvedAt: new Date('2025-10-15')
        },
        transaction
      });
      
      teams.push(team);
      
      // 建立隊員
      for (let j = 0; j < members.length; j++) {
        const member = members[j];
        const memberReg = registrations.find(r => r.studentId === member.studentId);
        if (!memberReg) continue;
        
        await LearningPartnerTeamMember.findOrCreate({
          where: {
            teamId: team.id,
            studentId: member.studentId
          },
          defaults: {
            teamId: team.id,
            studentId: member.studentId,
            name: member.name,
            email: member.email,
            isRepresentative: j === 0,
            personalRegistrationId: memberReg.id,
            approvalStatus: 'approved',
            activeFlag: 1
          },
          transaction
        });
      }
      
      console.log(`  ✅ ${team.teamName}: ${members.map(m => m.name).join(', ')}`);
    }

    // 5. 建立考試場次
    console.log('\n📅 建立考試場次...');
    await BestepExamSession.findOrCreate({
      where: { semester: SEMESTER },
      defaults: {
        semester: SEMESTER,
        lrExamDate: LR_EXAM_DATE,
        swExamDate: SW_EXAM_DATE,
        description: `${SEMESTER} 學期 BESTEP 考試`
      },
      transaction
    });
    console.log(`  ✅ LR: ${LR_EXAM_DATE}, SW: ${SW_EXAM_DATE}`);

    // 6. 建立出席資料（80% 出席率）
    console.log('\n✅ 建立出席資料...');
    let lrAttended = 0;
    let swAttended = 0;
    
    for (let i = 0; i < registeredStudents.length; i++) {
      const student = registeredStudents[i];
      const lrAttend = Math.random() > 0.2; // 80% 出席
      const swAttend = Math.random() > 0.2; // 80% 出席
      
      if (lrAttend) lrAttended++;
      if (swAttend) swAttended++;
      
      await BestepAttendance.findOrCreate({
        where: {
          studentId: student.studentId,
          semester: SEMESTER,
          examType: 'LR'
        },
        defaults: {
          studentId: student.studentId,
          semester: SEMESTER,
          examType: 'LR',
          examDate: LR_EXAM_DATE,
          attended: lrAttend,
          absentReason: lrAttend ? null : '請假',
          importedAt: new Date(),
          sourceFile: 'demo-lr-attendance.xlsx'
        },
        transaction
      });
      
      await BestepAttendance.findOrCreate({
        where: {
          studentId: student.studentId,
          semester: SEMESTER,
          examType: 'SW'
        },
        defaults: {
          studentId: student.studentId,
          semester: SEMESTER,
          examType: 'SW',
          examDate: SW_EXAM_DATE,
          attended: swAttend,
          absentReason: swAttend ? null : '請假',
          importedAt: new Date(),
          sourceFile: 'demo-sw-attendance.xlsx'
        },
        transaction
      });
    }
    console.log(`  ✅ LR 出席: ${lrAttended}/${registeredStudents.length} (${(lrAttended/registeredStudents.length*100).toFixed(1)}%)`);
    console.log(`  ✅ SW 出席: ${swAttended}/${registeredStudents.length} (${(swAttended/registeredStudents.length*100).toFixed(1)}%)`);

    // 7. 建立成績資料
    console.log('\n📊 建立成績資料...');
    let passedCount = 0;
    
    for (let i = 0; i < registeredStudents.length; i++) {
      const student = registeredStudents[i];
      const studentIndex = DEMO_STUDENTS.findIndex(s => s.studentId === student.studentId);
      const scoreData = generateScore(student.studentId, studentIndex);
      
      const totalScore = scoreData.listeningScore + scoreData.readingScore + 
                        scoreData.speakingScore + scoreData.writingScore;
      
      const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const levelValues = [
        scoreData.listeningLevel,
        scoreData.readingLevel,
        scoreData.speakingLevel,
        scoreData.writingLevel
      ].map(l => levels.indexOf(l));
      const minIndex = Math.min(...levelValues);
      const overallLevel = levels[minIndex];
      
      const passed = levelValues.every(idx => idx >= levels.indexOf('B2'));
      if (passed) passedCount++;
      
      await BestepExamScore.findOrCreate({
        where: {
          studentId: student.studentId,
          semester: SEMESTER
        },
        defaults: {
          studentId: student.studentId,
          semester: SEMESTER,
          examDate: LR_EXAM_DATE,
          ...scoreData,
          totalScore: totalScore,
          overallLevel: overallLevel,
          passed: passed,
          importedAt: new Date(),
          sourceFile: 'demo-scores.xlsx'
        },
        transaction
      });
    }
    console.log(`  ✅ 達標人數: ${passedCount}/${registeredStudents.length} (${(passedCount/registeredStudents.length*100).toFixed(1)}%)`);

    // 8. 計算團體名次
    console.log('\n🏆 計算團體名次...');
    const teamScores = [];
    for (const team of teams) {
      const members = await LearningPartnerTeamMember.findAll({
        where: { teamId: team.id, activeFlag: 1 },
        transaction
      });
      
      const scores = await BestepExamScore.findAll({
        where: {
          studentId: { [Op.in]: members.map(m => m.studentId) },
          semester: SEMESTER
        },
        transaction
      });
      
      if (scores.length === members.length) {
        const totalScores = scores.map(s => parseFloat(s.totalScore));
        const avgScore = totalScores.reduce((a, b) => a + b, 0) / totalScores.length;
        teamScores.push({ teamId: team.id, avgScore });
      }
    }
    
    teamScores.sort((a, b) => b.avgScore - a.avgScore);
    
    let currentRank = 1;
    for (let i = 0; i < teamScores.length; i++) {
      if (i > 0 && Math.abs(teamScores[i].avgScore - teamScores[i - 1].avgScore) > 0.01) {
        let tiedCount = 1;
        for (let j = i - 2; j >= 0; j--) {
          if (Math.abs(teamScores[j].avgScore - teamScores[i - 1].avgScore) <= 0.01) {
            tiedCount++;
          } else {
            break;
          }
        }
        currentRank = currentRank + tiedCount;
      }
      
      const rewardAmount = currentRank === 1 ? 5000 :
                          currentRank === 2 ? 4000 :
                          currentRank === 3 ? 3000 :
                          currentRank === 4 ? 2500 :
                          currentRank === 5 ? 2000 :
                          currentRank >= 6 && currentRank <= 10 ? 1500 :
                          currentRank >= 11 && currentRank <= 20 ? 1000 : 0;
      
      await BestepTeamRanking.findOrCreate({
        where: {
          teamId: teamScores[i].teamId,
          semester: SEMESTER
        },
        defaults: {
          teamId: teamScores[i].teamId,
          semester: SEMESTER,
          avgScore: teamScores[i].avgScore,
          rank: currentRank,
          rewardAmount: rewardAmount,
          calculatedAt: new Date()
        },
        transaction
      });
      
      const team = teams.find(t => t.id === teamScores[i].teamId);
      console.log(`  ✅ ${team.teamName}: 第 ${currentRank} 名，平均分 ${teamScores[i].avgScore.toFixed(2)}，獎勵 ${rewardAmount} 元`);
    }

    // 9. 建立增能活動（每個活動類型 5 場）
    console.log('\n🎯 建立增能活動...');
    const events = [];
    for (const eventType of EVENT_TYPES) {
      for (let i = 0; i < 5; i++) {
        const eventDate = generateDateInSemester(i * 20); // 每 20 天一場
        const event = await Event.create({
          name: `${eventType} #${i + 1}`,
          date: eventDate,
          startTime: '14:00',
          endTime: '16:00',
          maxCapacity: 30,
          eventType: eventType,
          location: '文學院 3F'
        }, { transaction });
        events.push(event);
      }
    }
    console.log(`  ✅ 共建立 ${events.length} 場活動（每種類型 5 場）`);

    // 10. 建立活動參與紀錄（預約和簽到）
    console.log('\n📝 建立活動參與紀錄...');
    let totalReservations = 0;
    let totalCheckins = 0;
    
    for (const event of events) {
      // 每個活動隨機選擇 15-25 位學生參與
      const participants = DEMO_STUDENTS
        .sort(() => Math.random() - 0.5)
        .slice(0, 15 + Math.floor(Math.random() * 11));
      
      for (const student of participants) {
        // 80% 機率預約
        if (Math.random() < 0.8) {
          // 確保 User 存在
          let user = await User.findOne({
            where: { studentId: student.studentId },
            transaction
          });
          if (!user) {
            user = await User.create({
              studentId: student.studentId,
              name: student.name,
              email: student.email
            }, { transaction });
          }
          
          const reservation = await Reservation.create({
            eventId: event.id,
            userId: user.id,
            studentId: student.studentId,
            studentName: student.name,
            studentEmail: student.email,
            timestamp: new Date(event.date + 'T10:00:00'),
            checkinStatus: '未簽到',
            group: String(Math.floor(Math.random() * 9) + 1)
          }, { transaction });
          
          totalReservations++;
          
          // 70% 機率簽到
          if (Math.random() < 0.7) {
            const checkinTime = new Date(event.date + `T${event.startTime}:00`);
            checkinTime.setMinutes(checkinTime.getMinutes() + Math.floor(Math.random() * 30));
            await reservation.update({
              checkinStatus: '已簽到',
              checkinTime: checkinTime
            }, { transaction });
            totalCheckins++;
          } else if (Math.random() < 0.1) {
            // 10% 機率違規
            await reservation.update({
              checkinStatus: '已登記違規'
            }, { transaction });
          }
        }
      }
    }
    console.log(`  ✅ 共建立 ${totalReservations} 筆預約記錄`);
    console.log(`  ✅ 其中 ${totalCheckins} 筆已簽到`);

    await transaction.commit();
    console.log('\n✅ 所有測試資料生成完成！');
    
    // 11. 生成 Excel 檔案
    await generateExcelFiles(registeredStudents);
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ 生成資料失敗:', error);
    throw error;
  }
}

async function generateExcelFiles(registeredStudents) {
  console.log('\n📄 生成 Excel 檔案...');
  
  const outputDir = path.join(__dirname, '../uploads/bestep/demo');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. LR 出席資料
  const lrWorkbook = new ExcelJS.Workbook();
  const lrWorksheet = lrWorkbook.addWorksheet('LR出缺席');
  lrWorksheet.columns = [
    { header: '學號', key: 'studentId', width: 15 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '出席狀態', key: 'attended', width: 15 }
  ];
  
  const lrAttendances = await BestepAttendance.findAll({
    where: { semester: SEMESTER, examType: 'LR' }
  });
  
  for (const att of lrAttendances) {
    const student = DEMO_STUDENTS.find(s => s.studentId === att.studentId);
    lrWorksheet.addRow({
      studentId: att.studentId,
      name: student?.name || att.studentId,
      attended: att.attended ? '出席' : '缺席'
    });
  }
  
  await lrWorkbook.xlsx.writeFile(path.join(outputDir, '培力英檢LR出缺席紀錄.xlsx'));
  console.log('  ✅ 培力英檢LR出缺席紀錄.xlsx');

  // 2. SW 出席資料
  const swWorkbook = new ExcelJS.Workbook();
  const swWorksheet = swWorkbook.addWorksheet('SW出缺席');
  swWorksheet.columns = [
    { header: '學號', key: 'studentId', width: 15 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '出席狀態', key: 'attended', width: 15 }
  ];
  
  const swAttendances = await BestepAttendance.findAll({
    where: { semester: SEMESTER, examType: 'SW' }
  });
  
  for (const att of swAttendances) {
    const student = DEMO_STUDENTS.find(s => s.studentId === att.studentId);
    swWorksheet.addRow({
      studentId: att.studentId,
      name: student?.name || att.studentId,
      attended: att.attended ? '出席' : '缺席'
    });
  }
  
  await swWorkbook.xlsx.writeFile(path.join(outputDir, '培力英檢SW出缺席紀錄.xlsx'));
  console.log('  ✅ 培力英檢SW出缺席紀錄.xlsx');

  // 3. 成績資料
  const scoreWorkbook = new ExcelJS.Workbook();
  const scoreWorksheet = scoreWorkbook.addWorksheet('成績');
  scoreWorksheet.columns = [
    { header: '學號', key: 'studentId', width: 15 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '聽力分數', key: 'listeningScore', width: 12 },
    { header: '閱讀分數', key: 'readingScore', width: 12 },
    { header: '口說分數', key: 'speakingScore', width: 12 },
    { header: '寫作分數', key: 'writingScore', width: 12 },
    { header: '聽力等級', key: 'listeningLevel', width: 12 },
    { header: '閱讀等級', key: 'readingLevel', width: 12 },
    { header: '口說等級', key: 'speakingLevel', width: 12 },
    { header: '寫作等級', key: 'writingLevel', width: 12 },
    { header: '總分', key: 'totalScore', width: 12 }
  ];
  
  const scores = await BestepExamScore.findAll({
    where: { semester: SEMESTER }
  });
  
  for (const score of scores) {
    const student = DEMO_STUDENTS.find(s => s.studentId === score.studentId);
    scoreWorksheet.addRow({
      studentId: score.studentId,
      name: student?.name || score.studentId,
      listeningScore: score.listeningScore,
      readingScore: score.readingScore,
      speakingScore: score.speakingScore,
      writingScore: score.writingScore,
      listeningLevel: score.listeningLevel,
      readingLevel: score.readingLevel,
      speakingLevel: score.speakingLevel,
      writingLevel: score.writingLevel,
      totalScore: score.totalScore
    });
  }
  
  await scoreWorkbook.xlsx.writeFile(path.join(outputDir, '培力英檢成績資料.xlsx'));
  console.log('  ✅ 培力英檢成績資料.xlsx');

  // 4. 班級名單
  const classWorkbook = new ExcelJS.Workbook();
  const classWorksheet = classWorkbook.addWorksheet('班級名單');
  classWorksheet.columns = [
    { header: '學號', key: 'studentId', width: 15 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '系所', key: 'department', width: 20 },
    { header: '年級', key: 'grade', width: 10 },
    { header: 'Email', key: 'email', width: 30 }
  ];
  
  const memberships = await ClassMembership.findAll({
    where: { semester: SEMESTER }
  });
  
  for (const membership of memberships) {
    classWorksheet.addRow({
      studentId: membership.studentId,
      name: membership.studentName,
      department: membership.department,
      grade: membership.grade,
      email: membership.email
    });
  }
  
  await classWorkbook.xlsx.writeFile(path.join(outputDir, '班級修課名單.xlsx'));
  console.log('  ✅ 班級修課名單.xlsx');

  console.log(`\n📁 Excel 檔案已儲存至: ${outputDir}`);
}

// 執行
if (require.main === module) {
  generateDemoData()
    .then(() => {
      console.log('\n✅ 完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 錯誤:', error);
      process.exit(1);
    });
}

module.exports = { generateDemoData };
