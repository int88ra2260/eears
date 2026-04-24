import React from 'react';
import { Alert, Button } from 'react-bootstrap';
import SectionCard from './SectionCard';
import StatsInfoBanner from './StatsInfoBanner';
import SkillRateGroup from './SkillRateGroup';
import DashboardSectionTitle from './DashboardSectionTitle';
import GradeSkillStatsTable from './GradeSkillStatsTable';
import { buildDashboardData, SKILLS, SKILL_LABELS } from './formatters';

function LoadingBlock() {
  const loadingGroup = {
    title: '資料載入中',
    theme: 'purple',
    items: SKILLS.map((skill) => ({
      skill,
      label: SKILL_LABELS[skill],
      percentage: 0,
      passed: 0,
      total: 0
    }))
  };

  return (
    <>
      <SectionCard>
        <div className="tracking-info-banner">
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line skeleton-line--short" />
        </div>
      </SectionCard>
      <SectionCard>
        <SkillRateGroup group={loadingGroup} loading />
      </SectionCard>
      <SectionCard>
        <DashboardSectionTitle title="各年級四項技能達 B2(含)以上人數與比例" />
        <GradeSkillStatsTable rows={[]} loading />
      </SectionCard>
    </>
  );
}

export default function SemesterReportDashboard({
  attainmentReport,
  countReport,
  loading,
  error,
  onReload
}) {
  if (loading) return <LoadingBlock />;

  if (error) {
    return (
      <SectionCard>
        <Alert variant="danger" className="mb-0">
          <div className="fw-semibold mb-2">載入學期報表失敗</div>
          <div className="small mb-2">{error}</div>
          <Button variant="outline-danger" size="sm" onClick={onReload}>
            重新整理
          </Button>
        </Alert>
      </SectionCard>
    );
  }

  const dashboard = buildDashboardData(attainmentReport, countReport);
  const summarySource = attainmentReport || countReport || {};
  const summaryCounts = {
    rosterActiveStudentCount: summarySource.rosterActiveStudentCount ?? 0,
    validBestScoreStudentCount: summarySource.validBestScoreStudentCount ?? 0,
    attainedStudentCount: summarySource.attainedStudentCount ?? 0
  };

  if (!dashboard.gradeRows.length) {
    return (
      <>
        <SectionCard>
          <StatsInfoBanner
            rosterActiveStudentCount={summaryCounts.rosterActiveStudentCount}
            validBestScoreStudentCount={summaryCounts.validBestScoreStudentCount}
            attainedStudentCount={summaryCounts.attainedStudentCount}
            filterDescription={dashboard.filterDescription}
          />
        </SectionCard>
        <SectionCard>
          <Alert variant="secondary" className="mb-0">
            目前查無符合條件的統計資料
          </Alert>
        </SectionCard>
      </>
    );
  }

  return (
    <>
      <SectionCard>
        <StatsInfoBanner
          rosterActiveStudentCount={summaryCounts.rosterActiveStudentCount}
          validBestScoreStudentCount={summaryCounts.validBestScoreStudentCount}
          attainedStudentCount={summaryCounts.attainedStudentCount}
          filterDescription={dashboard.filterDescription}
        />
      </SectionCard>

      {dashboard.summaryGroups.map((group) => (
        <SectionCard key={group.title}>
          <SkillRateGroup group={group} />
        </SectionCard>
      ))}

      <SectionCard>
        <DashboardSectionTitle title="各年級四項技能達 B2(含)以上人數與比例" />
        <GradeSkillStatsTable rows={dashboard.gradeRows} />
      </SectionCard>
    </>
  );
}

