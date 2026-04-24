// components/admin/home/AddEventForm.js
// 新增單筆活動表單。由 AdminHome 傳入 fields、handlers、error，送出行為與驗證保留在 parent。

import React from 'react';
import ErrorAlert from '../shared/ErrorAlert';

/**
 * @param {Object} props
 * @param {Object} props.fields - { name, eventType, date, startTime, endTime, maxParticipants, customEventType, customReservationRule }
 * @param {(next: Object) => void} props.onFieldsChange
 * @param {boolean} props.loading
 * @param {string} props.error
 * @param {(e: React.FormEvent) => void} props.onSubmit
 * @param {() => void} props.onOpenBatchAdd - 開啟批量新增 Modal（parent 負責 setBatchEvents / setShowBatchAddModal 等）
 */
export default function AddEventForm({
  fields,
  onFieldsChange,
  loading,
  error,
  onSubmit,
  onOpenBatchAdd
}) {
  const setField = (key, value) => {
    onFieldsChange({ ...fields, [key]: value });
  };

  const handleMaxParticipantsChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setField('maxParticipants', '');
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
        setField('maxParticipants', numValue);
      }
    }
  };

  return (
    <>
      <h5 className="mb-3">新增活動</h5>
      <form onSubmit={onSubmit} className="mb-4">
        <div className="row g-2 mb-2">
          <div className="col-md-2">
            <label className="form-label">活動名稱 *</label>
            <input
              className="form-control"
              placeholder="請輸入活動名稱"
              required
              value={fields.name}
              onChange={(e) => setField('name', e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">活動類型 *</label>
            <select
              className="form-control"
              required
              value={fields.eventType}
              onChange={(e) => setField('eventType', e.target.value)}
            >
              <option value="English Table">English Table</option>
              <option value="Job Talk">Job Talk</option>
              <option value="English Club">English Club</option>
              <option value="International Forum">International Forum</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label">人數限制 *</label>
            <input
              type="number"
              className="form-control"
              placeholder="30"
              min="1"
              max="100"
              required
              value={fields.maxParticipants === '' ? '' : fields.maxParticipants}
              onChange={handleMaxParticipantsChange}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">日期 *</label>
            <input
              type="date"
              className="form-control"
              required
              value={fields.date}
              onChange={(e) => setField('date', e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">&nbsp;</label>
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? '新增中...' : '新增活動'}
            </button>
          </div>
        </div>
        <div className="row g-2 mb-2">
          <div className="col-md-2">
            <label className="form-label">開始時間 *</label>
            <input
              type="time"
              className="form-control"
              required
              value={fields.startTime}
              onChange={(e) => setField('startTime', e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">結束時間 *</label>
            <input
              type="time"
              className="form-control"
              required
              value={fields.endTime}
              onChange={(e) => setField('endTime', e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">&nbsp;</label>
            <button type="button" className="btn btn-success w-100" onClick={onOpenBatchAdd}>
              批量新增活動
            </button>
          </div>
        </div>

        {fields.eventType === '其他' && (
          <div className="row g-2 mb-2">
            <div className="col-md-4">
              <label className="form-label">自定義活動類型名稱 *</label>
              <input
                className="form-control"
                placeholder="請輸入活動類型名稱"
                required
                value={fields.customEventType}
                onChange={(e) => setField('customEventType', e.target.value)}
              />
            </div>
            <div className="col-md-8">
              <label className="form-label">預約開始時間規則 *</label>
              <input
                className="form-control"
                placeholder="例：活動開始前兩天的下午3點、這個禮拜二的早上9點等"
                required
                value={fields.customReservationRule}
                onChange={(e) => setField('customReservationRule', e.target.value)}
              />
              <small className="text-muted">注意：自定義活動類型將使用 English Table 的預約時間邏輯（前一天00:00開始）</small>
            </div>
          </div>
        )}

        {error && <ErrorAlert error={error} />}
      </form>
    </>
  );
}
