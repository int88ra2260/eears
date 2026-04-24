// components/admin/home/ImportCardExcelModal.js
// 匯入刷卡機 Excel Modal：UI 與 callbacks，API、上傳、refresh 與錯誤處理保留在 AdminHome。

import React from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

/**
 * @param {Object} props
 * @param {boolean} props.show
 * @param {File|null} props.file - 已選檔案
 * @param {boolean} props.loading
 * @param {string} props.error
 * @param {Object|null} props.result - API 回傳的匯入結果
 * @param {(file: File|null) => void} props.onFileChange - event.target.files[0] 或 null
 * @param {() => void} props.onClose
 * @param {() => void} props.onSubmit - 表單送出（parent 負責驗證、API、refresh）
 */
export default function ImportCardExcelModal({
  show,
  file,
  loading,
  error,
  result,
  onFileChange,
  onClose,
  onSubmit
}) {
  const handleFileChange = (event) => {
    const selectedFile = event?.target?.files?.[0] || null;
    onFileChange(selectedFile);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" backdrop="static">
      <Form onSubmit={handleSubmit} encType="multipart/form-data">
        <Modal.Header closeButton>
          <Modal.Title>匯入刷卡機 Excel</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small">
            系統僅會使用 Excel 中的「姓名」、「工號 / 學號」、「刷卡日期」、「刷卡時間」欄位。請確認刷卡日期與活動日期相同，並確保檔案為 .xls 或 .xlsx。
          </p>
          <Form.Group controlId="importExcelFile" className="mb-3">
            <Form.Label>選擇 Excel 檔案</Form.Label>
            <Form.Control
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileChange}
              disabled={loading}
            />
            <Form.Text className="text-muted">
              檔案大小限制 5MB；若有多個檔案請分次匯入。
            </Form.Text>
          </Form.Group>
          {error && (
            <div className="alert alert-danger py-2">{error}</div>
          )}
          {result && (
            <div className="mt-3">
              <h6>匯入結果</h6>
              {result.message && (
                <p className="text-success mb-2">{result.message}</p>
              )}
              <ul className="list-unstyled mb-3">
                <li>總筆數：{result.totalImported || 0}</li>
                <li>成功簽到：{result.successCount || 0}</li>
                <li>日期不符略過：{(result.skippedByDate || []).length}</li>
                <li>重複紀錄：{(result.duplicates || []).length}</li>
                <li>缺少學號列：{(result.missingStudentIdRows || []).length}</li>
              </ul>
              {(result.notFound || []).length > 0 && (
                <div className="alert alert-warning">
                  <strong>⚠ 無法比對的學號 ({result.notFound.length})：</strong>
                  <div className="small mt-2">{result.notFound.join(', ')}</div>
                </div>
              )}
              {(result.duplicates || []).length > 0 && (
                <div className="alert alert-info">
                  <strong>重複紀錄 ({result.duplicates.length})：</strong>
                  <div className="small mt-2">{result.duplicates.join(', ')}</div>
                </div>
              )}
              {(result.skippedByDate || []).length > 0 && (
                <div className="alert alert-secondary">
                  <strong>日期不符 ({result.skippedByDate.length})：</strong>
                  <div className="small mt-2">{result.skippedByDate.join(', ')}</div>
                </div>
              )}
              {(result.missingStudentIdRows || []).length > 0 && (
                <div className="alert alert-secondary">
                  <strong>找不到學號的列：</strong>
                  <div className="small mt-2">
                    第 {result.missingStudentIdRows.join(', ')} 列
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={loading || !file}
          >
            {loading ? '匯入中...' : '開始匯入'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
