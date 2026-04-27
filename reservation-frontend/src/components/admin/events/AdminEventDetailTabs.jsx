import React, { useMemo, useState } from 'react';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import dayjs from 'dayjs';
import { EVENT_DETAIL_COPY } from '../../../constants/adminEventDetailCopy';

/**
 * 活動明細：預約 → 簽到 → 匯入／匯出 → 違規／未到（現場流程優先）
 */
export default function AdminEventDetailTabs(props) {
  const { activeKey, onSelect, ...ws } = props;
  const [internalKey, setInternalKey] = useState('reservations');
  const tabKey = activeKey !== undefined ? activeKey : internalKey;
  const setTabKey = onSelect || setInternalKey;

  const [checkinSearchTerm, setCheckinSearchTerm] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelVerificationCode, setCancelVerificationCode] = useState('');
  const [cancelCodeError, setCancelCodeError] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const openCancelReservationModal = (reservation) => {
    setCancelTarget(reservation);
    setCancelVerificationCode('');
    setCancelCodeError('');
  };

  const closeCancelReservationModal = () => {
    if (cancelSubmitting) return;
    setCancelTarget(null);
    setCancelVerificationCode('');
    setCancelCodeError('');
  };

  const submitCancelReservation = async () => {
    if (!cancelTarget) return;
    const code = cancelVerificationCode.trim();
    if (!code) {
      setCancelCodeError('請輸入該筆預約的取消驗證碼。');
      return;
    }

    setCancelSubmitting(true);
    setCancelCodeError('');
    const ok = await ws.handleDeleteReservation(
      cancelTarget.id,
      cancelTarget.studentId,
      cancelTarget.studentName || cancelTarget.name,
      code
    );
    setCancelSubmitting(false);
    if (ok) {
      setCancelTarget(null);
      setCancelVerificationCode('');
    }
  };

  const resBlocking = ws.reservationsLoading && !ws.reservationsLoaded;
  const vioBlocking =
    tabKey === 'violations' &&
    (!ws.reservationsLoaded || !ws.violationsLoaded) &&
    (ws.reservationsLoading || ws.violationsLoading);

  const filteredPendingCheckin = useMemo(() => {
    const rows = ws.pendingCheckinRows || [];
    if (!checkinSearchTerm.trim()) return rows;
    const q = checkinSearchTerm.toLowerCase();
    return rows.filter((r) => {
      const sid = (r.studentId || '').toLowerCase();
      const name = (r.studentName || r.name || '').toLowerCase();
      return sid.includes(q) || name.includes(q);
    });
  }, [ws.pendingCheckinRows, checkinSearchTerm]);

  const reservationTable = (opts = { showCheckinActions: true }) => (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2 border-bottom pb-2">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0 text-nowrap">搜尋</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="學號或姓名"
              value={ws.reservationSearchTerm}
              onChange={(e) => ws.setReservationSearchTerm(e.target.value)}
              style={{ minWidth: '200px' }}
            />
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted text-nowrap">排序</span>
            <div className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className={`btn ${ws.reservationSortField === 'studentId' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => ws.handleReservationSort('studentId')}
              >
                學號 {ws.reservationSortField === 'studentId' && (ws.reservationSortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                type="button"
                className={`btn ${ws.reservationSortField === 'name' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => ws.handleReservationSort('name')}
              >
                姓名 {ws.reservationSortField === 'name' && (ws.reservationSortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                type="button"
                className={`btn ${ws.reservationSortField === 'checkinStatus' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => ws.handleReservationSort('checkinStatus')}
              >
                狀態 {ws.reservationSortField === 'checkinStatus' && (ws.reservationSortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
        </div>
        <div className="text-muted small text-nowrap">
          顯示 {ws.filteredReservationData.length} 筆｜已簽到{' '}
          {ws.filteredReservationData.filter((r) => r.checkinStatus === '已簽到').length}｜未簽到{' '}
          {ws.filteredReservationData.filter((r) => r.checkinStatus === '未簽到').length}
        </div>
      </div>
      <p className="small text-muted mb-2">
        此分頁以<strong>完整名單</strong>為主；簽到請優先使用「簽到管理」。違規／批次未到請至最後一分頁，避免誤觸。
      </p>
      <div className="table-responsive">
        <table className="table table-bordered table-sm align-middle">
          <thead className="table-light">
            <tr>
              <th>學號</th>
              <th>姓名</th>
              {ws.currentEventType === 'English Table' && <th>組別</th>}
              <th>簽到狀態</th>
              <th style={{ minWidth: '200px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {ws.filteredReservationData.length === 0 ? (
              <tr>
                <td colSpan={ws.currentEventType === 'English Table' ? 5 : 4} className="text-center text-muted">
                  {ws.reservationSearchTerm ? '沒有符合搜尋條件的預約' : EVENT_DETAIL_COPY.emptyReservations}
                </td>
              </tr>
            ) : (
              ws.filteredReservationData.map((reservation, index) => (
                <tr key={reservation.id || index}>
                  <td>{reservation.studentId}</td>
                  <td>{reservation.studentName || reservation.name}</td>
                  {ws.currentEventType === 'English Table' && (
                    <td>
                      <span className="badge bg-info">{reservation.group}</span>
                    </td>
                  )}
                  <td>
                    <span
                      className={`badge ${
                        reservation.checkinStatus === '已簽到'
                          ? 'bg-success'
                          : reservation.checkinStatus === '已登記違規'
                            ? 'bg-danger'
                            : 'bg-warning'
                      }`}
                    >
                      {reservation.checkinStatus}
                    </span>
                    {reservation.checkinTime && (
                      <div className="small text-muted">{dayjs(reservation.checkinTime).format('HH:mm')}</div>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-1 flex-wrap align-items-center">
                      {opts.showCheckinActions &&
                        ws.canCheckinStudents &&
                        reservation.checkinStatus === '未簽到' &&
                        (ws.isEventToday(ws.currentEventDate) || ws.canManageEvents) && (
                          <Button
                            variant="success"
                            size="sm"
                            className="fw-semibold"
                            onClick={() => ws.handleCheckin(reservation.id)}
                            disabled={ws.checkinLoading[reservation.id]}
                            title={
                              !ws.isEventToday(ws.currentEventDate) && ws.canManageEvents ? '補簽到（管理員）' : '簽到'
                            }
                          >
                            {ws.checkinLoading[reservation.id]
                              ? '簽到中…'
                              : !ws.isEventToday(ws.currentEventDate) && ws.canManageEvents
                                ? '補簽到'
                                : '簽到'}
                          </Button>
                        )}
                      {reservation.checkinStatus === '未簽到' &&
                        !ws.isEventToday(ws.currentEventDate) &&
                        !ws.canManageEvents && (
                          <span className="text-muted small">
                            {new Date(ws.currentEventDate) > new Date() ? '尚未到活動日' : '活動已過期'}
                          </span>
                        )}
                      {reservation.checkinStatus === '已登記違規' && (
                        <span className="text-danger small">已登記違規</span>
                      )}
                      {ws.canManageViolations && reservation.checkinStatus !== '已登記違規' && (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => {
                            setTabKey('violations');
                            ws.openViolationModal(reservation.studentId);
                          }}
                        >
                          違規…
                        </Button>
                      )}
                      {ws.canManageEvents && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => openCancelReservationModal(reservation)}
                          title="刪除預約（管理員）"
                        >
                          取消預約
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <>
      <Tabs
        activeKey={tabKey}
        onSelect={(k) => setTabKey(k || 'reservations')}
        className="mb-3 admin-event-detail-tabs"
      >
        <Tab eventKey="reservations" title="預約名單">
          <Card className="border-0 shadow-sm">
            <Card.Body className="pt-3">
              <h6 className="text-secondary fw-semibold mb-3">主任務：檢視與搜尋全部預約</h6>
              {resBlocking ? (
                <div className="text-center py-5 text-muted">
                  <Spinner animation="border" size="sm" className="me-2" />
                  {EVENT_DETAIL_COPY.listLoading}
                </div>
              ) : ws.reservationsError ? (
                <Alert variant="danger">{ws.reservationsError}</Alert>
              ) : (
                reservationTable({ showCheckinActions: true })
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="checkin" title="簽到管理">
          <Card className="shadow-sm border-success border-top border-3">
            <Card.Body className="pt-3">
              <h6 className="text-success fw-semibold mb-2">主任務：現場簽到／補簽到</h6>
              <p className="small text-muted mb-3">
                僅列出<strong>尚未簽到</strong>者；請依學號或姓名搜尋後點<strong className="text-success">簽到</strong>。
              </p>
              {resBlocking ? (
                <div className="text-center py-5 text-muted">
                  <Spinner animation="border" size="sm" className="me-2" />
                  {EVENT_DETAIL_COPY.listLoading}
                </div>
              ) : ws.reservationsError ? (
                <Alert variant="danger">{ws.reservationsError}</Alert>
              ) : (
                <>
              <div className="bg-light rounded p-3 mb-3 d-flex flex-wrap align-items-center gap-2 justify-content-between">
                <div className="fw-semibold">
                  待簽到 <span className="text-danger">{ws.pendingCheckinRows.length}</span> 人
                </div>
                <div className="d-flex align-items-center gap-2 flex-grow-1 flex-wrap" style={{ minWidth: '200px' }}>
                  <Form.Control
                    size="sm"
                    placeholder="搜尋待簽到學號／姓名"
                    value={checkinSearchTerm}
                    onChange={(e) => setCheckinSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-bordered table-sm align-middle">
                  <thead className="table-success">
                    <tr>
                      <th>學號</th>
                      <th>姓名</th>
                      {ws.currentEventType === 'English Table' && <th>組別</th>}
                      <th style={{ minWidth: '140px' }}>簽到</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingCheckin.length === 0 ? (
                      <tr>
                        <td
                          colSpan={ws.currentEventType === 'English Table' ? 4 : 3}
                          className="text-center text-muted"
                        >
                          {checkinSearchTerm.trim() ? '沒有符合的待簽到名單' : EVENT_DETAIL_COPY.emptyPendingCheckin}
                        </td>
                      </tr>
                    ) : (
                      filteredPendingCheckin.map((reservation, index) => (
                        <tr key={reservation.id || index}>
                          <td>{reservation.studentId}</td>
                          <td>{reservation.studentName || reservation.name}</td>
                          {ws.currentEventType === 'English Table' && <td>{reservation.group}</td>}
                          <td>
                            {ws.canCheckinStudents && (ws.isEventToday(ws.currentEventDate) || ws.canManageEvents) && (
                              <Button
                                variant="success"
                                size="lg"
                                className="px-4 fw-semibold"
                                onClick={() => ws.handleCheckin(reservation.id)}
                                disabled={ws.checkinLoading[reservation.id]}
                              >
                                {ws.checkinLoading[reservation.id]
                                  ? '簽到中…'
                                  : !ws.isEventToday(ws.currentEventDate) && ws.canManageEvents
                                    ? '補簽到'
                                    : '簽到'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="importExport" title="匯入與匯出">
          <div className="pt-3">
            <p className="small text-muted mb-3">工具型操作：下載名單或匯入刷卡檔，與簽到流程分開。</p>
            <Card className="mb-3 border-primary">
              <Card.Header className="bg-primary text-white py-2 small fw-semibold">匯出</Card.Header>
              <Card.Body>
                <p className="text-muted small mb-2">下載此活動預約清單 Excel（次要操作）。</p>
                <Button variant="primary" size="sm" onClick={ws.handleExport} disabled={!ws.canExportReservations}>
                  匯出活動 Excel
                </Button>
              </Card.Body>
            </Card>
            {ws.canImportExcel && (
              <Card className="border-secondary">
                <Card.Header className="bg-secondary text-white py-2 small fw-semibold">匯入</Card.Header>
                <Card.Body>
                  <Alert variant="warning" className="py-2 small mb-3">
                    匯入會依刷卡檔比對學號並寫入簽到；請確認<strong>刷卡日期與活動日相同</strong>，檔案勿超過系統限制。
                  </Alert>
                  <p className="text-muted small mb-2">
                    使用欄位：姓名、工號／學號、刷卡日期、刷卡時間（.xls / .xlsx）。
                  </p>
                  <Form onSubmit={ws.handleImportExcel} encType="multipart/form-data">
                    <Form.Group className="mb-3">
                      <Form.Label>選擇 Excel</Form.Label>
                      <Form.Control
                        type="file"
                        accept=".xls,.xlsx"
                        onChange={ws.handleImportFileChange}
                        disabled={ws.importLoading}
                      />
                    </Form.Group>
                    {ws.importError && <div className="alert alert-danger py-2">{ws.importError}</div>}
                    {ws.importResult && (
                      <div className="mb-3 small">
                        <p className="text-success">{ws.importResult.message}</p>
                        <ul className="list-unstyled">
                          <li>總筆數：{ws.importResult.totalImported || 0}</li>
                          <li>成功簽到：{ws.importResult.successCount || 0}</li>
                        </ul>
                      </div>
                    )}
                    <Button type="submit" variant="outline-dark" disabled={ws.importLoading || !ws.importFile}>
                      {ws.importLoading ? '匯入中…' : '開始匯入'}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            )}
            {!ws.canImportExcel && (
              <p className="small text-muted">您的身分無法使用刷卡機匯入，請洽管理員。</p>
            )}
          </div>
        </Tab>

        <Tab eventKey="violations" title="違規與未到處理">
          <div className="pt-3">
            {vioBlocking ? (
              <div className="text-center py-5 text-muted">
                <Spinner animation="border" size="sm" className="me-2" />
                {EVENT_DETAIL_COPY.listAndViolationsLoading}
              </div>
            ) : ws.reservationsError || ws.violationsError ? (
              <Alert variant="danger">{ws.reservationsError || ws.violationsError}</Alert>
            ) : (
              <>
            <Alert variant="danger" className="small py-2 mb-3">
              <strong>違規中心同步：</strong>
              以下「批次未到」「現場違規登記」「活動結束檢查」會寫入本活動紀錄，並同步至<strong>合規與違規中心</strong>（含黑名單關聯）。請謹慎操作。
            </Alert>

            <div className="rounded border border-danger p-3 mb-4 bg-light">
              <div className="small text-danger fw-semibold mb-2">高影響操作</div>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {ws.canManageViolations && (
                <Button variant="danger" size="sm" onClick={() => ws.openViolationModal()}>
                  現場違規登記
                </Button>
                )}
                {ws.canManageViolations && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={ws.handleBatchMarkNoShow}
                  disabled={
                    ws.batchMarkNoShowLoading || !ws.currentEventId || ws.noShowReservationCount === 0
                  }
                >
                  {ws.batchMarkNoShowLoading
                    ? '處理中…'
                    : `批次登記預約未到（${ws.noShowReservationCount}）`}
                </Button>
                )}
              </div>
              <p className="small text-muted mb-0">以上將直接影響學生違規狀態與後續管制。</p>
            </div>

            {ws.canManageBlacklist && (
              <div className="rounded border border-warning p-3 mb-4">
                <div className="small text-dark fw-semibold mb-2">管理員：活動結束檢查</div>
                <p className="small text-muted mb-2">
                  將活動期間違規與未簽到同步至黑名單流程（執行前請確認現場作業已完成）。
                </p>
                <Button
                  variant="warning"
                  size="sm"
                  className="text-dark"
                  onClick={ws.handleAutoCheck}
                  disabled={ws.autoCheckLoading || !ws.currentEventId || ws.currentEventAutoCheckCompleted}
                >
                  {ws.autoCheckLoading ? '檢查中…' : ws.currentEventAutoCheckCompleted ? '已執行檢查' : '活動結束檢查'}
                </Button>
              </div>
            )}

            {ws.eventViolations.length > 0 ? (
              <div>
                <h6 className="text-secondary fw-semibold mb-2">本活動違規紀錄（僅供查閱）</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered">
                    <thead className="table-danger">
                      <tr>
                        <th>學號</th>
                        <th>姓名</th>
                        <th>違規類型</th>
                        <th>描述</th>
                        <th>記錄時間</th>
                        <th>記錄者</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ws.eventViolations.map((violation) => (
                        <tr key={violation.id}>
                          <td>{violation.User?.studentId}</td>
                          <td>{violation.User?.name}</td>
                          <td>
                            <span className="badge bg-danger">{violation.violationType}</span>
                          </td>
                          <td>{violation.description || '—'}</td>
                          <td>{dayjs(violation.recordedAt).format('MM/DD HH:mm')}</td>
                          <td>{violation.recordedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="small text-muted mb-0">{EVENT_DETAIL_COPY.emptyViolations}</p>
            )}
              </>
            )}
          </div>
        </Tab>
      </Tabs>

      <Modal show={!!cancelTarget} onHide={closeCancelReservationModal} centered backdrop="static">
        <Modal.Header closeButton={!cancelSubmitting}>
          <Modal.Title>確認取消預約</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="small mb-3">
            此操作不受活動開始前 2 小時限制，但必須輸入該筆預約確認信中的取消驗證碼。送出後會刪除此預約紀錄，且無法復原。
          </Alert>
          <div className="mb-3">
            <div className="small text-muted">學生</div>
            <div className="fw-semibold">
              {cancelTarget?.studentId} {cancelTarget?.studentName || cancelTarget?.name}
            </div>
          </div>
          <Form.Group>
            <Form.Label>取消驗證碼</Form.Label>
            <Form.Control
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={cancelVerificationCode}
              onChange={(e) => {
                setCancelVerificationCode(e.target.value);
                if (cancelCodeError) setCancelCodeError('');
              }}
              placeholder="請輸入 6 位數驗證碼"
              maxLength={6}
              disabled={cancelSubmitting}
              autoFocus
            />
            <Form.Text className="text-muted">
              驗證碼來源為學生預約成功通知信；系統會與該筆預約儲存的驗證碼比對。
            </Form.Text>
          </Form.Group>
          {cancelCodeError ? (
            <Alert variant="danger" className="py-2 mt-3 mb-0">
              {cancelCodeError}
            </Alert>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeCancelReservationModal} disabled={cancelSubmitting}>
            取消
          </Button>
          <Button variant="danger" onClick={submitCancelReservation} disabled={cancelSubmitting}>
            {cancelSubmitting ? '處理中…' : '確認取消預約'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={ws.showViolationModal} onHide={() => ws.setShowViolationModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>登記違規</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="light" className="small border mb-3">
            送出後將同步至違規中心；請確認學號與事由無誤。
          </Alert>
          <Form.Group className="mb-2">
            <Form.Label>學號</Form.Label>
            <Form.Control
              value={ws.violationData.studentId}
              onChange={(e) => ws.setViolationData({ ...ws.violationData, studentId: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>違規類型</Form.Label>
            <Form.Select
              value={ws.violationData.violationType}
              onChange={(e) => ws.setViolationData({ ...ws.violationData, violationType: e.target.value })}
            >
              <option value="擾亂秩序">擾亂秩序</option>
              <option value="無故缺席">無故缺席</option>
              <option value="其他">其他</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>說明</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={ws.violationData.description}
              onChange={(e) => ws.setViolationData({ ...ws.violationData, description: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => ws.setShowViolationModal(false)}>
            取消
          </Button>
          <Button variant="danger" onClick={ws.handleRecordEventViolation} disabled={!ws.canManageViolations}>
            送出登記
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
