// components/admin/home/EventReportTable.js
// 活動報表區塊：學期/活動類型篩選、匯出總覽、報表表格與操作鈕。由 AdminHome 傳入資料與 handlers。

import React from 'react';
import { getSemesterOptions, getEventTypeOptions } from '../../../utils/adminReportUtils';
import ErrorAlert from '../shared/ErrorAlert';

/**
 * @param {Object} props
 * @param {Array} props.summary - 活動報表資料
 * @param {boolean} props.loading
 * @param {string} props.error
 * @param {string} props.selectedSemester
 * @param {string} props.selectedEventType
 * @param {boolean} props.hasAdminRights
 * @param {boolean} props.isTeacher
 * @param {string} props.userRole
 * @param {(s: string) => void} props.onSemesterChange
 * @param {(s: string) => void} props.onEventTypeChange
 * @param {() => void} props.onExportAll
 * @param {(eventId: number|string) => void} props.onExport
 * @param {(eventId: number|string, name: string, eventType: string, startTime: string) => void} props.onViewReservations
 * @param {(evt: Object) => void} props.onEditEvent
 * @param {(eventId: number|string, eventName: string) => void} props.onDeleteEvent
 * @param {(dateStr: string) => boolean} props.isEventToday
 */
export default function EventReportTable({
  summary = [],
  loading,
  error,
  selectedSemester,
  selectedEventType,
  hasAdminRights,
  isTeacher,
  userRole,
  onSemesterChange,
  onEventTypeChange,
  onExportAll,
  onExport,
  onViewReservations,
  onEditEvent,
  onDeleteEvent,
  isEventToday
}) {
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">活動報表</h4>
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0">學期篩選：</label>
            <select
              className="form-select"
              value={selectedSemester}
              onChange={(e) => onSemesterChange(e.target.value)}
              style={{ minWidth: '250px' }}
            >
              {getSemesterOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0">活動類別：</label>
            <select
              className="form-select"
              value={selectedEventType}
              onChange={(e) => onEventTypeChange(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              {getEventTypeOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {hasAdminRights && (
            <button className="btn btn-outline-primary" onClick={onExportAll}>
              匯出總覽報表
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>載入中...</p>
      ) : error ? (
        <ErrorAlert error={error} />
      ) : !Array.isArray(summary) || summary.length === 0 ? (
        <p>尚無活動資料</p>
      ) : (
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>活動名稱</th>
              <th>活動類型</th>
              <th>日期</th>
              <th>時間</th>
              <th>預約人數</th>
              <th>剩餘名額</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((evt) => {
              const eventStyle = isEventToday(evt.date) ? { backgroundColor: '#fff3cd' } : {};
              return (
                <tr key={evt.eventId}>
                  <td style={eventStyle}>{evt.name}</td>
                  <td style={eventStyle}>{evt.eventType}</td>
                  <td style={eventStyle}>{evt.date}</td>
                  <td style={eventStyle}>{evt.startTime} - {evt.endTime}</td>
                  <td style={eventStyle}>{evt.reservedCount}</td>
                  <td style={eventStyle}>{evt.availableSpots}</td>
                  <td>
                    {userRole === 'worker' ? (
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => onViewReservations(evt.eventId, evt.name, evt.eventType, evt.startTime)}
                      >
                        查看預約
                      </button>
                    ) : isTeacher ? (
                      <>
                        <button className="btn btn-sm btn-outline-info me-1" onClick={() => onExport(evt.eventId)}>匯出</button>
                        <button className="btn btn-sm btn-outline-success me-1" onClick={() => onViewReservations(evt.eventId, evt.name, evt.eventType, evt.startTime)}>查看預約</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-outline-info me-1" onClick={() => onExport(evt.eventId)}>匯出</button>
                        <button className="btn btn-sm btn-outline-success me-1" onClick={() => onViewReservations(evt.eventId, evt.name, evt.eventType, evt.startTime)}>查看預約</button>
                        <button className="btn btn-sm btn-outline-warning me-1" onClick={() => onEditEvent(evt)}>修改</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => onDeleteEvent(evt.eventId, evt.name)}>刪除</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
