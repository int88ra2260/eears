// components/english-test/BulkActionToolbar.js
import React, { useState } from 'react';
import useConfirm from '../ui/useConfirm';
import useToast from '../ui/useToast';

export default function BulkActionToolbar({
  selectedCount,
  onBulkApprove,
  onBulkReject,
  onBulkDelete,
  onBulkSetSuccess,
  onBulkSetFailed,
  showBulkSetSuccess = false
}) {
  const { confirm } = useConfirm();
  const toast = useToast();
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionModalType, setRejectionModalType] = useState('revision'); // 'revision' 或 'failed'
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [rejectionOther, setRejectionOther] = useState('');

  // 拒絕原因選項（與主組件保持一致）
  const rejectionReasonOptions = [
    { id: '1', text: '照片五官不夠清晰' },
    { id: '2', text: '照片上有鋼印、浮水印或反光遮住五官' },
    { id: '3', text: '照片背景非白色或淺色' },
    { id: '4', text: '臉部未正視鏡頭，不是證件照表情、或使用生活照' },
    { id: '5', text: '髮型遮住耳朵、瀏海蓋住眉毛、或頭髮碰到照片邊框' },
    { id: '6', text: '照片背景非白色、照片太暗或逆光' },
    { id: '7', text: '有閃光反射在眼睛上、配戴深色鏡片、鏡框遮蓋眼睛' },
    { id: '8', text: '非本人照片' },
    { id: '9', text: '檔案格式不是jpg檔或png檔' },
    { id: '10', text: '檔案小於100KB或大於5MB' },
    { id: '11', text: '基本聯絡資訊資料有誤' },
    { id: '12', text: '身分與學籍資料有誤' },
    { id: '13', text: '特殊身分與協助需求資料有誤' },
    { id: '14', text: '照片與同意事項資料有誤' },
    { id: '15', text: '資訊來源資料有誤' },
    { id: '16', text: '英語能力與培力資格相關資料有誤' },
    { id: '其他', text: '其他(須說明原因)' }
  ];

  const handleBulkReject = () => {
    setRejectionModalType('revision');
    setShowRejectionModal(true);
    setRejectionReasons([]);
    setRejectionOther('');
  };

  const handleBulkSetFailed = () => {
    setRejectionModalType('failed');
    setShowRejectionModal(true);
    setRejectionReasons([]);
    setRejectionOther('');
  };

  const handleRejectionReasonChange = (reasonId) => {
    setRejectionReasons(prev => {
      if (prev.includes(reasonId)) {
        return prev.filter(id => id !== reasonId);
      } else {
        return [...prev, reasonId];
      }
    });
  };

  const handleConfirmRejection = () => {
    if (rejectionReasons.length === 0) {
      toast.warning(rejectionModalType === 'failed' ? '請至少選擇一個報名失敗原因' : '請至少選擇一個拒絕原因');
      return;
    }
    if (rejectionReasons.includes('其他') && (!rejectionOther || rejectionOther.trim() === '')) {
      toast.warning('選擇「其他」原因時，必須填寫說明');
      return;
    }
    if (rejectionModalType === 'failed') {
      onBulkSetFailed && onBulkSetFailed(rejectionReasons, rejectionOther);
    } else {
      onBulkReject && onBulkReject(rejectionReasons, rejectionOther);
    }
    setShowRejectionModal(false);
    setRejectionReasons([]);
    setRejectionOther('');
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="card mb-3 border-primary shadow-sm">
        <div className="card-body bg-light">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <strong className="text-primary">
                <i className="fas fa-check-square me-2"></i>
                已選擇 {selectedCount} 筆記錄
              </strong>
            </div>
            <div className="btn-group">
              <button
                className="btn btn-sm btn-success"
                onClick={() => {
                  confirm({
                    title: '確認批量通過？',
                    description: `確定要批量通過 ${selectedCount} 筆記錄嗎？`,
                    confirmText: '批量通過',
                    cancelText: '取消',
                    variant: 'primary',
                  }).then((ok) => {
                    if (!ok) return;
                    onBulkApprove && onBulkApprove();
                  });
                }}
              >
                <i className="fas fa-check me-1"></i>
                批量通過
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={handleBulkReject}
              >
                <i className="fas fa-times me-1"></i>
                批量請修正
              </button>
              <button
                className="btn btn-sm btn-warning"
                onClick={() => {
                  confirm({
                    title: '確認批量設為審核中？',
                    description: `確定要批量設為「審核中」 ${selectedCount} 筆記錄嗎？`,
                    confirmText: '更新',
                    cancelText: '取消',
                    variant: 'primary',
                  }).then((ok) => {
                    if (!ok) return;
                    onBulkReject && onBulkReject([], '', 'pending');
                  });
                }}
              >
                <i className="fas fa-clock me-1"></i>
                批量審核中
              </button>
              {showBulkSetSuccess && (
                <button
                  className="btn btn-sm btn-outline-success"
                  onClick={() => {
                    confirm({
                      title: '確認批量設為報名成功？',
                      description: `確定要將選取的 ${selectedCount} 筆「已通過」設為「報名成功」嗎？`,
                      confirmText: '更新',
                      cancelText: '取消',
                      variant: 'warning',
                    }).then((ok) => {
                      if (!ok) return;
                      onBulkSetSuccess && onBulkSetSuccess();
                    });
                  }}
                  title="僅對狀態為「已通過」的記錄有效"
                >
                  <i className="fas fa-flag-checkered me-1"></i>
                  批量設為報名成功
                </button>
              )}
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={handleBulkSetFailed}
                style={{ borderColor: '#dc3545', color: '#dc3545' }}
              >
                <i className="fas fa-ban me-1"></i>
                批量設為報名失敗
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => {
                  confirm({
                    title: '確認批量刪除？',
                    description: `確定要批量刪除 ${selectedCount} 筆記錄嗎？此操作無法復原。`,
                    confirmText: '刪除',
                    cancelText: '取消',
                    variant: 'danger',
                  }).then((ok) => {
                    if (!ok) return;
                    onBulkDelete && onBulkDelete();
                  });
                }}
              >
                <i className="fas fa-trash me-1"></i>
                批量刪除
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 拒絕原因 Modal */}
      {showRejectionModal && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRejectionModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  {rejectionModalType === 'failed' ? '批量報名失敗原因（可複選）' : '批量拒絕原因（可複選）'}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowRejectionModal(false)}
                ></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <div className="alert alert-warning">
                  <strong>注意：</strong>您將批量{rejectionModalType === 'failed' ? '設為報名失敗' : '拒絕'} {selectedCount} 筆記錄，必須至少選擇一個原因。
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">
                    請選擇{rejectionModalType === 'failed' ? '報名失敗' : '拒絕'}原因（可複選）：
                  </label>
                  <div className="row mt-2">
                    {rejectionReasonOptions.map(option => (
                      <div key={option.id} className="col-md-6 mb-2">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`bulk-rejection-${option.id}`}
                            checked={rejectionReasons.includes(option.id)}
                            onChange={() => handleRejectionReasonChange(option.id)}
                          />
                          <label className="form-check-label" htmlFor={`bulk-rejection-${option.id}`}>
                            {option.text}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {rejectionReasons.includes('其他') && (
                  <div className="mb-3">
                    <label className="form-label fw-bold">其他原因說明：</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={rejectionOther}
                      onChange={(e) => setRejectionOther(e.target.value)}
                      placeholder={`請詳細說明${rejectionModalType === 'failed' ? '報名失敗' : '拒絕'}原因`}
                      required
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRejectionModal(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmRejection}
                >
                  確認批量{rejectionModalType === 'failed' ? '設為報名失敗' : '拒絕'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
