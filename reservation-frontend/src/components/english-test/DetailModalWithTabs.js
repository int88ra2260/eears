// components/english-test/DetailModalWithTabs.js
import React, { useState } from 'react';
import useMediaQuery from '../../hooks/useMediaQuery';
import PhotoViewer from './PhotoViewer';
import useToast from '../ui/useToast';
import useConfirm from '../ui/useConfirm';

// 拒絕原因選項映射（與 QuickReviewMode 保持一致）
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

// 將拒絕原因ID轉換為文字描述
const getRejectionReasonText = (reasonId) => {
  const option = rejectionReasonOptions.find(opt => opt.id === reasonId || opt.id === String(reasonId));
  return option ? option.text : reasonId; // 如果找不到對應選項，返回原始值
};

export default function DetailModalWithTabs({ 
  registration, 
  onClose, 
  onQuickStatusUpdate,
  onNavigatePrevious,
  onNavigateNext,
  canNavigatePrevious = false,
  canNavigateNext = false,
  positionLabel = null,
  onAdjustSequence = null,
  token = null,
  adjustingSequence = false,
  onUpdateRegistration = null, // 後台修改資料的回調函數
  onUploadRegistrationFiles = null  // 後台上傳/更換證件照、成績證明、身心障礙證明的回調
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isNarrow = useMediaQuery('(max-width: 992px)');
  const toast = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState('basic');
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    academic: false,
    special: false,
    files: false,
    exam: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [editFileInputs, setEditFileInputs] = useState({ idPhoto: null, b2CertificateFile: null, disabilityCertFront: null, disabilityCertBack: null }); // 編輯模式選擇的新檔案
  const [showStatusDropdown, setShowStatusDropdown] = useState(false); // 狀態下拉選單顯示
  const statusDropdownRef = React.useRef(null); // 狀態下拉選單的 ref
  const statusDropdownButtonRef = React.useRef(null); // 狀態下拉選單按鈕的 ref
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0, right: 'auto', top: '100%', bottom: 'auto' }); // 下拉選單位置

  // 計算下拉選單位置，確保不超出視窗
  React.useEffect(() => {
    if (showStatusDropdown && statusDropdownButtonRef.current && statusDropdownRef.current) {
      const calculatePosition = () => {
        const button = statusDropdownButtonRef.current;
        if (!button) return;
        
        const buttonRect = button.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 估算下拉選單尺寸
        const estimatedDropdownWidth = 200;
        const estimatedDropdownHeight = 250; // 5個選項
        
        let left = 0;
        let right = 'auto';
        let top = '100%';
        let bottom = 'auto';
        let maxHeight = 'auto';
        
        // 檢查右邊界
        if (buttonRect.left + estimatedDropdownWidth > viewportWidth - 10) {
          // 如果超出右邊界，從右側對齊
          right = 0;
          left = 'auto';
        }
        
        // 檢查底部邊界
        if (buttonRect.bottom + estimatedDropdownHeight > viewportHeight - 10) {
          // 如果超出底部，向上展開
          bottom = '100%';
          top = 'auto';
          // 限制最大高度
          const availableHeight = buttonRect.top - 20; // 留20px邊距
          maxHeight = `${Math.max(100, availableHeight)}px`; // 至少100px高度
        }
        
        setDropdownPosition({ left, right, top, bottom, maxHeight });
        
        // 等待DOM更新後使用實際尺寸重新計算
        setTimeout(() => {
          const dropdown = statusDropdownRef.current?.querySelector('.dropdown-menu');
          if (dropdown) {
            const updatedButtonRect = button.getBoundingClientRect();
            const dropdownRect = dropdown.getBoundingClientRect();
            const updatedViewportWidth = window.innerWidth;
            const updatedViewportHeight = window.innerHeight;
            
            let finalLeft = left;
            let finalRight = right;
            let finalTop = top;
            let finalBottom = bottom;
            let finalMaxHeight = maxHeight;
            
            // 重新檢查右邊界（使用實際尺寸）
            if (updatedButtonRect.left + dropdownRect.width > updatedViewportWidth - 10) {
              finalRight = 0;
              finalLeft = 'auto';
            }
            
            // 重新檢查底部邊界（使用實際尺寸）
            if (updatedButtonRect.bottom + dropdownRect.height > updatedViewportHeight - 10) {
              finalBottom = '100%';
              finalTop = 'auto';
              const availableHeight = updatedButtonRect.top - 20;
              finalMaxHeight = `${Math.max(100, availableHeight)}px`;
            }
            
            setDropdownPosition({ 
              left: finalLeft, 
              right: finalRight, 
              top: finalTop, 
              bottom: finalBottom, 
              maxHeight: finalMaxHeight 
            });
          }
        }, 10);
      };
      
      // 立即計算一次
      calculatePosition();
      
      // 監聽視窗大小改變和滾動
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition, true);
      
      return () => {
        window.removeEventListener('resize', calculatePosition);
        window.removeEventListener('scroll', calculatePosition, true);
      };
    } else {
      // 重置位置
      setDropdownPosition({ left: 0, right: 'auto', top: '100%', bottom: 'auto' });
    }
  }, [showStatusDropdown]);

  // 點擊外部關閉下拉選單
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false);
      }
    };

    if (showStatusDropdown) {
      // 使用 setTimeout 確保下拉選單已經渲染
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusDropdown]);

  const getStatusText = (status) => {
    const statusMap = {
      'pending': { text: '審核中', class: 'warning' },
      'approved': { text: '已通過', class: 'success' },
      'revision': { text: '請修正', class: 'danger' },
      'success': { text: '報名成功', class: 'success' },
      'failed': { text: '報名失敗', class: 'secondary' }
    };
    return statusMap[status] || { text: status, class: 'secondary' };
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 格式化檔案大小
  const formatFileSize = (bytes) => {
    if (!bytes) return '未知';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  // 處理狀態變更
  const handleStatusChange = (newStatus) => {
    setShowStatusDropdown(false);
    if (onQuickStatusUpdate) {
      if (newStatus === 'revision') {
        // 如果是請修正，需要額外處理（由父組件處理）
        onQuickStatusUpdate(registration.id, newStatus);
      } else {
        onQuickStatusUpdate(registration.id, newStatus);
      }
    }
  };

  // 進入編輯模式
  const handleStartEdit = () => {
    setEditData({ ...registration });
    setEditFileInputs({ idPhoto: null, b2CertificateFile: null, disabilityCertFront: null, disabilityCertBack: null });
    setIsEditing(true);
  };

  // 取消編輯
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({});
    setEditFileInputs({ idPhoto: null, b2CertificateFile: null, disabilityCertFront: null, disabilityCertBack: null });
  };

  // 儲存編輯（含可選的檔案上傳）
  const handleSaveEdit = async () => {
    if (!onUpdateRegistration || !token) {
      toast.error('無法儲存：缺少必要的更新函數或權限');
      return;
    }

    try {
      const hasFileChanges = editFileInputs.idPhoto || editFileInputs.b2CertificateFile || editFileInputs.disabilityCertFront || editFileInputs.disabilityCertBack;
      if (hasFileChanges && onUploadRegistrationFiles) {
        const formData = new FormData();
        if (editFileInputs.idPhoto) formData.append('idPhoto', editFileInputs.idPhoto);
        if (editFileInputs.b2CertificateFile) formData.append('b2CertificateFile', editFileInputs.b2CertificateFile);
        if (editFileInputs.disabilityCertFront) formData.append('disabilityCertFront', editFileInputs.disabilityCertFront);
        if (editFileInputs.disabilityCertBack) formData.append('disabilityCertBack', editFileInputs.disabilityCertBack);
        await onUploadRegistrationFiles(registration.id, formData, token);
      }
      await onUpdateRegistration(registration.id, editData, token);
      setIsEditing(false);
      setEditData({});
      setEditFileInputs({ idPhoto: null, b2CertificateFile: null, disabilityCertFront: null, disabilityCertBack: null });
    } catch (error) {
      console.error('儲存失敗:', error);
      toast.error(error.message || '儲存失敗，請稍後再試');
    }
  };

  // 處理編輯資料變更
  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  // 處理編輯模式選擇的檔案（證件照、成績證明、身心障礙證明）
  const handleFileInputChange = (field, file) => {
    setEditFileInputs(prev => ({ ...prev, [field]: file && file.size > 0 ? file : null }));
  };

  // 個人電腦：Tabs 版本（背層與內容分離，避免點到藍色圓鈕時關閉視窗）
  if (!isMobile) {
    return (
      <div
        className="modal fade show"
        style={{
          display: 'block',
          position: 'fixed',
          inset: 0,
          zIndex: 1050,
          pointerEvents: 'none'
        }}
      >
        {/* 背層：僅此區點擊會關閉，z-index 較低 */}
        <div
          role="presentation"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            pointerEvents: 'auto',
            zIndex: 0
          }}
          onClick={onClose}
        />
        {/* 彈窗本體：含按鈕與內容，z-index 較高，點擊不會關閉 */}
        <div
          className="modal-dialog modal-xl modal-dialog-scrollable"
          style={{
            position: 'relative',
            margin: '0 auto',
            maxWidth: '95vw',
            width: '95vw',
            paddingLeft: isNarrow ? 0 : '56px',
            paddingRight: isNarrow ? 0 : '56px',
            pointerEvents: 'auto',
            zIndex: 1
          }}
        >
          {/* 上一筆 */}
          {canNavigatePrevious && (
            <button
              type="button"
              className="btn btn-light position-absolute top-50 start-0 translate-middle-y d-flex align-items-center justify-content-center border-2 border-primary bg-primary text-white shadow"
              style={{
                width: '44px',
                height: '44px',
                left: isNarrow ? '8px' : '8px',
                zIndex: 1060,
                clipPath: 'polygon(100% 0, 100% 100%, 0 50%)',
                borderRadius: '4px 0 0 4px'
              }}
              onClick={() => onNavigatePrevious && onNavigatePrevious()}
              title="上一筆（當前篩選）"
              aria-label="上一筆"
            >
              <i className="fas fa-chevron-left" />
            </button>
          )}

          {/* 下一筆 */}
          {canNavigateNext && (
            <button
              type="button"
              className="btn btn-light position-absolute top-50 end-0 translate-middle-y d-flex align-items-center justify-content-center border-2 border-primary bg-primary text-white shadow"
              style={{
                width: '44px',
                height: '44px',
                right: isNarrow ? '8px' : '8px',
                zIndex: 1060,
                clipPath: 'polygon(0 0, 0 100%, 100% 50%)',
                borderRadius: '0 4px 4px 0'
              }}
              onClick={() => onNavigateNext && onNavigateNext()}
              title="下一筆（當前篩選）"
              aria-label="下一筆"
            >
              <i className="fas fa-chevron-right" />
            </button>
          )}

          <div className="modal-content">
            <div className="modal-header bg-primary text-white flex-wrap">
              <div className="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
                <h5 className="modal-title mb-0 text-truncate" style={{ maxWidth: 'min(100%, 280px)' }}>
                  報名詳細資料 - {registration.name}
                </h5>
                <div className="d-flex gap-2 align-items-center flex-shrink-0 flex-wrap">
                  {positionLabel && (
                    <span className="badge bg-light text-dark" title="當前篩選下的序位">{positionLabel}</span>
                  )}
                  {registration.status === 'success' && registration.successSequence && (
                    <span className="badge bg-info" title="報名成功序號">
                      序號：{registration.successSequence}
                    </span>
                  )}
                  <span className={`badge bg-${getStatusText(registration.status).class}`}>
                    {getStatusText(registration.status).text}
                  </span>
                  {registration.status === 'success' && onAdjustSequence && (
                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className="btn btn-outline-light"
                        onClick={() => onAdjustSequence(registration.id, 'up')}
                        disabled={adjustingSequence}
                        title="上移一位"
                        aria-label="上移一位"
                      >
                        {adjustingSequence ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : (
                          <i className="fas fa-arrow-up"></i>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-light"
                        onClick={() => onAdjustSequence(registration.id, 'down')}
                        disabled={adjustingSequence}
                        title="下移一位"
                        aria-label="下移一位"
                      >
                        {adjustingSequence ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : (
                          <i className="fas fa-arrow-down"></i>
                        )}
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={onClose}
                    aria-label="關閉"
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-body">
              {/* Tabs 導航 */}
              <ul className="nav nav-tabs mb-3" role="tablist">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'basic' ? 'active' : ''}`}
                    onClick={() => setActiveTab('basic')}
                  >
                    <i className="fas fa-user me-1"></i>
                    基本資料
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'academic' ? 'active' : ''}`}
                    onClick={() => setActiveTab('academic')}
                  >
                    <i className="fas fa-graduation-cap me-1"></i>
                    學籍資訊
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'special' ? 'active' : ''}`}
                    onClick={() => setActiveTab('special')}
                  >
                    <i className="fas fa-heart me-1"></i>
                    特殊身分
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'exam' ? 'active' : ''}`}
                    onClick={() => setActiveTab('exam')}
                  >
                    <i className="fas fa-clipboard-list me-1"></i>
                    選考資料
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'files' ? 'active' : ''}`}
                    onClick={() => setActiveTab('files')}
                  >
                    <i className="fas fa-file me-1"></i>
                    檔案附件
                  </button>
                </li>
              </ul>

              {/* Tabs 內容 */}
              <div className="tab-content">
                {/* 基本資料 */}
                {activeTab === 'basic' && (
                  <div className="tab-pane fade show active">
                    {isEditing && (
                      <div className="alert alert-warning mb-3">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        <strong>後台編輯模式</strong>：您正在修改報名資料，修改後請點擊「儲存」按鈕。
                      </div>
                    )}
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <strong>學號：</strong> {isEditing ? (
                          <input type="text" className="form-control form-control-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.studentId || ''} onChange={(e) => handleEditChange('studentId', e.target.value)} />
                        ) : registration.studentId}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>姓名：</strong> {isEditing ? (
                          <input type="text" className="form-control form-control-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.name || ''} onChange={(e) => handleEditChange('name', e.target.value)} />
                        ) : registration.name}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>身分證字號：</strong> {isEditing ? (
                          <input type="text" className="form-control form-control-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.idNumber || editData.nationalId || ''} onChange={(e) => {
                              handleEditChange('idNumber', e.target.value);
                              handleEditChange('nationalId', e.target.value);
                            }} />
                        ) : (registration.idNumber || registration.nationalId || '-')}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Email：</strong> {isEditing ? (
                          <input type="email" className="form-control form-control-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.email || ''} onChange={(e) => handleEditChange('email', e.target.value)} />
                        ) : registration.email}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>電話：</strong> {isEditing ? (
                          <input type="tel" className="form-control form-control-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.phone || ''} onChange={(e) => handleEditChange('phone', e.target.value)} />
                        ) : registration.phone}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>出生日期：</strong> {isEditing ? (
                          <input type="date" className="form-control form-control-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.birthDate || ''} onChange={(e) => handleEditChange('birthDate', e.target.value)} />
                        ) : registration.birthDate}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>英文姓名：</strong> {isEditing ? (
                          <div className="d-inline-block">
                            <input type="text" className="form-control form-control-sm d-inline-block me-1" style={{ width: '100px' }} 
                              value={editData.lastNameEn || ''} onChange={(e) => handleEditChange('lastNameEn', e.target.value)} placeholder="姓" />
                            <input type="text" className="form-control form-control-sm d-inline-block" style={{ width: '100px' }} 
                              value={editData.firstNameEn || ''} onChange={(e) => handleEditChange('firstNameEn', e.target.value)} placeholder="名" />
                          </div>
                        ) : `${registration.lastNameEn} ${registration.firstNameEn}`}
                      </div>
                      <div className="col-12 mb-3">
                        <strong>地址：</strong> {isEditing ? (
                          <div className="d-inline-block w-100">
                            <input type="text" className="form-control form-control-sm mb-1" placeholder="郵遞區號" 
                              value={editData.postalCode || ''} onChange={(e) => handleEditChange('postalCode', e.target.value)} />
                            <input type="text" className="form-control form-control-sm mb-1" placeholder="縣市" 
                              value={editData.city || ''} onChange={(e) => handleEditChange('city', e.target.value)} />
                            <input type="text" className="form-control form-control-sm mb-1" placeholder="行政區" 
                              value={editData.district || ''} onChange={(e) => handleEditChange('district', e.target.value)} />
                            <input type="text" className="form-control form-control-sm" placeholder="詳細地址" 
                              value={editData.address || ''} onChange={(e) => handleEditChange('address', e.target.value)} />
                          </div>
                        ) : `${registration.postalCode} ${registration.city} ${registration.district} ${registration.address}`}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>資訊來源：</strong> {isEditing ? (
                          <input type="text" className="form-control form-control-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.infoSource || ''} onChange={(e) => handleEditChange('infoSource', e.target.value)} />
                        ) : registration.infoSource}
                      </div>
                    </div>
                    
                    {/* 顯示請修正或報名失敗的原因 */}
                    {(registration.status === 'revision' || registration.status === 'failed') && (
                      <div className="row mt-3">
                        <div className="col-12">
                          <div className={`alert ${registration.status === 'revision' ? 'alert-warning' : 'alert-danger'}`}>
                            <h6 className="mb-2">
                              <i className={`fas fa-${registration.status === 'revision' ? 'exclamation-triangle' : 'times-circle'} me-2`}></i>
                              {registration.status === 'revision' ? '請修正原因' : '報名失敗原因'}
                            </h6>
                            {registration.rejectionReasons && (
                              <div className="mb-2">
                                <strong>原因：</strong>
                                <ul className="mb-0 mt-2">
                                  {Array.isArray(registration.rejectionReasons) ? (
                                    registration.rejectionReasons.map((reason, index) => {
                                      const reasonText = getRejectionReasonText(reason);
                                      return (
                                        <li key={index}>
                                          {reasonText}
                                          {reason !== '其他' && reasonText === reason && (
                                            <span className="text-muted ms-2">({reason})</span>
                                          )}
                                        </li>
                                      );
                                    })
                                  ) : (
                                    <li>
                                      {getRejectionReasonText(registration.rejectionReasons)}
                                      {registration.rejectionReasons !== '其他' && getRejectionReasonText(registration.rejectionReasons) === registration.rejectionReasons && (
                                        <span className="text-muted ms-2">({registration.rejectionReasons})</span>
                                      )}
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                            {registration.rejectionOther && (
                              <div className="mb-0">
                                <strong>其他說明：</strong> {registration.rejectionOther}
                              </div>
                            )}
                            {(!registration.rejectionReasons && !registration.rejectionOther) && (
                              <div className="text-muted">無詳細說明</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 學籍資訊 */}
                {activeTab === 'academic' && (
                  <div className="tab-pane fade show active">
                    {isEditing && (
                      <div className="alert alert-warning mb-3">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        <strong>後台編輯模式</strong>：您正在修改報名資料，修改後請點擊「儲存」按鈕。
                      </div>
                    )}
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <strong>學院：</strong> {isEditing ? (
                          <input type="text" className="form-control form-control-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.college || ''} onChange={(e) => handleEditChange('college', e.target.value)} />
                        ) : registration.college}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>科系：</strong> {isEditing ? (
                          <input type="text" className="form-control form-control-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.department || ''} onChange={(e) => handleEditChange('department', e.target.value)} />
                        ) : registration.department}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>年級：</strong> {isEditing ? (
                          <input type="text" className="form-control form-control-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.grade || ''} onChange={(e) => handleEditChange('grade', e.target.value)} />
                        ) : registration.grade}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>就讀身分：</strong> {isEditing ? (
                          <select className="form-select form-select-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.degreeLevel || ''} onChange={(e) => handleEditChange('degreeLevel', e.target.value)}>
                            <option value="">請選擇</option>
                            <option value="學士班">學士班</option>
                            <option value="碩士班">碩士班</option>
                            <option value="博士班">博士班</option>
                          </select>
                        ) : registration.degreeLevel}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>是否曾報考 BESTEP：</strong> {isEditing ? (
                          <select className="form-select form-select-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.hasTakenBESTEP || ''} onChange={(e) => handleEditChange('hasTakenBESTEP', e.target.value)}>
                            <option value="">請選擇</option>
                            <option value="是">是</option>
                            <option value="否">否</option>
                          </select>
                        ) : registration.hasTakenBESTEP}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>是否取得 CEFR B2：</strong> {isEditing ? (
                          <select className="form-select form-select-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.hasCEFRB2 || ''} onChange={(e) => handleEditChange('hasCEFRB2', e.target.value)}>
                            <option value="">請選擇</option>
                            <option value="是">是</option>
                            <option value="否">否</option>
                          </select>
                        ) : registration.hasCEFRB2}
                      </div>
                      {(isEditing ? editData.hasCEFRB2 : registration.hasCEFRB2) === '是' && (
                        <>
                          <div className="col-md-6 mb-3">
                            <strong>已通過測驗種類：</strong>
                            {isEditing ? (
                              <input type="text" className="form-control form-control-sm d-inline-block" style={{ width: 'auto' }} 
                                value={Array.isArray(editData.passedExamTypes) ? editData.passedExamTypes.join(', ') : (editData.passedExamTypes || '')} 
                                onChange={(e) => handleEditChange('passedExamTypes', e.target.value.split(',').map(s => s.trim()).filter(s => s))} 
                                placeholder="以逗號分隔" />
                            ) : (
                              registration.passedExamTypes && Array.isArray(registration.passedExamTypes) 
                                ? registration.passedExamTypes.join(', ')
                                : '無'
                            )}
                          </div>
                          <div className="col-md-6 mb-3">
                            <strong>B2 項目：</strong> {isEditing ? (
                              <input type="text" className="form-control form-control-sm d-inline-block" style={{ width: 'auto' }} 
                                value={editData.b2SkillType || ''} onChange={(e) => handleEditChange('b2SkillType', e.target.value)} />
                            ) : (registration.b2SkillType || '無')}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 特殊身分 */}
                {activeTab === 'special' && (
                  <div className="tab-pane fade show active">
                    {isEditing && (
                      <div className="alert alert-warning mb-3">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        <strong>後台編輯模式</strong>：您正在修改報名資料，修改後請點擊「儲存」按鈕。
                      </div>
                    )}
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <strong>中低收入戶：</strong> {isEditing ? (
                          <select className="form-select form-select-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.isLowIncome || ''} onChange={(e) => handleEditChange('isLowIncome', e.target.value)}>
                            <option value="">請選擇</option>
                            <option value="否">否</option>
                            <option value="中低收入戶">中低收入戶</option>
                            <option value="低收入戶">低收入戶</option>
                          </select>
                        ) : registration.isLowIncome}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>身心障礙手冊：</strong> {isEditing ? (
                          <select className="form-select form-select-sm d-inline-block" style={{ width: 'auto' }} 
                            value={editData.hasDisabilityCard || ''} onChange={(e) => handleEditChange('hasDisabilityCard', e.target.value)}>
                            <option value="">請選擇</option>
                            <option value="是">是</option>
                            <option value="否">否</option>
                          </select>
                        ) : registration.hasDisabilityCard}
                      </div>
                      {(isEditing ? editData.hasDisabilityCard : registration.hasDisabilityCard) === '是' && (
                        <>
                          <div className="col-12 mb-3">
                            <strong>身心障礙類別：</strong>
                            {isEditing ? (
                              <input type="text" className="form-control form-control-sm d-inline-block" style={{ width: 'auto' }} 
                                value={Array.isArray(editData.disabilityTypes) ? editData.disabilityTypes.join(', ') : (editData.disabilityTypes || '')} 
                                onChange={(e) => handleEditChange('disabilityTypes', e.target.value.split(',').map(s => s.trim()).filter(s => s))} 
                                placeholder="以逗號分隔" />
                            ) : (
                              registration.disabilityTypes && Array.isArray(registration.disabilityTypes)
                                ? registration.disabilityTypes.join(', ')
                                : '無'
                            )}
                          </div>
                          <div className="col-12 mb-3">
                            <strong>考試協助項目：</strong>
                            {isEditing ? (
                              <input type="text" className="form-control form-control-sm d-inline-block" style={{ width: 'auto' }} 
                                value={Array.isArray(editData.examAssistanceOptions) ? editData.examAssistanceOptions.join(', ') : (editData.examAssistanceOptions || '')} 
                                onChange={(e) => handleEditChange('examAssistanceOptions', e.target.value.split(',').map(s => s.trim()).filter(s => s))} 
                                placeholder="以逗號分隔" />
                            ) : (
                              registration.examAssistanceOptions && Array.isArray(registration.examAssistanceOptions)
                                ? registration.examAssistanceOptions.join(', ')
                                : '無'
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 選考資料（報考項目） */}
                {activeTab === 'exam' && (
                  <div className="tab-pane fade show active">
                    {isEditing && (
                      <div className="alert alert-warning mb-3">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        <strong>後台編輯模式</strong>：您正在修改報名資料，修改後請點擊「儲存」按鈕。
                      </div>
                    )}
                    <div className="row">
                      {/* 報考項目 */}
                      <div className="col-md-6 mb-3">
                        <div className="card border-primary">
                          <div className="card-header bg-primary text-white">
                            <strong>報考項目</strong>
                          </div>
                          <div className="card-body">
                            {isEditing ? (
                              <select
                                className="form-select"
                                value={editData.examType || ''}
                                onChange={(e) => handleEditChange('examType', e.target.value)}
                              >
                                <option value="">請選擇</option>
                                <option value="LRSW">四項全考（LRSW）</option>
                                <option value="LR">聽讀（LR）</option>
                                <option value="SW">說寫（SW）</option>
                                <option value="NON">不報考（NON）</option>
                              </select>
                            ) : (
                              <div>
                                <strong>報考項目：</strong>
                                <span className="badge bg-info ms-2">
                                  {
                                    (isEditing ? editData.examType : registration.examType) === 'LRSW' ? '四項全考' :
                                    (isEditing ? editData.examType : registration.examType) === 'LR' ? '聽讀' :
                                    (isEditing ? editData.examType : registration.examType) === 'SW' ? '說寫' :
                                    (isEditing ? editData.examType : registration.examType) === 'NON' ? '不報考' :
                                    (isEditing ? editData.examType : registration.examType) || '未填寫'
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 是否取得 CEFR B2 */}
                      <div className="col-md-6 mb-3">
                        <div className="card border-success">
                          <div className="card-header bg-success text-white">
                            <strong>CEFR B2 資格</strong>
                          </div>
                          <div className="card-body">
                            {isEditing ? (
                              <select
                                className="form-select"
                                value={editData.hasCEFRB2 || ''}
                                onChange={(e) => handleEditChange('hasCEFRB2', e.target.value)}
                              >
                                <option value="">請選擇</option>
                                <option value="是">是</option>
                                <option value="否">否</option>
                              </select>
                            ) : (
                              <div>
                                <strong>是否取得 CEFR B2：</strong>
                                <span className={`badge ms-2 ${(isEditing ? editData.hasCEFRB2 : registration.hasCEFRB2) === '是' ? 'bg-success' : 'bg-secondary'}`}>
                                  {(isEditing ? editData.hasCEFRB2 : registration.hasCEFRB2) || '未填寫'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 各項成績（僅在 hasCEFRB2 === '是' 時顯示） */}
                      {(isEditing ? editData.hasCEFRB2 : registration.hasCEFRB2) === '是' && (
                        <>
                          {/* 聽力成績 */}
                          {((isEditing ? editData.listeningExamType : registration.listeningExamType) || 
                            (isEditing ? editData.listeningScore : registration.listeningScore)) && (
                            <div className="col-md-6 mb-3">
                              <div className="card border-primary">
                                <div className="card-header bg-primary text-white">
                                  <strong>聽力成績</strong>
                                </div>
                                <div className="card-body">
                                  <div className="mb-2">
                                    <strong>測驗類別：</strong> 
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={editData.listeningExamType || ''}
                                        onChange={(e) => handleEditChange('listeningExamType', e.target.value)}
                                      />
                                    ) : (
                                      <span>{registration.listeningExamType || '未填寫'}</span>
                                    )}
                                  </div>
                                  <div>
                                    <strong>成績：</strong>
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={editData.listeningScore || ''}
                                        onChange={(e) => handleEditChange('listeningScore', e.target.value)}
                                      />
                                    ) : (
                                      <span className="badge bg-info">{registration.listeningScore || '未填寫'}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 閱讀成績 */}
                          {((isEditing ? editData.readingExamType : registration.readingExamType) || 
                            (isEditing ? editData.readingScore : registration.readingScore)) && (
                            <div className="col-md-6 mb-3">
                              <div className="card border-success">
                                <div className="card-header bg-success text-white">
                                  <strong>閱讀成績</strong>
                                </div>
                                <div className="card-body">
                                  <div className="mb-2">
                                    <strong>測驗類別：</strong>
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={editData.readingExamType || ''}
                                        onChange={(e) => handleEditChange('readingExamType', e.target.value)}
                                      />
                                    ) : (
                                      <span>{registration.readingExamType || '未填寫'}</span>
                                    )}
                                  </div>
                                  <div>
                                    <strong>成績：</strong>
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={editData.readingScore || ''}
                                        onChange={(e) => handleEditChange('readingScore', e.target.value)}
                                      />
                                    ) : (
                                      <span className="badge bg-info">{registration.readingScore || '未填寫'}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 口說成績 */}
                          {((isEditing ? editData.speakingExamType : registration.speakingExamType) || 
                            (isEditing ? editData.speakingScore : registration.speakingScore)) && (
                            <div className="col-md-6 mb-3">
                              <div className="card border-warning">
                                <div className="card-header bg-warning text-dark">
                                  <strong>口說成績</strong>
                                </div>
                                <div className="card-body">
                                  <div className="mb-2">
                                    <strong>測驗類別：</strong>
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={editData.speakingExamType || ''}
                                        onChange={(e) => handleEditChange('speakingExamType', e.target.value)}
                                      />
                                    ) : (
                                      <span>{registration.speakingExamType || '未填寫'}</span>
                                    )}
                                  </div>
                                  <div>
                                    <strong>成績：</strong>
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={editData.speakingScore || ''}
                                        onChange={(e) => handleEditChange('speakingScore', e.target.value)}
                                      />
                                    ) : (
                                      <span className="badge bg-info">{registration.speakingScore || '未填寫'}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 寫作成績 */}
                          {((isEditing ? editData.writingExamType : registration.writingExamType) || 
                            (isEditing ? editData.writingScore : registration.writingScore)) && (
                            <div className="col-md-6 mb-3">
                              <div className="card border-danger">
                                <div className="card-header bg-danger text-white">
                                  <strong>寫作成績</strong>
                                </div>
                                <div className="card-body">
                                  <div className="mb-2">
                                    <strong>測驗類別：</strong>
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={editData.writingExamType || ''}
                                        onChange={(e) => handleEditChange('writingExamType', e.target.value)}
                                      />
                                    ) : (
                                      <span>{registration.writingExamType || '未填寫'}</span>
                                    )}
                                  </div>
                                  <div>
                                    <strong>成績：</strong>
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={editData.writingScore || ''}
                                        onChange={(e) => handleEditChange('writingScore', e.target.value)}
                                      />
                                    ) : (
                                      <span className="badge bg-info">{registration.writingScore || '未填寫'}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 如果沒有任何成績資料，在編輯模式下顯示添加按鈕 */}
                          {!(isEditing ? editData.listeningExamType : registration.listeningExamType) && 
                           !(isEditing ? editData.readingExamType : registration.readingExamType) && 
                           !(isEditing ? editData.speakingExamType : registration.speakingExamType) && 
                           !(isEditing ? editData.writingExamType : registration.writingExamType) && (
                            <div className="col-12">
                              {isEditing ? (
                                <div className="alert alert-info">
                                  <i className="fas fa-info-circle me-2"></i>
                                  編輯模式下可以填寫選考成績資料
                                </div>
                              ) : (
                                <div className="alert alert-info">
                                  <i className="fas fa-info-circle me-2"></i>
                                  尚未填寫任何選考成績資料
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* 編輯模式下，顯示所有四個項目的輸入框（即使原本沒有資料） */}
                          {isEditing && (
                            <>
                              {/* 聽力成績（編輯模式，即使原本沒有也顯示） */}
                              {!(editData.listeningExamType || editData.listeningScore) && (
                                <div className="col-md-6 mb-3">
                                  <div className="card border-primary">
                                    <div className="card-header bg-primary text-white">
                                      <strong>聽力成績</strong>
                                    </div>
                                    <div className="card-body">
                                      <div className="mb-2">
                                        <strong>測驗類別：</strong>
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          value={editData.listeningExamType || ''}
                                          onChange={(e) => handleEditChange('listeningExamType', e.target.value)}
                                          placeholder="例如：TOEIC Listening & Reading"
                                        />
                                      </div>
                                      <div>
                                        <strong>成績：</strong>
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          value={editData.listeningScore || ''}
                                          onChange={(e) => handleEditChange('listeningScore', e.target.value)}
                                          placeholder="請輸入成績"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* 閱讀成績（編輯模式，即使原本沒有也顯示） */}
                              {!(editData.readingExamType || editData.readingScore) && (
                                <div className="col-md-6 mb-3">
                                  <div className="card border-success">
                                    <div className="card-header bg-success text-white">
                                      <strong>閱讀成績</strong>
                                    </div>
                                    <div className="card-body">
                                      <div className="mb-2">
                                        <strong>測驗類別：</strong>
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          value={editData.readingExamType || ''}
                                          onChange={(e) => handleEditChange('readingExamType', e.target.value)}
                                          placeholder="例如：TOEIC Listening & Reading"
                                        />
                                      </div>
                                      <div>
                                        <strong>成績：</strong>
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          value={editData.readingScore || ''}
                                          onChange={(e) => handleEditChange('readingScore', e.target.value)}
                                          placeholder="請輸入成績"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* 口說成績（編輯模式，即使原本沒有也顯示） */}
                              {!(editData.speakingExamType || editData.speakingScore) && (
                                <div className="col-md-6 mb-3">
                                  <div className="card border-warning">
                                    <div className="card-header bg-warning text-dark">
                                      <strong>口說成績</strong>
                                    </div>
                                    <div className="card-body">
                                      <div className="mb-2">
                                        <strong>測驗類別：</strong>
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          value={editData.speakingExamType || ''}
                                          onChange={(e) => handleEditChange('speakingExamType', e.target.value)}
                                          placeholder="例如：TOEIC Speaking & Writing"
                                        />
                                      </div>
                                      <div>
                                        <strong>成績：</strong>
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          value={editData.speakingScore || ''}
                                          onChange={(e) => handleEditChange('speakingScore', e.target.value)}
                                          placeholder="請輸入成績"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* 寫作成績（編輯模式，即使原本沒有也顯示） */}
                              {!(editData.writingExamType || editData.writingScore) && (
                                <div className="col-md-6 mb-3">
                                  <div className="card border-danger">
                                    <div className="card-header bg-danger text-white">
                                      <strong>寫作成績</strong>
                                    </div>
                                    <div className="card-body">
                                      <div className="mb-2">
                                        <strong>測驗類別：</strong>
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          value={editData.writingExamType || ''}
                                          onChange={(e) => handleEditChange('writingExamType', e.target.value)}
                                          placeholder="例如：TOEIC Speaking & Writing"
                                        />
                                      </div>
                                      <div>
                                        <strong>成績：</strong>
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          value={editData.writingScore || ''}
                                          onChange={(e) => handleEditChange('writingScore', e.target.value)}
                                          placeholder="請輸入成績"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                      {(isEditing ? editData.hasCEFRB2 : registration.hasCEFRB2) !== '是' && (
                        <div className="col-12">
                          <div className="alert alert-warning">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            此報名者未取得 CEFR B2 以上成績，無選考資料
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 檔案附件 */}
                {activeTab === 'files' && (
                  <div className="tab-pane fade show active">
                    {isEditing && onUploadRegistrationFiles && (
                      <div className="alert alert-info mb-3">
                        <i className="fas fa-info-circle me-2"></i>
                        <strong>後台編輯</strong>：可在此更換或新增證件照、B2 成績證明、身心障礙證明，選好檔案後點擊下方「儲存」一併送出。
                      </div>
                    )}

                    {/* 證件照 */}
                    <div className="mb-4">
                      <h6 className="mb-3">證件照</h6>
                      {!isEditing && registration.idPhoto && (
                        <PhotoViewer imageUrl={registration.idPhoto} alt="證件照" />
                      )}
                      {isEditing && onUploadRegistrationFiles && (
                        <div>
                          {registration.idPhoto && (
                            <div className="mb-2">
                              <span className="text-muted me-2">目前：</span>
                              <a href={`/uploads/${registration.idPhoto}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm me-2">查看</a>
                            </div>
                          )}
                          <label className="btn btn-outline-primary btn-sm mb-0">
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              className="d-none"
                              onChange={(e) => handleFileInputChange('idPhoto', e.target.files?.[0])}
                            />
                            {registration.idPhoto ? '更換證件照' : '新增證件照'}
                          </label>
                          {editFileInputs.idPhoto && <span className="ms-2 text-success small">已選：{editFileInputs.idPhoto.name}</span>}
                        </div>
                      )}
                      {!isEditing && !registration.idPhoto && <span className="text-muted">無</span>}
                    </div>

                    {/* B2 成績證明 */}
                    <div className="mb-4">
                      <h6 className="mb-3">B2 成績證明</h6>
                      {!isEditing && registration.b2CertificateFile && (() => {
                        let b2Files = [];
                        try {
                          const parsed = typeof registration.b2CertificateFile === 'string' ? JSON.parse(registration.b2CertificateFile) : registration.b2CertificateFile;
                          b2Files = Array.isArray(parsed) ? parsed : [parsed];
                        } catch (e) {
                          b2Files = [registration.b2CertificateFile];
                        }
                        return (
                          <div>
                            {b2Files.map((file, index) => (
                              <a key={index} href={`/uploads/${file}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary me-2 mb-2">
                                <i className="fas fa-file-pdf me-1"></i>查看檔案 {b2Files.length > 1 ? `(${index + 1})` : ''}
                              </a>
                            ))}
                          </div>
                        );
                      })()}
                      {isEditing && onUploadRegistrationFiles && (
                        <div>
                          {registration.b2CertificateFile && (() => {
                            let b2First = registration.b2CertificateFile;
                            try {
                              const p = typeof registration.b2CertificateFile === 'string' ? JSON.parse(registration.b2CertificateFile) : registration.b2CertificateFile;
                              b2First = Array.isArray(p) ? p[0] : p;
                            } catch (e) { /* use as-is */ }
                            return (
                              <div className="mb-2">
                                <span className="text-muted me-2">目前：</span>
                                <a href={`/uploads/${b2First}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm me-2">查看</a>
                              </div>
                            );
                          })()}
                          <label className="btn btn-outline-primary btn-sm mb-0">
                            <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="d-none" onChange={(e) => handleFileInputChange('b2CertificateFile', e.target.files?.[0])} />
                            {registration.b2CertificateFile ? '更換 B2 成績證明' : '新增 B2 成績證明'}
                          </label>
                          {editFileInputs.b2CertificateFile && <span className="ms-2 text-success small">已選：{editFileInputs.b2CertificateFile.name}</span>}
                        </div>
                      )}
                      {!isEditing && !registration.b2CertificateFile && <span className="text-muted">無</span>}
                    </div>

                    {/* 身心障礙證明 */}
                    <div className="mb-4">
                      <h6 className="mb-3">身心障礙證明</h6>
                      {!isEditing && (registration.disabilityCertFront || registration.disabilityCertBack) && (
                        <div className="d-flex gap-2">
                          {registration.disabilityCertFront && (
                            <a href={`/uploads/${registration.disabilityCertFront}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary"><i className="fas fa-file me-1"></i>正面</a>
                          )}
                          {registration.disabilityCertBack && (
                            <a href={`/uploads/${registration.disabilityCertBack}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary"><i className="fas fa-file me-1"></i>反面</a>
                          )}
                        </div>
                      )}
                      {isEditing && onUploadRegistrationFiles && (
                        <div className="d-flex flex-wrap gap-3">
                          <div>
                            <span className="d-block small text-muted mb-1">正面</span>
                            {registration.disabilityCertFront && (
                              <a href={`/uploads/${registration.disabilityCertFront}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm me-2">查看</a>
                            )}
                            <label className="btn btn-outline-primary btn-sm mb-0">
                              <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="d-none" onChange={(e) => handleFileInputChange('disabilityCertFront', e.target.files?.[0])} />
                              {registration.disabilityCertFront ? '更換' : '新增'}
                            </label>
                            {editFileInputs.disabilityCertFront && <span className="ms-2 text-success small">已選</span>}
                          </div>
                          <div>
                            <span className="d-block small text-muted mb-1">反面</span>
                            {registration.disabilityCertBack && (
                              <a href={`/uploads/${registration.disabilityCertBack}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm me-2">查看</a>
                            )}
                            <label className="btn btn-outline-primary btn-sm mb-0">
                              <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="d-none" onChange={(e) => handleFileInputChange('disabilityCertBack', e.target.files?.[0])} />
                              {registration.disabilityCertBack ? '更換' : '新增'}
                            </label>
                            {editFileInputs.disabilityCertBack && <span className="ms-2 text-success small">已選</span>}
                          </div>
                        </div>
                      )}
                      {!isEditing && !registration.disabilityCertFront && !registration.disabilityCertBack && <span className="text-muted">無</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer d-flex justify-content-between flex-wrap gap-2">
              <div className="d-flex gap-2 flex-wrap">
                {/* 狀態修改下拉選單 */}
                {onQuickStatusUpdate && (
                  <div className="dropdown" ref={statusDropdownRef} style={{ position: 'relative' }}>
                    <button
                      ref={statusDropdownButtonRef}
                      className="btn btn-outline-primary dropdown-toggle"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowStatusDropdown(!showStatusDropdown);
                      }}
                      aria-expanded={showStatusDropdown}
                    >
                      <i className="fas fa-edit me-1"></i>
                      修改狀態
                    </button>
                    {showStatusDropdown && (
                      <div 
                        className="dropdown-menu show" 
                        style={{ 
                          display: 'block', 
                          position: 'absolute', 
                          top: dropdownPosition.top,
                          bottom: dropdownPosition.bottom,
                          left: dropdownPosition.left,
                          right: dropdownPosition.right,
                          zIndex: 1050,
                          minWidth: '200px',
                          maxWidth: '300px',
                          maxHeight: dropdownPosition.maxHeight || 'none',
                          overflowY: dropdownPosition.maxHeight ? 'auto' : 'visible',
                          backgroundColor: 'white',
                          border: '1px solid rgba(0,0,0,.15)',
                          borderRadius: '0.25rem',
                          boxShadow: '0 0.5rem 1rem rgba(0,0,0,.175)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="dropdown-item"
                          type="button"
                          onClick={() => handleStatusChange('pending')}
                          disabled={registration.status === 'pending'}
                          style={{ 
                            width: '100%', 
                            textAlign: 'left', 
                            padding: '0.5rem 1rem',
                            border: 'none',
                            backgroundColor: registration.status === 'pending' ? '#f8f9fa' : 'transparent',
                            cursor: registration.status === 'pending' ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <i className="fas fa-clock me-2"></i>
                          審核中
                        </button>
                        <button
                          className="dropdown-item"
                          type="button"
                          onClick={() => handleStatusChange('approved')}
                          disabled={registration.status === 'approved'}
                          style={{ 
                            width: '100%', 
                            textAlign: 'left', 
                            padding: '0.5rem 1rem',
                            border: 'none',
                            backgroundColor: registration.status === 'approved' ? '#f8f9fa' : 'transparent',
                            cursor: registration.status === 'approved' ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <i className="fas fa-check-circle me-2 text-success"></i>
                          已通過
                        </button>
                        <button
                          className="dropdown-item"
                          type="button"
                          onClick={() => handleStatusChange('revision')}
                          disabled={registration.status === 'revision'}
                          style={{ 
                            width: '100%', 
                            textAlign: 'left', 
                            padding: '0.5rem 1rem',
                            border: 'none',
                            backgroundColor: registration.status === 'revision' ? '#f8f9fa' : 'transparent',
                            cursor: registration.status === 'revision' ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <i className="fas fa-exclamation-triangle me-2 text-danger"></i>
                          請修正
                        </button>
                        <button
                          className="dropdown-item"
                          type="button"
                          onClick={() => {
                            confirm({
                              title: '確認更新狀態？',
                              description: '確定要將此筆設為「報名成功」嗎？',
                              confirmText: '更新',
                              cancelText: '取消',
                              variant: 'warning',
                            }).then((ok) => {
                              if (!ok) return;
                              handleStatusChange('success');
                            });
                          }}
                          disabled={registration.status === 'success'}
                          style={{ 
                            width: '100%', 
                            textAlign: 'left', 
                            padding: '0.5rem 1rem',
                            border: 'none',
                            backgroundColor: registration.status === 'success' ? '#f8f9fa' : 'transparent',
                            cursor: registration.status === 'success' ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <i className="fas fa-flag-checkered me-2 text-success"></i>
                          報名成功
                        </button>
                        <button
                          className="dropdown-item"
                          type="button"
                          onClick={() => {
                            confirm({
                              title: '確認更新狀態？',
                              description: '確定要將此筆設為「報名失敗」嗎？',
                              confirmText: '更新',
                              cancelText: '取消',
                              variant: 'warning',
                            }).then((ok) => {
                              if (!ok) return;
                              handleStatusChange('failed');
                            });
                          }}
                          disabled={registration.status === 'failed'}
                          style={{ 
                            width: '100%', 
                            textAlign: 'left', 
                            padding: '0.5rem 1rem',
                            border: 'none',
                            backgroundColor: registration.status === 'failed' ? '#f8f9fa' : 'transparent',
                            cursor: registration.status === 'failed' ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <i className="fas fa-times-circle me-2 text-secondary"></i>
                          報名失敗
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 後台修改資料按鈕（特別標記） */}
                {onUpdateRegistration && token && (
                  <>
                    {!isEditing ? (
                      <button
                        type="button"
                        className="btn btn-warning"
                        onClick={handleStartEdit}
                        title="後台管理員專用：修改報名資料"
                      >
                        <i className="fas fa-edit me-1"></i>
                        <span className="badge bg-danger me-1">後台</span>
                        編輯資料
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={handleSaveEdit}
                        >
                          <i className="fas fa-save me-1"></i>
                          儲存
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleCancelEdit}
                        >
                          <i className="fas fa-times me-1"></i>
                          取消
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 手機：Accordion 版本
  return (
    <div
      className="modal fade show"
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-dialog modal-dialog-scrollable" style={{ margin: '0.5rem' }}>
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <div className="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
              <h5 className="modal-title mb-0">
                {registration.name}
              </h5>
              <div className="d-flex gap-2 align-items-center flex-shrink-0">
                {registration.status === 'success' && registration.successSequence && (
                  <span className="badge bg-info" title="報名成功序號">
                    序號：{registration.successSequence}
                  </span>
                )}
                <span className={`badge bg-${getStatusText(registration.status).class}`}>
                  {getStatusText(registration.status).text}
                </span>
                {registration.status === 'success' && onAdjustSequence && (
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      type="button"
                      className="btn btn-outline-light"
                      onClick={() => onAdjustSequence(registration.id, 'up')}
                      disabled={adjustingSequence}
                      title="上移一位"
                      aria-label="上移一位"
                    >
                      {adjustingSequence ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        <i className="fas fa-arrow-up"></i>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-light"
                      onClick={() => onAdjustSequence(registration.id, 'down')}
                      disabled={adjustingSequence}
                      title="下移一位"
                      aria-label="下移一位"
                    >
                      {adjustingSequence ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        <i className="fas fa-arrow-down"></i>
                      )}
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={onClose}
                  aria-label="關閉"
                ></button>
              </div>
            </div>
          </div>
          
          <div className="modal-body">
            {/* Accordion 可摺疊區塊 */}
            <div className="accordion" id="detailAccordion">
              {/* 基本資料 */}
              <div className="accordion-item">
                <h2 className="accordion-header">
                  <button
                    className={`accordion-button ${expandedSections.basic ? '' : 'collapsed'}`}
                    type="button"
                    onClick={() => toggleSection('basic')}
                  >
                    <i className="fas fa-user me-2"></i>
                    基本資料
                  </button>
                </h2>
                <div className={`accordion-collapse collapse ${expandedSections.basic ? 'show' : ''}`}>
                  <div className="accordion-body">
                    <div className="mb-2"><strong>學號：</strong> {registration.studentId}</div>
                    <div className="mb-2"><strong>姓名：</strong> {registration.name}</div>
                    <div className="mb-2"><strong>身分證字號：</strong> {registration.idNumber || registration.nationalId || '-'}</div>
                    <div className="mb-2"><strong>Email：</strong> {registration.email}</div>
                    <div className="mb-2"><strong>電話：</strong> {registration.phone}</div>
                    <div className="mb-2"><strong>出生日期：</strong> {registration.birthDate}</div>
                    <div className="mb-2"><strong>英文姓名：</strong> {registration.lastNameEn} {registration.firstNameEn}</div>
                    <div className="mb-2"><strong>地址：</strong> {registration.postalCode} {registration.city} {registration.district} {registration.address}</div>
                    <div className="mb-2"><strong>資訊來源：</strong> {registration.infoSource}</div>
                    
                    {/* 顯示請修正或報名失敗的原因 */}
                    {(registration.status === 'revision' || registration.status === 'failed') && (
                      <div className="mt-3 pt-3 border-top">
                        <div className={`alert ${registration.status === 'revision' ? 'alert-warning' : 'alert-danger'} mb-0`}>
                          <h6 className="mb-2">
                            <i className={`fas fa-${registration.status === 'revision' ? 'exclamation-triangle' : 'times-circle'} me-2`}></i>
                            {registration.status === 'revision' ? '請修正原因' : '報名失敗原因'}
                          </h6>
                          {registration.rejectionReasons && (
                            <div className="mb-2">
                              <strong>原因：</strong>
                              <ul className="mb-0 mt-2">
                                {Array.isArray(registration.rejectionReasons) ? (
                                  registration.rejectionReasons.map((reason, index) => {
                                    const reasonText = getRejectionReasonText(reason);
                                    return (
                                      <li key={index}>
                                        {reasonText}
                                        {reason !== '其他' && reasonText === reason && (
                                          <span className="text-muted ms-2">({reason})</span>
                                        )}
                                      </li>
                                    );
                                  })
                                ) : (
                                  <li>
                                    {getRejectionReasonText(registration.rejectionReasons)}
                                    {registration.rejectionReasons !== '其他' && getRejectionReasonText(registration.rejectionReasons) === registration.rejectionReasons && (
                                      <span className="text-muted ms-2">({registration.rejectionReasons})</span>
                                    )}
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                          {registration.rejectionOther && (
                            <div className="mb-0">
                              <strong>其他說明：</strong> {registration.rejectionOther}
                            </div>
                          )}
                          {(!registration.rejectionReasons && !registration.rejectionOther) && (
                            <div className="text-muted">無詳細說明</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 學籍資訊 */}
              <div className="accordion-item">
                <h2 className="accordion-header">
                  <button
                    className={`accordion-button collapsed`}
                    type="button"
                    onClick={() => toggleSection('academic')}
                  >
                    <i className="fas fa-graduation-cap me-2"></i>
                    學籍資訊
                  </button>
                </h2>
                <div className={`accordion-collapse collapse ${expandedSections.academic ? 'show' : ''}`}>
                  <div className="accordion-body">
                    <div className="mb-2"><strong>學院：</strong> {registration.college}</div>
                    <div className="mb-2"><strong>科系：</strong> {registration.department}</div>
                    <div className="mb-2"><strong>年級：</strong> {registration.grade}</div>
                    <div className="mb-2"><strong>就讀身分：</strong> {registration.degreeLevel}</div>
                    <div className="mb-2">
                      <strong>報考項目：</strong> {
                        registration.examType === 'LRSW' ? '四項全考' :
                        registration.examType === 'LR' ? '聽讀' :
                        registration.examType === 'SW' ? '說寫' :
                        registration.examType === 'NON' ? '不報考' :
                        registration.examType || '未填寫'
                      }
                    </div>
                    <div className="mb-2"><strong>是否曾報考 BESTEP：</strong> {registration.hasTakenBESTEP}</div>
                    <div className="mb-2"><strong>是否取得 CEFR B2：</strong> {registration.hasCEFRB2}</div>
                    {registration.hasCEFRB2 === '是' && (
                      <>
                        <div className="mb-2">
                          <strong>已通過測驗種類：</strong>
                          {registration.passedExamTypes && Array.isArray(registration.passedExamTypes) 
                            ? registration.passedExamTypes.join(', ')
                            : '無'}
                        </div>
                        <div className="mb-2"><strong>B2 項目：</strong> {registration.b2SkillType || '無'}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 特殊身分 */}
              <div className="accordion-item">
                <h2 className="accordion-header">
                  <button
                    className={`accordion-button collapsed`}
                    type="button"
                    onClick={() => toggleSection('special')}
                  >
                    <i className="fas fa-heart me-2"></i>
                    特殊身分
                  </button>
                </h2>
                <div className={`accordion-collapse collapse ${expandedSections.special ? 'show' : ''}`}>
                  <div className="accordion-body">
                    <div className="mb-2"><strong>中低收入戶：</strong> {registration.isLowIncome}</div>
                    <div className="mb-2"><strong>身心障礙手冊：</strong> {registration.hasDisabilityCard}</div>
                  </div>
                </div>
              </div>

              {/* 選考資料（報考項目） */}
              <div className="accordion-item">
                <h2 className="accordion-header">
                  <button
                    className={`accordion-button collapsed`}
                    type="button"
                    onClick={() => toggleSection('exam')}
                  >
                    <i className="fas fa-clipboard-list me-2"></i>
                    選考資料
                  </button>
                </h2>
                <div className={`accordion-collapse collapse ${expandedSections.exam ? 'show' : ''}`}>
                  <div className="accordion-body">
                    {/* 報考項目 */}
                    <div className="mb-3 p-2 border border-primary rounded">
                      <strong className="text-primary">報考項目</strong>
                      <div className="mt-2">
                        <div>
                          <strong>報考項目：</strong>
                          <span className="badge bg-info ms-2">
                            {
                              registration.examType === 'LRSW' ? '四項全考' :
                              registration.examType === 'LR' ? '聽讀' :
                              registration.examType === 'SW' ? '說寫' :
                              registration.examType === 'NON' ? '不報考' :
                              registration.examType || '未填寫'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 是否取得 CEFR B2 */}
                    <div className="mb-3 p-2 border border-success rounded">
                      <strong className="text-success">CEFR B2 資格</strong>
                      <div className="mt-2">
                        <div>
                          <strong>是否取得 CEFR B2：</strong>
                          <span className={`badge ms-2 ${registration.hasCEFRB2 === '是' ? 'bg-success' : 'bg-secondary'}`}>
                            {registration.hasCEFRB2 || '未填寫'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 各項成績（僅在 hasCEFRB2 === '是' 時顯示） */}
                    {registration.hasCEFRB2 === '是' && (
                      <>
                        {(registration.listeningExamType || registration.listeningScore) && (
                          <div className="mb-3 p-2 border border-primary rounded">
                            <strong className="text-primary">聽力成績</strong>
                            <div className="mt-2">
                              <div><strong>測驗類別：</strong> {registration.listeningExamType || '未填寫'}</div>
                              <div><strong>成績：</strong> <span className="badge bg-info">{registration.listeningScore || '未填寫'}</span></div>
                            </div>
                          </div>
                        )}
                        {(registration.readingExamType || registration.readingScore) && (
                          <div className="mb-3 p-2 border border-success rounded">
                            <strong className="text-success">閱讀成績</strong>
                            <div className="mt-2">
                              <div><strong>測驗類別：</strong> {registration.readingExamType || '未填寫'}</div>
                              <div><strong>成績：</strong> <span className="badge bg-info">{registration.readingScore || '未填寫'}</span></div>
                            </div>
                          </div>
                        )}
                        {(registration.speakingExamType || registration.speakingScore) && (
                          <div className="mb-3 p-2 border border-warning rounded">
                            <strong className="text-warning">口說成績</strong>
                            <div className="mt-2">
                              <div><strong>測驗類別：</strong> {registration.speakingExamType || '未填寫'}</div>
                              <div><strong>成績：</strong> <span className="badge bg-info">{registration.speakingScore || '未填寫'}</span></div>
                            </div>
                          </div>
                        )}
                        {(registration.writingExamType || registration.writingScore) && (
                          <div className="mb-3 p-2 border border-danger rounded">
                            <strong className="text-danger">寫作成績</strong>
                            <div className="mt-2">
                              <div><strong>測驗類別：</strong> {registration.writingExamType || '未填寫'}</div>
                              <div><strong>成績：</strong> <span className="badge bg-info">{registration.writingScore || '未填寫'}</span></div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 檔案附件 */}
              <div className="accordion-item">
                <h2 className="accordion-header">
                  <button
                    className={`accordion-button collapsed`}
                    type="button"
                    onClick={() => toggleSection('files')}
                  >
                    <i className="fas fa-file me-2"></i>
                    檔案附件
                  </button>
                </h2>
                <div className={`accordion-collapse collapse ${expandedSections.files ? 'show' : ''}`}>
                  <div className="accordion-body">
                    {isEditing && onUploadRegistrationFiles && (
                      <p className="small text-info mb-3">可更換或新增證件照、B2 成績證明、身心障礙證明，選好後點「儲存」一併送出。</p>
                    )}
                    <div className="mb-3">
                      <strong>證件照：</strong>
                      {!isEditing && registration.idPhoto && <PhotoViewer imageUrl={registration.idPhoto} alt="證件照" />}
                      {isEditing && onUploadRegistrationFiles && (
                        <div className="mt-1">
                          {registration.idPhoto && <a href={`/uploads/${registration.idPhoto}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary me-2">查看</a>}
                          <label className="btn btn-sm btn-outline-primary mb-0">
                            <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="d-none" onChange={(e) => handleFileInputChange('idPhoto', e.target.files?.[0])} />
                            {registration.idPhoto ? '更換' : '新增'}
                          </label>
                          {editFileInputs.idPhoto && <span className="ms-2 small text-success">已選</span>}
                        </div>
                      )}
                      {!isEditing && !registration.idPhoto && <span className="text-muted">無</span>}
                    </div>
                    <div className="mb-3">
                      <strong>B2 成績證明：</strong>
                      {!isEditing && registration.b2CertificateFile && (() => {
                        let b2Files = [];
                        try {
                          const parsed = typeof registration.b2CertificateFile === 'string' ? JSON.parse(registration.b2CertificateFile) : registration.b2CertificateFile;
                          b2Files = Array.isArray(parsed) ? parsed : [parsed];
                        } catch (e) { b2Files = [registration.b2CertificateFile]; }
                        return (
                          <div className="d-inline-flex gap-2 ms-2">
                            {b2Files.map((file, i) => (
                              <a key={i} href={`/uploads/${file}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">查看{b2Files.length > 1 ? ` (${i + 1})` : ''}</a>
                            ))}
                          </div>
                        );
                      })()}
                      {isEditing && onUploadRegistrationFiles && (
                        <div className="mt-1">
                          {registration.b2CertificateFile && <a href={`/uploads/${(typeof registration.b2CertificateFile === 'string' ? (() => { try { const p = JSON.parse(registration.b2CertificateFile); return Array.isArray(p) ? p[0] : p; } catch (e) { return registration.b2CertificateFile; } })() : registration.b2CertificateFile)}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary me-2">查看</a>}
                          <label className="btn btn-sm btn-outline-primary mb-0">
                            <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="d-none" onChange={(e) => handleFileInputChange('b2CertificateFile', e.target.files?.[0])} />
                            {registration.b2CertificateFile ? '更換' : '新增'}
                          </label>
                          {editFileInputs.b2CertificateFile && <span className="ms-2 small text-success">已選</span>}
                        </div>
                      )}
                      {!isEditing && !registration.b2CertificateFile && <span className="text-muted">無</span>}
                    </div>
                    <div className="mb-3">
                      <strong>身心障礙證明：</strong>
                      {!isEditing && (registration.disabilityCertFront || registration.disabilityCertBack) && (
                        <div className="d-inline-flex gap-2 ms-2">
                          {registration.disabilityCertFront && <a href={`/uploads/${registration.disabilityCertFront}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">正面</a>}
                          {registration.disabilityCertBack && <a href={`/uploads/${registration.disabilityCertBack}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">反面</a>}
                        </div>
                      )}
                      {isEditing && onUploadRegistrationFiles && (
                        <div className="mt-1 d-flex flex-wrap gap-2">
                          <span className="small">正面：</span>
                          {registration.disabilityCertFront && <a href={`/uploads/${registration.disabilityCertFront}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary">查看</a>}
                          <label className="btn btn-sm btn-outline-primary mb-0"><input type="file" accept=".jpg,.jpeg,.png,.pdf" className="d-none" onChange={(e) => handleFileInputChange('disabilityCertFront', e.target.files?.[0])} />{registration.disabilityCertFront ? '更換' : '新增'}</label>
                          {editFileInputs.disabilityCertFront && <span className="small text-success">已選</span>}
                          <span className="small ms-2">反面：</span>
                          {registration.disabilityCertBack && <a href={`/uploads/${registration.disabilityCertBack}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary">查看</a>}
                          <label className="btn btn-sm btn-outline-primary mb-0"><input type="file" accept=".jpg,.jpeg,.png,.pdf" className="d-none" onChange={(e) => handleFileInputChange('disabilityCertBack', e.target.files?.[0])} />{registration.disabilityCertBack ? '更換' : '新增'}</label>
                          {editFileInputs.disabilityCertBack && <span className="small text-success">已選</span>}
                        </div>
                      )}
                      {!isEditing && !registration.disabilityCertFront && !registration.disabilityCertBack && <span className="text-muted">無</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer d-flex justify-content-between flex-wrap gap-2">
            <div className="d-flex gap-2 flex-wrap">
              {/* 狀態修改下拉選單 */}
              {onQuickStatusUpdate && (
                <div className="dropdown" ref={statusDropdownRef} style={{ position: 'relative' }}>
                  <button
                    ref={statusDropdownButtonRef}
                    className="btn btn-outline-primary btn-sm dropdown-toggle"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStatusDropdown(!showStatusDropdown);
                    }}
                    aria-expanded={showStatusDropdown}
                  >
                    <i className="fas fa-edit me-1"></i>
                    修改狀態
                  </button>
                  {showStatusDropdown && (
                    <div 
                      className="dropdown-menu show" 
                      style={{ 
                        display: 'block', 
                        position: 'absolute', 
                        top: dropdownPosition.top,
                        bottom: dropdownPosition.bottom,
                        left: dropdownPosition.left,
                        right: dropdownPosition.right,
                        zIndex: 1050,
                        minWidth: '200px',
                        maxWidth: '300px',
                        maxHeight: dropdownPosition.maxHeight || 'none',
                        overflowY: dropdownPosition.maxHeight ? 'auto' : 'visible',
                        backgroundColor: 'white',
                        border: '1px solid rgba(0,0,0,.15)',
                        borderRadius: '0.25rem',
                        boxShadow: '0 0.5rem 1rem rgba(0,0,0,.175)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="dropdown-item"
                        type="button"
                        onClick={() => handleStatusChange('pending')}
                        disabled={registration.status === 'pending'}
                        style={{ 
                          width: '100%', 
                          textAlign: 'left', 
                          padding: '0.5rem 1rem',
                          border: 'none',
                          backgroundColor: registration.status === 'pending' ? '#f8f9fa' : 'transparent',
                          cursor: registration.status === 'pending' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <i className="fas fa-clock me-2"></i>審核中
                      </button>
                      <button
                        className="dropdown-item"
                        type="button"
                        onClick={() => handleStatusChange('approved')}
                        disabled={registration.status === 'approved'}
                        style={{ 
                          width: '100%', 
                          textAlign: 'left', 
                          padding: '0.5rem 1rem',
                          border: 'none',
                          backgroundColor: registration.status === 'approved' ? '#f8f9fa' : 'transparent',
                          cursor: registration.status === 'approved' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <i className="fas fa-check-circle me-2 text-success"></i>已通過
                      </button>
                      <button
                        className="dropdown-item"
                        type="button"
                        onClick={() => handleStatusChange('revision')}
                        disabled={registration.status === 'revision'}
                        style={{ 
                          width: '100%', 
                          textAlign: 'left', 
                          padding: '0.5rem 1rem',
                          border: 'none',
                          backgroundColor: registration.status === 'revision' ? '#f8f9fa' : 'transparent',
                          cursor: registration.status === 'revision' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <i className="fas fa-exclamation-triangle me-2 text-danger"></i>請修正
                      </button>
                      <button
                        className="dropdown-item"
                        type="button"
                        onClick={() => {
                          confirm({
                            title: '確認更新狀態？',
                            description: '確定要將此筆設為「報名成功」嗎？',
                            confirmText: '更新',
                            cancelText: '取消',
                            variant: 'warning',
                          }).then((ok) => {
                            if (!ok) return;
                            handleStatusChange('success');
                          });
                        }}
                        disabled={registration.status === 'success'}
                        style={{ 
                          width: '100%', 
                          textAlign: 'left', 
                          padding: '0.5rem 1rem',
                          border: 'none',
                          backgroundColor: registration.status === 'success' ? '#f8f9fa' : 'transparent',
                          cursor: registration.status === 'success' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <i className="fas fa-flag-checkered me-2 text-success"></i>報名成功
                      </button>
                      <button
                        className="dropdown-item"
                        type="button"
                        onClick={() => {
                          confirm({
                            title: '確認更新狀態？',
                            description: '確定要將此筆設為「報名失敗」嗎？',
                            confirmText: '更新',
                            cancelText: '取消',
                            variant: 'warning',
                          }).then((ok) => {
                            if (!ok) return;
                            handleStatusChange('failed');
                          });
                        }}
                        disabled={registration.status === 'failed'}
                        style={{ 
                          width: '100%', 
                          textAlign: 'left', 
                          padding: '0.5rem 1rem',
                          border: 'none',
                          backgroundColor: registration.status === 'failed' ? '#f8f9fa' : 'transparent',
                          cursor: registration.status === 'failed' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <i className="fas fa-times-circle me-2 text-secondary"></i>報名失敗
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* 後台修改資料按鈕（特別標記） */}
              {onUpdateRegistration && token && (
                <>
                  {!isEditing ? (
                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      onClick={handleStartEdit}
                      title="後台管理員專用：修改報名資料"
                    >
                      <i className="fas fa-edit me-1"></i>
                      <span className="badge bg-danger me-1">後台</span>
                      編輯
                    </button>
                  ) : (
                    <>
                      <button type="button" className="btn btn-success btn-sm" onClick={handleSaveEdit}>
                        <i className="fas fa-save me-1"></i>儲存
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelEdit}>
                        <i className="fas fa-times me-1"></i>取消
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
