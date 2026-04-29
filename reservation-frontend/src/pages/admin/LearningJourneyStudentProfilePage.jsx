import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  getLearningJourneyV3StudentProfile,
  getLearningJourneyV3StudentTrends
} from '../../services/learningJourneyV3Api';
import StudentProfileHeader from '../../components/learningJourneyV3/student/StudentProfileHeader';
import BestSkillCards from '../../components/learningJourneyV3/student/BestSkillCards';
import ExamTimeline from '../../components/learningJourneyV3/student/ExamTimeline';
import ActivityParticipationSummary from '../../components/learningJourneyV3/student/ActivityParticipationSummary';
import CourseRecordsTable from '../../components/learningJourneyV3/student/CourseRecordsTable';
import BestepRecordsTable from '../../components/learningJourneyV3/student/BestepRecordsTable';
import DataQualityBanner from '../../components/learningJourneyV3/student/DataQualityBanner';
import CefrTrendChart from '../../components/learningJourneyV3/student/CefrTrendChart';
import ActivityVsSkillPanel from '../../components/learningJourneyV3/student/ActivityVsSkillPanel';

function SectionWarning({ message }) {
  if (!message) return null;
  return (
    <div className="bg-warning-subtle border border-warning-subtle text-warning-emphasis rounded px-3 py-2 small mb-3">
      {message}
    </div>
  );
}

export default function LearningJourneyStudentProfilePage() {
  const token = localStorage.getItem('token') || '';
  const { studentId } = useParams();
  const [searchParams] = useSearchParams();
  const semesterId = (searchParams.get('semesterId') || '').trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [trendsError, setTrendsError] = useState('');

  useEffect(() => {
    const sid = String(studentId || '').trim();
    if (!sid) return;
    setLoading(true);
    setError('');
    setForbidden(false);
    setTrends(null);
    setTrendsError('');
    Promise.all([
      getLearningJourneyV3StudentProfile(token, sid, semesterId),
      getLearningJourneyV3StudentTrends(token, sid, semesterId)
    ])
      .then(([profileRes, trendsRes]) => {
        setData(profileRes || null);
        setTrends(trendsRes || null);
      })
      .catch((err) => {
        setData(null);
        setTrends(null);
        if (Number(err?.status) === 403) {
          setForbidden(true);
          setError('');
          setTrendsError('');
        } else {
          setError(err.message || '學生學習歷程載入失敗');
          setTrendsError(err.message || '趨勢資料載入失敗');
        }
      })
      .finally(() => setLoading(false));
  }, [token, studentId, semesterId]);

  const warningBySection = (section) =>
    (Array.isArray(data?.warnings) ? data.warnings : []).find((w) => w?.section === section)?.message || '';
  const allWarnings = [
    ...(Array.isArray(data?.warnings) ? data.warnings : []),
    ...(Array.isArray(trends?.warnings) ? trends.warnings : [])
  ];

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Learning Journey V3 學生學習歷程</h4>
        <Link className="btn btn-outline-primary btn-sm" to="/admin/learning-journey">
          返回學習歷程總覽
        </Link>
      </div>

      {loading ? (
        <div className="alert alert-light d-flex align-items-center gap-2">
          <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          <span>正在載入學生資料...</span>
        </div>
      ) : null}
      {forbidden ? (
        <div className="card border-warning mb-3">
          <div className="card-body">
            <div className="text-warning-emphasis mb-2">你沒有權限查看此學生的學習歷程</div>
            <Link className="btn btn-outline-primary btn-sm" to="/admin/learning-journey">
              返回學習歷程總覽
            </Link>
          </div>
        </div>
      ) : null}
      {error ? <div className="alert alert-danger">載入失敗：{error}</div> : null}

      {!loading && !forbidden && !error && !data ? <div className="alert alert-secondary">尚無資料。</div> : null}

      {!loading && !forbidden && !error && data ? (
        <>
          <DataQualityBanner warnings={allWarnings} />
          <StudentProfileHeader student={data.student} />

          <div className="card mb-3">
            <div className="card-header fw-semibold">四技能歷史最佳</div>
            <div className="card-body">
              <BestSkillCards bestSkills={data.bestSkills} />
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header fw-semibold">CEFR 成長曲線</div>
            <div className="card-body">
              {trendsError ? <div className="text-muted small">{trendsError}</div> : null}
              <CefrTrendChart trends={trends} />
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header fw-semibold">Exam Timeline</div>
            <div className="card-body">
              <ExamTimeline examAttempts={data.examAttempts} />
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header fw-semibold">活動參與統計</div>
            <div className="card-body">
              <SectionWarning message={warningBySection('activitySummary')} />
              <ActivityParticipationSummary activitySummary={data.activitySummary} />
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header fw-semibold">活動與能力對照</div>
            <div className="card-body">
              <ActivityVsSkillPanel activitySummary={data.activitySummary} bestSkills={data.bestSkills} />
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header fw-semibold">修課紀錄</div>
            <div className="card-body">
              <SectionWarning message={warningBySection('courseRecords')} />
              <CourseRecordsTable courseRecords={data.courseRecords} />
            </div>
          </div>

          <div className="card">
            <div className="card-header fw-semibold">培力英檢紀錄</div>
            <div className="card-body">
              <SectionWarning message={warningBySection('bestepRecords')} />
              <BestepRecordsTable bestepRecords={data.bestepRecords} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
