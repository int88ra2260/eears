import React from 'react';
import { Table } from 'react-bootstrap';
import { formatCount, formatPercent } from './formatters';

function Cell({ value }) {
  if (!value) return <span>-</span>;
  return (
    <div className="grade-skill-cell">
      <div className="grade-skill-cell__count">{formatCount(value.passed)} 人</div>
      <div className="grade-skill-cell__pct">{formatPercent(value.percentage)}</div>
    </div>
  );
}

export default function GradeSkillStatsTable({ rows = [], loading = false }) {
  return (
    <div className="grade-skill-table-wrap">
      <Table className="grade-skill-table" hover responsive>
        <thead>
          <tr>
            <th>年級</th>
            <th>該年級本國生總數</th>
            <th>聽力 (&gt;=B2)</th>
            <th>閱讀 (&gt;=B2)</th>
            <th>口說 (&gt;=B2)</th>
            <th>寫作 (&gt;=B2)</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <tr key={`s-${idx}`}>
                  {Array.from({ length: 6 }).map((__, cidx) => (
                    <td key={`c-${cidx}`}>
                      <div className="skeleton skeleton-line" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr key={row.gradeRaw || row.gradeLabel}>
                  <td>{row.gradeLabel}</td>
                  <td>{formatCount(row.totalStudents)} 人</td>
                  <td><Cell value={row.listening} /></td>
                  <td><Cell value={row.reading} /></td>
                  <td><Cell value={row.speaking} /></td>
                  <td><Cell value={row.writing} /></td>
                </tr>
              ))}
        </tbody>
      </Table>
    </div>
  );
}

