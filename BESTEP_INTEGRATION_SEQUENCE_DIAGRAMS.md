# BESTEP 整合流程圖（Sequence Diagrams）

## 1. 班級 BESTEP 概況查詢流程

```mermaid
sequenceDiagram
    participant Frontend as 前端 (ClassOverview)
    participant API as API Router
    participant Controller as BestepClassController
    participant Service as BestepClassService
    participant DB as 資料庫

    Frontend->>API: GET /api/admin/classes/:classId/bestep-overview?semester=114-1&examSessionId=...
    API->>Controller: getBestepOverview(req, res)
    Controller->>Service: getClassBestepOverview(classId, semester, examSessionId)
    
    Service->>DB: SELECT * FROM classes WHERE id = classId
    DB-->>Service: classInfo
    
    Service->>DB: SELECT * FROM class_memberships WHERE classId = classId AND semester = semester
    DB-->>Service: students[]
    
    loop For each student
        Service->>DB: SELECT * FROM english_test_registrations WHERE studentId = studentId
        DB-->>Service: personalRegistration
        
        Service->>DB: SELECT t.*, m.* FROM learning_partner_team_members m<br/>JOIN learning_partner_teams t ON m.teamId = t.id<br/>WHERE m.studentId = studentId AND m.activeFlag = 1
        DB-->>Service: groupRegistration
        
        alt If examSessionId provided
            Service->>DB: SELECT * FROM bestep_attendance<br/>WHERE studentId = studentId AND examSessionId = examSessionId
            DB-->>Service: attendance
            
            Service->>DB: SELECT * FROM bestep_exam_scores<br/>WHERE studentId = studentId AND examSessionId = examSessionId
            DB-->>Service: score
        end
    end
    
    Service->>Service: Calculate statistics<br/>(registrationRate, attendanceRate, passRate, avgScore)
    Service-->>Controller: { classInfo, statistics, students[], pagination }
    Controller-->>API: JSON response
    API-->>Frontend: Response
    Frontend->>Frontend: Render table & charts
```

---

## 2. 出席資料匯入流程

```mermaid
sequenceDiagram
    participant Admin as 管理員
    participant Frontend as 前端 (ImportPage)
    participant API as API Router
    participant Controller as BestepImportController
    participant Service as BestepImportService
    participant Parser as ExcelParser
    participant DB as 資料庫
    participant FileSystem as 檔案系統

    Admin->>Frontend: 選擇 Excel 檔案<br/>填寫 examSessionId, examDate, examType
    Frontend->>API: POST /api/admin/bestep/attendance/import<br/>(multipart/form-data)
    API->>Controller: importAttendance(req, res)
    
    Controller->>Parser: parseExcel(file)
    Parser->>Parser: 讀取 Excel 內容<br/>驗證欄位格式
    Parser-->>Controller: rows[]
    
    Controller->>Service: importAttendanceData(rows, examSessionId, examDate, examType)
    
    loop For each row
        Service->>DB: SELECT * FROM english_test_registrations<br/>WHERE studentId = row.studentId
        alt Registration not found
            Service->>Service: Add to errors[]
            Service->>Service: skipped++
        else Registration found
            Service->>DB: SELECT * FROM bestep_attendance<br/>WHERE studentId = row.studentId<br/>AND examSessionId = examSessionId
            alt Already exists
                Service->>DB: UPDATE bestep_attendance<br/>SET attended = row.attended,<br/>absentReason = row.absentReason<br/>WHERE studentId = row.studentId<br/>AND examSessionId = examSessionId
                Service->>Service: skipped++
            else New record
                Service->>DB: INSERT INTO bestep_attendance<br/>(studentId, examSessionId, examDate, examType,<br/>attended, absentReason, importedAt, sourceFile)
                Service->>Service: imported++
            end
        end
    end
    
    alt If errors.length > 0
        Service->>FileSystem: Generate error report Excel
        FileSystem-->>Service: errorFileUrl
    end
    
    Service-->>Controller: { imported, skipped, errors[], errorFileUrl }
    Controller-->>API: JSON response
    API-->>Frontend: Response
    Frontend->>Admin: 顯示匯入結果<br/>提供錯誤報表下載連結
```

---

## 3. 成績資料匯入流程

```mermaid
sequenceDiagram
    participant Admin as 管理員
    participant Frontend as 前端 (ImportPage)
    participant API as API Router
    participant Controller as BestepImportController
    participant Service as BestepImportService
    participant Parser as ExcelParser
    participant DB as 資料庫
    participant FileSystem as 檔案系統

    Admin->>Frontend: 選擇 Excel 檔案<br/>填寫 examSessionId, examDate, examType
    Frontend->>API: POST /api/admin/bestep/scores/import<br/>(multipart/form-data)
    API->>Controller: importScores(req, res)
    
    Controller->>Parser: parseExcel(file, examType)
    Parser->>Parser: 讀取 Excel 內容<br/>根據 examType 驗證欄位<br/>(LRSW: 4科, LR: 2科, SW: 2科)
    Parser-->>Controller: rows[]
    
    Controller->>Service: importScoreData(rows, examSessionId, examDate, examType)
    
    loop For each row
        Service->>DB: SELECT * FROM english_test_registrations<br/>WHERE studentId = row.studentId
        alt Registration not found
            Service->>Service: Add to errors[]
            Service->>Service: skipped++
        else Registration found
            Service->>DB: SELECT * FROM bestep_exam_scores<br/>WHERE studentId = row.studentId<br/>AND examSessionId = examSessionId
            alt Already exists
                Service->>Service: Calculate totalScore/lrScore/swScore<br/>based on examType
                Service->>DB: UPDATE bestep_exam_scores<br/>SET listeningScore = row.listeningScore,<br/>readingScore = row.readingScore,<br/>speakingScore = row.speakingScore,<br/>writingScore = row.writingScore,<br/>totalScore = calculatedTotal,<br/>level = row.level<br/>WHERE studentId = row.studentId<br/>AND examSessionId = examSessionId
                Service->>Service: skipped++
            else New record
                Service->>Service: Calculate totalScore/lrScore/swScore<br/>based on examType
                Service->>DB: INSERT INTO bestep_exam_scores<br/>(studentId, examSessionId, examDate, examType,<br/>listeningScore, readingScore, speakingScore, writingScore,<br/>totalScore, lrScore, swScore, level, importedAt, sourceFile)
                Service->>Service: imported++
            end
        end
    end
    
    alt If errors.length > 0
        Service->>FileSystem: Generate error report Excel
        FileSystem-->>Service: errorFileUrl
    end
    
    Service-->>Controller: { imported, skipped, errors[], errorFileUrl }
    Controller-->>API: JSON response
    API-->>Frontend: Response
    Frontend->>Admin: 顯示匯入結果<br/>提供錯誤報表下載連結
```

---

## 4. 團體名次計算流程

```mermaid
sequenceDiagram
    participant Admin as 管理員
    participant Frontend as 前端 (RankingPage)
    participant API as API Router
    participant Controller as BestepRankingController
    participant Service as BestepRankingService
    participant DB as 資料庫

    Admin->>Frontend: 選擇 examSessionId, rankingRule<br/>點擊「計算名次」
    Frontend->>API: POST /api/admin/bestep/teams/calculate-ranking<br/>{ examSessionId, rankingRule }
    API->>Controller: calculateRanking(req, res)
    
    Controller->>Service: calculateTeamRanking(examSessionId, rankingRule)
    
    Service->>DB: SELECT * FROM learning_partner_teams<br/>WHERE status = 'approved'<br/>AND activeFlag = 1
    DB-->>Service: teams[]
    
    loop For each team
        Service->>DB: SELECT m.studentId, s.*<br/>FROM learning_partner_team_members m<br/>JOIN bestep_exam_scores s ON m.studentId = s.studentId<br/>WHERE m.teamId = team.id<br/>AND m.activeFlag = 1<br/>AND s.examSessionId = examSessionId
        DB-->>Service: membersWithScores[]
        
        alt rankingRule = 'total_score'
            Service->>Service: Calculate teamTotalScore = SUM(members.totalScore)
            Service->>Service: Calculate teamAvgScore = AVG(members.totalScore)
        else rankingRule = 'avg_score'
            Service->>Service: Calculate teamAvgScore = AVG(members.totalScore)
        else rankingRule = 'passed_count'
            Service->>Service: Calculate passedCount = COUNT(members WHERE totalScore >= threshold)
            Service->>Service: Calculate teamAvgScore = AVG(members.totalScore)
        end
        
        Service->>Service: Store teamMetrics{ teamId, totalScore, avgScore, passedCount }
    end
    
    Service->>Service: Sort teams by rankingRule<br/>(with tie-breaker)
    Service->>Service: Assign rank (1, 2, 3, ...)
    
    loop For each team
        Service->>DB: INSERT INTO bestep_team_rankings<br/>(teamId, examSessionId, rankingRule,<br/>totalScore, avgScore, passedCount, rank, calculatedAt)<br/>ON DUPLICATE KEY UPDATE<br/>totalScore = VALUES(totalScore),<br/>avgScore = VALUES(avgScore),<br/>passedCount = VALUES(passedCount),<br/>rank = VALUES(rank),<br/>calculatedAt = VALUES(calculatedAt)
    end
    
    Service-->>Controller: { examSessionId, rankingRule, teams[], calculatedAt }
    Controller-->>API: JSON response
    API-->>Frontend: Response
    Frontend->>Admin: 顯示名次列表<br/>提供匯出功能
```

---

## 5. 查詢團體名次流程

```mermaid
sequenceDiagram
    participant Frontend as 前端 (ClassDetail)
    participant API as API Router
    participant Controller as BestepRankingController
    participant Service as BestepRankingService
    participant DB as 資料庫

    Frontend->>API: GET /api/admin/bestep/teams/ranking?examSessionId=...
    API->>Controller: getRanking(req, res)
    
    Controller->>Service: getTeamRanking(examSessionId)
    
    Service->>DB: SELECT r.*, t.teamName, t.representativeStudentId<br/>FROM bestep_team_rankings r<br/>JOIN learning_partner_teams t ON r.teamId = t.id<br/>WHERE r.examSessionId = examSessionId<br/>ORDER BY r.rank ASC
    DB-->>Service: rankings[]
    
    loop For each ranking
        Service->>DB: SELECT m.*, s.totalScore<br/>FROM learning_partner_team_members m<br/>LEFT JOIN bestep_exam_scores s ON m.studentId = s.studentId<br/>AND s.examSessionId = examSessionId<br/>WHERE m.teamId = ranking.teamId<br/>AND m.activeFlag = 1
        DB-->>Service: members[]
        Service->>Service: Attach members to ranking
    end
    
    Service-->>Controller: { examSessionId, rankingRule, teams[], calculatedAt }
    Controller-->>API: JSON response
    API-->>Frontend: Response
    Frontend->>Frontend: Display ranking table
```

---

## 6. 班級明細頁面資料載入流程（整合版）

```mermaid
sequenceDiagram
    participant Teacher as 老師
    participant Frontend as 前端 (ClassDetail)
    participant API as API Router
    participant Controller as BestepClassController
    participant Service as BestepClassService
    participant DB as 資料庫

    Teacher->>Frontend: 選擇班級、學期、examSessionId<br/>點擊「查看明細」
    Frontend->>API: GET /api/admin/classes/:classId/bestep-overview<br/>?semester=114-1&examSessionId=...&page=1&pageSize=50
    API->>Controller: getBestepOverview(req, res)
    
    Controller->>Service: getClassBestepOverview(classId, semester, examSessionId, filters)
    
    Note over Service: Step 1: 取得班級資訊
    Service->>DB: SELECT * FROM classes WHERE id = classId
    DB-->>Service: classInfo
    
    Note over Service: Step 2: 取得班級學生列表
    Service->>DB: SELECT * FROM class_memberships<br/>WHERE classId = classId AND semester = semester<br/>LIMIT pageSize OFFSET (page-1)*pageSize
    DB-->>Service: students[]
    
    Note over Service: Step 3: 批次查詢個人報名狀態
    Service->>DB: SELECT * FROM english_test_registrations<br/>WHERE studentId IN (studentIds)
    DB-->>Service: registrationsMap{ studentId: registration }
    
    Note over Service: Step 4: 批次查詢團體報名資訊
    Service->>DB: SELECT m.studentId, m.teamId, m.isRepresentative,<br/>t.teamName, t.status as teamStatus,<br/>r.rank<br/>FROM learning_partner_team_members m<br/>JOIN learning_partner_teams t ON m.teamId = t.id<br/>LEFT JOIN bestep_team_rankings r ON m.teamId = r.teamId<br/>AND r.examSessionId = examSessionId<br/>WHERE m.studentId IN (studentIds)<br/>AND m.activeFlag = 1
    DB-->>Service: groupRegistrationsMap{ studentId: groupInfo }
    
    alt If examSessionId provided
        Note over Service: Step 5: 批次查詢出席狀況
        Service->>DB: SELECT * FROM bestep_attendance<br/>WHERE studentId IN (studentIds)<br/>AND examSessionId = examSessionId
        DB-->>Service: attendanceMap{ studentId: attendance }
        
        Note over Service: Step 6: 批次查詢成績
        Service->>DB: SELECT * FROM bestep_exam_scores<br/>WHERE studentId IN (studentIds)<br/>AND examSessionId = examSessionId
        DB-->>Service: scoresMap{ studentId: score }
    end
    
    Note over Service: Step 7: 組合資料
    loop For each student
        Service->>Service: student.personalRegistration = registrationsMap[studentId]
        Service->>Service: student.groupRegistration = groupRegistrationsMap[studentId]
        Service->>Service: student.attendance = attendanceMap[studentId]
        Service->>Service: student.score = scoresMap[studentId]
    end
    
    Note over Service: Step 8: 計算統計
    Service->>Service: Calculate statistics:<br/>- registrationRate = registeredCount / totalStudents<br/>- attendanceRate = attendedCount / registeredCount<br/>- passRate = passedCount / attendedCount<br/>- avgScore = AVG(scores.totalScore)
    
    Service-->>Controller: { classInfo, statistics, students[], pagination }
    Controller-->>API: JSON response
    API-->>Frontend: Response
    Frontend->>Frontend: Render table with columns:<br/>學號 | 姓名 | 個人報名 | 團體報名 | 出席 | 成績 | 等級
    Frontend->>Teacher: Display class detail page
```

---

## 7. 錯誤處理流程（匯入時）

```mermaid
sequenceDiagram
    participant Admin as 管理員
    participant Frontend as 前端
    participant API as API Router
    participant Service as BestepImportService
    participant DB as 資料庫
    participant FileSystem as 檔案系統

    Admin->>Frontend: 上傳 Excel 檔案
    Frontend->>API: POST /api/admin/bestep/attendance/import
    API->>Service: importAttendanceData(rows, examSessionId, ...)
    
    loop For each row
        alt Row validation failed
            Service->>Service: errors.push({ row, error: '欄位格式錯誤' })
            Service->>Service: skipped++
        else StudentId not found
            Service->>DB: SELECT * FROM english_test_registrations WHERE studentId = row.studentId
            DB-->>Service: null
            Service->>Service: errors.push({ row, studentId, error: '找不到報名記錄' })
            Service->>Service: skipped++
        else Database error
            Service->>DB: INSERT INTO bestep_attendance ...
            DB-->>Service: Error (e.g., duplicate key)
            Service->>Service: errors.push({ row, error: '資料庫錯誤: ' + error.message })
            Service->>Service: skipped++
        else Success
            Service->>DB: INSERT INTO bestep_attendance ...
            DB-->>Service: Success
            Service->>Service: imported++
        end
    end
    
    alt If errors.length > 0
        Service->>FileSystem: Generate error report Excel<br/>(包含原始資料 + 錯誤欄位)
        FileSystem-->>Service: errorFileUrl
    end
    
    Service-->>API: { imported, skipped, errors[], errorFileUrl }
    API-->>Frontend: Response
    
    alt If errors.length > 0
        Frontend->>Admin: 顯示警告訊息<br/>「匯入完成，但有 X 筆錯誤」<br/>提供錯誤報表下載連結
    else All success
        Frontend->>Admin: 顯示成功訊息<br/>「成功匯入 X 筆資料」
    end
```

---

## 8. 權限檢查流程

```mermaid
sequenceDiagram
    participant User as 使用者
    participant Frontend as 前端
    participant API as API Router
    participant AuthMiddleware as AuthMiddleware
    participant RoleMiddleware as RoleMiddleware
    participant Controller as Controller

    User->>Frontend: 登入系統
    Frontend->>Frontend: Store JWT token
    
    User->>Frontend: 訪問班級 BESTEP 概況頁面
    Frontend->>API: GET /api/admin/classes/:classId/bestep-overview<br/>Authorization: Bearer <token>
    
    API->>AuthMiddleware: Verify token
    alt Token invalid
        AuthMiddleware-->>API: 401 Unauthorized
        API-->>Frontend: Error response
        Frontend->>User: 顯示「請重新登入」
    else Token valid
        AuthMiddleware->>AuthMiddleware: Decode token<br/>Extract userRole, userId
        AuthMiddleware-->>API: req.user = { userId, userRole }
        
        API->>RoleMiddleware: Check teacherMiddleware
        alt userRole = 'admin'
            RoleMiddleware-->>API: Pass (admin can access all)
            API->>Controller: getBestepOverview(req, res)
        else userRole = 'teacher'
            RoleMiddleware->>RoleMiddleware: Check if teacher owns this class
            RoleMiddleware->>DB: SELECT * FROM class_teachers<br/>WHERE classId = classId AND teacherId = userId
            alt Teacher owns class
                RoleMiddleware-->>API: Pass
                API->>Controller: getBestepOverview(req, res)
            else Teacher doesn't own class
                RoleMiddleware-->>API: 403 Forbidden
                API-->>Frontend: Error response
                Frontend->>User: 顯示「無權限訪問此班級」
            end
        else userRole = 'worker'
            RoleMiddleware-->>API: 403 Forbidden
            API-->>Frontend: Error response
            Frontend->>User: 顯示「無權限」
        end
    end
```

---

**文件完成時間**: 2025-02-03
**文件版本**: v1.0
