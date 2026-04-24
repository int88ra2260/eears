# 培力英檢報名完成 EMAIL 通知模板

## 郵件主旨
```
[培力英檢] 報名完成確認通知 / BESTEP Registration Confirmation
```

## 郵件內容（繁體中文 + 英文）

---

親愛的 ${studentName} (${studentId}) 您好，

感謝您完成 BESTEP 培力英檢報名！

【報名資料確認】

報名編號：${registrationId}
報名日期：${registrationDate}
報名狀態：${statusText}

基本資料：
• 姓名：${studentNameZh}
• 學號：${studentId}
• 身分證字號：${idNumber}
• 電子郵件：${email}
• 聯絡電話：${phone}

報考資訊：
• 報考項目：${examTypeText}
${hasCEFRB2 === '是' ? `• 是否曾取得 CEFR B2 以上成績：是` : `• 是否曾取得 CEFR B2 以上成績：否`}
${hasCEFRB2 === '是' && listeningExamType ? `• 聽力成績：${listeningScore} (${listeningExamType})` : ''}
${hasCEFRB2 === '是' && readingExamType ? `• 閱讀成績：${readingScore} (${readingExamType})` : ''}
${hasCEFRB2 === '是' && speakingExamType ? `• 口說成績：${speakingScore} (${speakingExamType})` : ''}
${hasCEFRB2 === '是' && writingExamType ? `• 寫作成績：${writingScore} (${writingExamType})` : ''}

${examType === 'NON' ? `
【重要提醒】
您已選擇不報考培力英檢。此報名記錄已歸類為「不報名」狀態。
` : `
【後續流程】

1. 審核階段：
   您的報名資料將由審核人員進行審核，審核結果將透過 Email 通知您。

2. 審核狀態：
   • 待審核：您的報名資料正在審核中
   • 已通過：您的報名已通過審核，請等待後續考試通知
   • 已拒絕：您的報名未通過審核，如有疑問請聯繫我們

3. 修改報名資料：
   如需修改報名資料，請使用「查看與編輯」功能，輸入您的學號、姓名和身分證字號進行修改。

4. 考試通知：
   考試相關資訊（時間、地點、注意事項等）將於審核通過後另行通知。
`}

【聯絡資訊】

如有任何問題，請聯繫：
全英語卓越教學中心 (Center for EMI Teaching Excellence)
📧 Email：emicenter@mail.nsysu.edu.tw
📞 電話：(07) 525-2000 分機 5808

感謝您的報名，祝您考試順利！

全英語卓越教學中心 敬上

---

Dear ${studentName} (${studentId}),

Thank you for completing your BESTEP English Test registration!

[Registration Confirmation]

Registration ID: ${registrationId}
Registration Date: ${registrationDate}
Status: ${statusTextEn}

Personal Information:
• Name: ${studentNameZh}
• Student ID: ${studentId}
• National ID: ${idNumber}
• Email: ${email}
• Phone: ${phone}

Exam Information:
• Exam Type: ${examTypeTextEn}
${hasCEFRB2 === '是' ? `• Have CEFR B2 or above: Yes` : `• Have CEFR B2 or above: No`}
${hasCEFRB2 === '是' && listeningExamType ? `• Listening Score: ${listeningScore} (${listeningExamType})` : ''}
${hasCEFRB2 === '是' && readingExamType ? `• Reading Score: ${readingScore} (${readingExamType})` : ''}
${hasCEFRB2 === '是' && speakingExamType ? `• Speaking Score: ${speakingScore} (${speakingExamType})` : ''}
${hasCEFRB2 === '是' && writingExamType ? `• Writing Score: ${writingScore} (${writingExamType})` : ''}

${examType === 'NON' ? `
[Important Notice]
You have chosen not to take the BESTEP English Test. This registration has been classified as "Not Taking Exam".
` : `
[Next Steps]

1. Review Process:
   Your registration will be reviewed by our staff. You will be notified of the review result via email.

2. Review Status:
   • Pending: Your registration is under review
   • Approved: Your registration has been approved. Please wait for further exam notifications.
   • Rejected: Your registration was not approved. Please contact us if you have any questions.

3. Modify Registration:
   If you need to modify your registration, please use the "View and Edit" function and enter your Student ID, Name, and National ID.

4. Exam Notification:
   Exam-related information (time, location, instructions, etc.) will be notified separately after approval.
`}

[Contact Information]

If you have any questions, please contact:
Center for EMI Teaching Excellence
📧 Email: emicenter@mail.nsysu.edu.tw
📞 Phone: (07) 525-2000 ext. 5808

Thank you for your registration. We wish you success in your exam!

Best regards,
Center for EMI Teaching Excellence

---

## 變數說明

- `${studentName}`: 學生姓名（英文）
- `${studentId}`: 學號
- `${registrationId}`: 報名編號（資料庫 ID）
- `${registrationDate}`: 報名日期（格式：YYYY-MM-DD HH:mm）
- `${statusText}`: 報名狀態（中文：待審核/已通過/已拒絕/不報名）
- `${statusTextEn}`: 報名狀態（英文：Pending/Approved/Rejected/Not Taking Exam）
- `${studentNameZh}`: 中文姓名
- `${idNumber}`: 身分證字號（部分遮罩）
- `${email}`: 電子郵件
- `${phone}`: 聯絡電話
- `${examType}`: 報考項目代碼（LRSW/LS/RW/NON）
- `${examTypeText}`: 報考項目（中文：聽說讀寫/聽說/讀寫/不報考）
- `${examTypeTextEn}`: 報考項目（英文：Listening, Reading, Speaking, Writing / Listening, Speaking / Reading, Writing / Not Taking Exam）
- `${hasCEFRB2}`: 是否曾取得 CEFR B2（是/否）
- `${listeningExamType}`: 聽力測驗類別
- `${listeningScore}`: 聽力成績
- `${readingExamType}`: 閱讀測驗類別
- `${readingScore}`: 閱讀成績
- `${speakingExamType}`: 口說測驗類別
- `${speakingScore}`: 口說成績
- `${writingExamType}`: 寫作測驗類別
- `${writingScore}`: 寫作成績

## 設計特點

1. **雙語設計**：提供繁體中文和英文版本
2. **資訊完整**：包含報名資料摘要和後續流程說明
3. **狀態區分**：根據報考類型（不報考 vs 正常報考）顯示不同內容
4. **聯絡資訊**：提供完整的聯絡方式
5. **專業格式**：遵循現有郵件模板的格式風格
