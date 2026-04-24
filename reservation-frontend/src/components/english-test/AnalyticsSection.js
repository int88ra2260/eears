// 數據分析區塊：Q21 從何得知培力英檢（圖表、空狀態、匯出）
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#0dcaf0', '#fd7e14'];

export default function AnalyticsSection({ loading, data, total, onExport }) {
  const chartData = (data || []).map((row, i) => ({
    name: (row.label || '').slice(0, 12) + ((row.label || '').length > 12 ? '…' : ''),
    fullName: row.label || '',
    count: row.count ?? 0,
    fill: COLORS[i % COLORS.length]
  }));

  const handleExportCSV = () => {
    if (!data || data.length === 0) return;
    const header = '選項,人數,占比%\n';
    const rows = data.map(row => {
      const pct = total ? ((row.count / total) * 100).toFixed(1) : '0';
      return `"${(row.label || '').replace(/"/g, '""')}",${row.count ?? 0},${pct}`;
    }).join('\n');
    const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `培力英檢_Q21從何得知_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="card mb-4">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status" aria-label="載入中">
            <span className="visually-hidden">載入中...</span>
          </div>
          <p className="mt-2 text-muted small">載入統計資料中...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card mb-4 border-light">
        <div className="card-body text-center py-5">
          <i className="fas fa-chart-pie fa-3x text-muted mb-3" aria-hidden />
          <p className="text-muted mb-0">尚無 Q21 統計資料</p>
          <p className="small text-muted">待有報名資料後會顯示「從何得知培力英檢」統計</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h5 className="mb-0">報名表單 Q21：從何得知培力英檢</h5>
        <button type="button" className="btn btn-sm btn-outline-success" onClick={handleExportCSV}>
          <i className="fas fa-file-csv me-1" /> 匯出 CSV
        </button>
      </div>
      <div className="card-body">
        <p className="text-muted small">統計各選項的人數與占比。總計：{total} 筆</p>
        <div className="mb-4" style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 60 }}>
              <XAxis dataKey="name" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip
                formatter={(value) => [value, '人數']}
                labelFormatter={(label, payload) => (payload && payload[0] && payload[0].payload && payload[0].payload.fullName) || label}
              />
              <Bar dataKey="count" name="人數" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="table-responsive">
          <table className="table table-bordered table-sm">
            <thead>
              <tr>
                <th>選項</th>
                <th>人數</th>
                <th>占比</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td>{row.label || ''}</td>
                  <td>{row.count ?? 0}</td>
                  <td>{total ? ((row.count / total) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
