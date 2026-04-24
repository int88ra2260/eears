import React from 'react';
import DashboardSectionTitle from './DashboardSectionTitle';
import SkillRateCard from './SkillRateCard';

export default function SkillRateGroup({ group, loading = false }) {
  return (
    <div className="skill-rate-group">
      <DashboardSectionTitle title={group.title} accent={group.theme} />
      <div className="skill-rate-group__grid">
        {(group.items || []).map((item) => (
          <SkillRateCard key={item.skill} item={item} theme={group.theme} loading={loading} />
        ))}
      </div>
    </div>
  );
}

