// src/components/AdminHome.js
// 管理後台：活動列表（/admin/operations）
import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { safeAPICall, showErrorMessage, showSuccessMessage } from '../utils/errorHandler';
import { buildAccessProfile, canAccessEventType, hasPermission } from '../utils/accessControl';
import { P } from '../constants/permissions';
import useConfirm from './ui/useConfirm';

// 新增一個統一的錯誤顯示元件
function ErrorAlert({ error }) {
  if (!error) return null;
  return <div className="alert alert-danger my-2">{error}</div>;
}

// 學期日期範圍判斷函數
function getSemesterInfo(date) {
  const eventDate = new Date(date);
  const year = eventDate.getFullYear();
  const month = eventDate.getMonth() + 1; // getMonth() 返回 0-11
  
  // 113-2學期: 2025/02/01 到 2025/07/31
  if (year === 2025 && month >= 2 && month <= 7) {
    return '113-2';
  }
  // 114-1學期: 2025/08/01 到 2026/01/31
  if ((year === 2025 && month >= 8) || (year === 2026 && month <= 1)) {
    return '114-1';
  }
  // 114-2學期: 2026/02/01 到 2026/07/31
  if (year === 2026 && month >= 2 && month <= 7) {
    return '114-2';
  }
  // 115-1學期: 2026/09/01 到 2027/01/31
  if ((year === 2026 && month >= 9) || (year === 2027 && month <= 1)) {
    return '115-1';
  }
  // 115-2學期: 2027/02/01 到 2027/07/31
  if (year === 2027 && month >= 2 && month <= 7) {
    return '115-2';
  }
  
  return 'other';
}

// 學期選項
function getSemesterOptions() {
  return [
    { value: 'all', label: '全部學期' },
    { value: '113-2', label: '113-2 (2025/02-2025/07)' },
    { value: '114-1', label: '114-1 (2025/08-2026/01)' },
    { value: '114-2', label: '114-2 (2026/02-2026/07)' },
    { value: '115-1', label: '115-1 (2026/09-2027/01)' },
    { value: '115-2', label: '115-2 (2027/02-2027/07)' }
  ];
}

// 活動類型選項
function getEventTypeOptions() {
  return [
    { value: 'all', label: '全部類型' },
    { value: 'English Table', label: 'English Table' },
    { value: 'Job Talk', label: 'Job Talk' },
    { value: 'English Club', label: 'English Club' },
    { value: 'International Forum', label: 'International Forum' },
    { value: '其他', label: '其他' }
  ];
}

function AdminHome() {
  const { token, userRole, accessProfile: ctxProfile } = useOutletContext();
  const accessProfile = ctxProfile || buildAccessProfile(token || '', userRole || '');
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  
  // ===== 活動報表 =====
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(() => {
    // 取得當前學期
    const now = new Date();
    return getSemesterInfo(now.toISOString().split('T')[0]);
  });
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [filterDate, setFilterDate] = useState(() => dayjs().format('YYYY-MM-DD'));

  // ===== 活動管理 =====
  const [addFields, setAddFields] = useState({
    name: '',
    eventType: 'English Table',
    date: '',
    startTime: '',
    endTime: '',
    maxParticipants: 30,
    customEventType: '',
    customReservationRule: ''
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // ===== 編輯活動 =====
  const [editModalShow, setEditModalShow] = useState(false);
  const [editFields, setEditFields] = useState({
    eventId: '',
    name: '',
    eventType: '',
    date: '',
    startTime: '',
    endTime: '',
    customEventType: '',
    customReservationRule: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // ===== 刪除活動 =====
  const [deleteConfirmModalShow, setDeleteConfirmModalShow] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState('');
  const [deleteEventName, setDeleteEventName] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ===== 批量新增活動 =====
  const [showBatchAddModal, setShowBatchAddModal] = useState(false);
  const [batchEvents, setBatchEvents] = useState([{
    name: '',
    eventType: 'English Table',
    date: '',
    startTime: '',
    endTime: '',
    maxParticipants: 30,
    customEventType: '',
    customReservationRule: ''
  }]);
  const [batchAddLoading, setBatchAddLoading] = useState(false);
  const [batchAddError, setBatchAddError] = useState('');
  const [batchAddResult, setBatchAddResult] = useState(null);
  const [showBatchDatePicker, setShowBatchDatePicker] = useState(false);
  const [batchSelectedDates, setBatchSelectedDates] = useState([]);

  // 角色權限檢查
  const actualUserRole = userRole || 'worker';
  const isTeacher = actualUserRole === 'teacher';
  const canViewEventsAdmin = hasPermission(accessProfile, P.CAN_VIEW_EVENTS_ADMIN);
  const canManageEvents = hasPermission(accessProfile, P.CAN_MANAGE_EVENTS);
  const canExportReports = hasPermission(accessProfile, P.CAN_EXPORT_REPORTS);
  const canExportReservations = hasPermission(accessProfile, P.CAN_EXPORT_RESERVATIONS);
  const eventTypeOptions = getEventTypeOptions().filter((opt) => {
    if (opt.value === 'all' || opt.value === '其他') return true;
    return canAccessEventType(accessProfile, opt.value);
  });

  useEffect(() => {
    if (!eventTypeOptions.some((o) => o.value === selectedEventType)) {
      setSelectedEventType('all');
    }
  }, [eventTypeOptions, selectedEventType]);

  // 取得活動報表
  const fetchSummary = async (semester = selectedSemester, eventType = selectedEventType, date = filterDate) => {
    if (!canViewEventsAdmin) {
      setSummary([]);
      setError('您沒有活動後台檢視權限');
      return;
    }
    setLoading(true);
    
    const result = await safeAPICall(async () => {
      const params = new URLSearchParams();
      if (semester !== 'all') params.append('semester', semester);
      if (eventType !== 'all') params.append('eventType', eventType);
      if (date && String(date).trim()) params.append('date', String(date).trim());
      
      const url = params.toString() 
        ? `/api/reports/summary?${params.toString()}`
        : '/api/reports/summary';
      
      const response = await fetch(url, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw { response: { status: response.status, data: errorData } };
      }
      
      return response.json();
    });
    
    if (result.success) {
      setSummary(result.data || []);
      setError('');
    } else {
      setError(result.error || '載入報表失敗');
    }
    
    setLoading(false);
  };

  // 學期篩選變更
  const handleSemesterChange = (semester) => {
    setSelectedSemester(semester);
    fetchSummary(semester, selectedEventType);
  };

  // 活動類型篩選變更
  const handleEventTypeChange = (eventType) => {
    setSelectedEventType(eventType);
    fetchSummary(selectedSemester, eventType);
  };

  const handleFilterDateChange = (value) => {
    setFilterDate(value);
    fetchSummary(selectedSemester, selectedEventType, value);
  };

  const clearFilterDate = () => {
    setFilterDate('');
    fetchSummary(selectedSemester, selectedEventType, '');
  };

  // 新增活動
  const handleAddEvent = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');

    // 處理自定義活動類型
    let finalEventType = addFields.eventType;
    if (addFields.eventType === '其他') {
      if (!addFields.customEventType.trim()) {
        setAddError('請填寫自定義活動類型名稱');
        setAddLoading(false);
        return;
      }
      if (!addFields.customReservationRule.trim()) {
        setAddError('請填寫自定義活動的預約開始時間規則');
        setAddLoading(false);
        return;
      }
      finalEventType = addFields.customEventType.trim();
    }

    // 驗證人數限制
    const maxParticipants = addFields.maxParticipants === '' || addFields.maxParticipants === null || addFields.maxParticipants === undefined
      ? 30
      : Number(addFields.maxParticipants);
    
    if (!maxParticipants || maxParticipants < 1 || maxParticipants > 100) {
      setAddError('請輸入有效的人數限制（1-100）');
      setAddLoading(false);
      return;
    }

    // 準備請求資料，確保包含所有必要欄位
    const requestData = {
      name: addFields.name,
      eventType: finalEventType,
      date: addFields.date,
      startTime: addFields.startTime,
      endTime: addFields.endTime,
      maxCapacity: maxParticipants
    };
    
    // 如果是自定義活動類型，添加 customReservationRule
    if (addFields.eventType === '其他') {
      requestData.customReservationRule = addFields.customReservationRule;
    }

    const result = await safeAPICall(async () => {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw { response: { status: response.status, data: errorData } };
      }

      return response.json();
    });

    if (result.success) {
      setAddFields({
        name: '',
        eventType: 'English Table',
        date: '',
        startTime: '',
        endTime: '',
        maxParticipants: 30,
        customEventType: '',
        customReservationRule: ''
      });
      fetchSummary(selectedSemester, selectedEventType);
      showErrorMessage('活動新增成功！');
    } else {
      setAddError(result.error || '新增活動失敗');
    }

    setAddLoading(false);
  };

  // 批量新增活動
  const handleBatchAddEvents = async () => {
    setBatchAddLoading(true);
    setBatchAddError('');
    setBatchAddResult(null);

    // 驗證所有活動資料
    const validEvents = [];
    const errors = [];

    for (let i = 0; i < batchEvents.length; i++) {
      const event = batchEvents[i];
      
      // 跳過空行
      if (!event.name.trim() && !event.date && !event.startTime) {
        continue;
      }

      // 驗證必要欄位
      if (!event.name.trim()) {
        errors.push(`第 ${i + 1} 行：缺少活動名稱`);
        continue;
      }
      if (!event.date) {
        errors.push(`第 ${i + 1} 行：缺少日期`);
        continue;
      }
      if (!event.startTime) {
        errors.push(`第 ${i + 1} 行：缺少開始時間`);
        continue;
      }
      if (!event.endTime) {
        errors.push(`第 ${i + 1} 行：缺少結束時間`);
        continue;
      }

      // 驗證活動類型
      if (!event.eventType || event.eventType === '其他') {
        errors.push(`第 ${i + 1} 行：請選擇有效的活動類型`);
        continue;
      }

      // 驗證人數限制
      const maxParticipants = event.maxParticipants === '' || event.maxParticipants === null || event.maxParticipants === undefined
        ? 30
        : Number(event.maxParticipants);
      
      if (!maxParticipants || maxParticipants < 1 || maxParticipants > 100) {
        errors.push(`第 ${i + 1} 行：人數限制必須在 1-100 之間`);
        continue;
      }

      // 準備請求資料
      const requestData = {
        name: event.name.trim(),
        eventType: event.eventType,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        maxCapacity: maxParticipants
      };

      validEvents.push(requestData);
    }

    if (errors.length > 0) {
      setBatchAddError(errors.join('\n'));
      setBatchAddLoading(false);
      return;
    }

    if (validEvents.length === 0) {
      setBatchAddError('請至少填寫一個活動');
      setBatchAddLoading(false);
      return;
    }

    // 發送批量新增請求
    const result = await safeAPICall(async () => {
      const response = await fetch('/api/events/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ events: validEvents })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw { response: { status: response.status, data: errorData } };
      }

      return response.json();
    });

    if (result.success) {
      const data = result.data || result;
      setBatchAddResult(data);
      
      // 刷新報表
      fetchSummary(selectedSemester, selectedEventType);
      
      // 顯示結果訊息
      if (data.successCount > 0) {
        showSuccessMessage(`成功新增 ${data.successCount} 個活動！${data.failureCount > 0 ? `（失敗 ${data.failureCount} 個）` : ''}`);
      } else {
        showErrorMessage('所有活動新增失敗，請檢查錯誤訊息');
      }
      
      // 如果有錯誤，顯示錯誤訊息
      if (data.errors && data.errors.length > 0) {
        setBatchAddError(data.errors.join('\n'));
      }
      
      // 如果全部成功，清空表單；如果有失敗，保留表單讓用戶修正
      if (data.failureCount === 0 && data.successCount > 0) {
        setBatchEvents([{
          name: '',
          eventType: 'English Table',
          date: '',
          startTime: '',
          endTime: '',
          maxParticipants: 30,
          customEventType: '',
          customReservationRule: ''
        }]);
      }
    } else {
      setBatchAddError(result.error || '批量新增活動失敗');
    }

    setBatchAddLoading(false);
  };

  // 添加新的活動行
  const addBatchEventRow = () => {
    setBatchEvents([...batchEvents, {
      name: '',
      eventType: 'English Table',
      date: '',
      startTime: '',
      endTime: '',
      maxParticipants: 30,
      customEventType: '',
      customReservationRule: ''
    }]);
  };

  // 刪除活動行
  const removeBatchEventRow = (index) => {
    if (batchEvents.length > 1) {
      setBatchEvents(batchEvents.filter((_, i) => i !== index));
    }
  };

  // 更新批量活動資料
  const updateBatchEvent = (index, field, value) => {
    const updated = [...batchEvents];
    updated[index] = { ...updated[index], [field]: value };
    setBatchEvents(updated);
  };

  // 批量選擇日期功能
  const handleBatchDateSelect = () => {
    if (batchEvents.length === 0) {
      showErrorMessage('請先填寫活動基本資訊');
      return;
    }

    const firstEvent = batchEvents[0];
    if (!firstEvent.name.trim() || !firstEvent.startTime || !firstEvent.endTime) {
      showErrorMessage('請先填寫活動名稱、開始時間和結束時間');
      return;
    }

    setShowBatchDatePicker(true);
  };

  // 應用批量日期
  const applyBatchDates = () => {
    if (batchSelectedDates.length === 0) {
      showErrorMessage('請至少選擇一個日期');
      return;
    }

    const firstEvent = batchEvents[0];
    const newEvents = batchSelectedDates.map(date => ({
      name: firstEvent.name,
      eventType: firstEvent.eventType,
      date: date,
      startTime: firstEvent.startTime,
      endTime: firstEvent.endTime,
      maxParticipants: firstEvent.maxParticipants,
      customEventType: '',
      customReservationRule: ''
    }));

    setBatchEvents(newEvents);
    setShowBatchDatePicker(false);
    setBatchSelectedDates([]);
    showSuccessMessage(`已為 ${batchSelectedDates.length} 個日期創建活動`);
  };

  // 添加日期到選擇列表
  const addDateToBatch = (date) => {
    if (!date) return;
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    if (!batchSelectedDates.includes(dateStr)) {
      setBatchSelectedDates([...batchSelectedDates, dateStr].sort());
    }
  };

  // 從選擇列表移除日期
  const removeDateFromBatch = (date) => {
    setBatchSelectedDates(batchSelectedDates.filter(d => d !== date));
  };

  // 解析日期字串（支援多種格式：逗號分隔、換行分隔、日期範圍）
  const parseDateString = (dateString) => {
    if (!dateString.trim()) return [];
    
    const dates = [];
    // 支援逗號、換行、分號分隔
    const parts = dateString.split(/[,\n;]/).map(s => s.trim()).filter(s => s);
    
    for (const part of parts) {
      // 檢查是否為日期範圍（格式：YYYY-MM-DD 到 YYYY-MM-DD 或 YYYY-MM-DD - YYYY-MM-DD）
      const rangeMatch = part.match(/(\d{4}-\d{2}-\d{2})\s*(?:到|-|~)\s*(\d{4}-\d{2}-\d{2})/);
      if (rangeMatch) {
        const start = dayjs(rangeMatch[1]);
        const end = dayjs(rangeMatch[2]);
        if (start.isValid() && end.isValid() && start.isBefore(end) || start.isSame(end)) {
          let current = start;
          while (current.isBefore(end) || current.isSame(end)) {
            dates.push(current.format('YYYY-MM-DD'));
            current = current.add(1, 'day');
          }
        }
      } else {
        // 單個日期
        const date = dayjs(part);
        if (date.isValid()) {
          dates.push(date.format('YYYY-MM-DD'));
        }
      }
    }
    
    return [...new Set(dates)].sort(); // 去重並排序
  };

  // 匯出功能
  const handleExport = async (eventId) => {
    try {
      if (!canExportReservations) {
        showErrorMessage('您沒有匯出預約名單權限');
        return;
      }
      const response = await fetch(`/api/events/${eventId}/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('匯出失敗');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `活動預約清單_${eventId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      showErrorMessage('匯出失敗：' + error.message);
    }
  };

  // 編輯活動
  const handleEditEvent = (event) => {
    setEditFields({
      eventId: event.eventId,
      name: event.name,
      eventType: event.eventType,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      maxParticipants: event.maxParticipants || event.maxCapacity || 30,
      customEventType: event.eventType === '其他' ? event.customEventType || '' : '',
      customReservationRule: event.customReservationRule || ''
    });
    setEditModalShow(true);
    setEditError('');
  };

  // 提交編輯
  const handleEditSubmit = async () => {
    if (!editFields.eventId) return;
    
    setEditLoading(true);
    setEditError('');

    // 處理自定義活動類型
    let finalEventType = editFields.eventType;
    if (editFields.eventType === '其他') {
      if (!editFields.customReservationRule?.trim()) {
        setEditError('請填寫自定義活動的預約時間規則說明');
        setEditLoading(false);
        return;
      }
      finalEventType = editFields.customEventType || editFields.name;
    }

    // 驗證人數限制
    const maxParticipants = editFields.maxParticipants === '' || editFields.maxParticipants === null || editFields.maxParticipants === undefined
      ? 30
      : Number(editFields.maxParticipants);
    
    if (!maxParticipants || maxParticipants < 1 || maxParticipants > 100) {
      setEditError('請輸入有效的人數限制（1-100）');
      setEditLoading(false);
      return;
    }

    const result = await safeAPICall(async () => {
      const response = await fetch(`/api/events/${editFields.eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editFields,
          eventType: finalEventType,
          customReservationRule: editFields.eventType === '其他' ? editFields.customReservationRule : null,
          maxCapacity: maxParticipants
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw { response: { status: response.status, data: errorData } };
      }

      return response.json();
    });

    if (result.success) {
      setEditModalShow(false);
      fetchSummary(selectedSemester, selectedEventType);
      showErrorMessage('活動修改成功！');
    } else {
      setEditError(result.error || '修改活動失敗');
    }

    setEditLoading(false);
  };

  // 刪除活動
  const handleDeleteEvent = async (eventId, eventName) => {
    try {
      // 先檢查活動是否有預約紀錄
      const checkRes = await fetch(`/api/events/${eventId}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const eventData = await checkRes.json();
      
      if (eventData.reserved > 0) {
        // 有預約紀錄，顯示密碼確認Modal
        setDeleteEventId(eventId);
        setDeleteEventName(eventName);
        setDeletePassword('');
        setDeleteConfirmModalShow(true);
      } else {
        // 沒有預約紀錄，直接刪除
        const ok = await confirm({
          title: '確認刪除此活動？',
          description: '此操作無法復原。',
          confirmText: '刪除',
          cancelText: '取消',
          variant: 'danger',
        });
        if (!ok) return;
        await performDelete(eventId);
      }
    } catch (err) {
      console.error('檢查活動錯誤:', err);
      showErrorMessage('檢查活動失敗');
    }
  };

  // 執行刪除操作
  const performDelete = async (eventId) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, { 
        method: 'DELETE', 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = await res.json();
      if (res.ok) {
        showErrorMessage('活動刪除成功！');
        fetchSummary(selectedSemester, selectedEventType);
      } else {
        showErrorMessage(data.message || '刪除活動失敗');
      }
    } catch (err) {
      console.error('刪除活動錯誤:', err);
      showErrorMessage('刪除活動失敗');
    }
  };

  // 密碼確認刪除
  const handlePasswordConfirmDelete = async () => {
    if (!deletePassword.trim()) {
      showErrorMessage('請輸入管理員密碼');
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/events/${deleteEventId}/force-delete`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ password: deletePassword })
      });
      const data = await res.json();
      
      if (res.ok) {
        showErrorMessage('活動刪除成功！');
        setDeleteConfirmModalShow(false);
        setDeletePassword('');
        fetchSummary(selectedSemester, selectedEventType);
      } else {
        showErrorMessage(data.message || '密碼錯誤或刪除失敗');
      }
    } catch (err) {
      console.error('密碼確認刪除錯誤:', err);
      showErrorMessage('刪除失敗');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 匯出總覽報表
  const handleExportAll = async () => {
    try {
      if (!canExportReports) {
        showErrorMessage('您沒有匯出總覽報表權限');
        return;
      }
      const params = new URLSearchParams();
      if (selectedSemester !== 'all') params.append('semester', selectedSemester);
      if (selectedEventType !== 'all') params.append('eventType', selectedEventType);
      
      const url = params.toString() 
        ? `/api/reports/export?${params.toString()}`
        : '/api/reports/export';
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('匯出失敗');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `活動總覽報表_${selectedSemester}_${selectedEventType}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      showErrorMessage('匯出失敗：' + error.message);
    }
  };

  // 初始化載入 - 使用預設的當前學期
  useEffect(() => {
    fetchSummary(selectedSemester, selectedEventType);
  }, []); // 只在組件掛載時執行一次

  const isEventToday = (dateStr) => {
    if (!dateStr) return false;
    return dayjs().format('YYYY-MM-DD') === dateStr;
  };

  return (
    <>
      <div className="d-flex justify-content-end align-items-center flex-wrap gap-3 mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0">學期篩選：</label>
            <select 
              className="form-select" 
              value={selectedSemester} 
              onChange={(e) => handleSemesterChange(e.target.value)}
              style={{ minWidth: '250px' }}
            >
              {getSemesterOptions().map(option => (
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
              onChange={(e) => handleEventTypeChange(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              {eventTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0">日期篩選：</label>
            <input
              type="date"
              className="form-control"
              value={filterDate}
              onChange={(e) => handleFilterDateChange(e.target.value)}
              style={{ minWidth: '160px' }}
            />
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearFilterDate}>
              不限日期
            </button>
          </div>
          {/* 只有管理員和執行長才能看到匯出總覽報表按鈕 */}
          {canExportReports && (
            <button className="btn btn-outline-primary" onClick={handleExportAll}>匯出總覽報表</button>
          )}
        </div>
      </div>

      {/* 只有管理員和執行長才能看到新增活動表單 */}
      {canManageEvents && (
        <>
        <h5 className="mb-3">新增活動</h5>
        <form onSubmit={handleAddEvent} className="mb-4">
        <div className="row g-2 mb-2">
          <div className="col-md-2">
            <label className="form-label">活動名稱 *</label>
            <input className="form-control" placeholder="請輸入活動名稱" required value={addFields.name} onChange={e => setAddFields({ ...addFields, name: e.target.value })} />
          </div>
          <div className="col-md-2">
            <label className="form-label">活動類型 *</label>
            <select className="form-control" required value={addFields.eventType} onChange={e => setAddFields({ ...addFields, eventType: e.target.value })}>
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
              value={addFields.maxParticipants === '' ? '' : addFields.maxParticipants} 
              onChange={e => {
                const value = e.target.value;
                // 允許完全刪除，空值時設置為空字符串
                if (value === '') {
                  setAddFields({ ...addFields, maxParticipants: '' });
                } else {
                  // 嘗試解析為數字
                  const numValue = parseInt(value, 10);
                  if (!isNaN(numValue)) {
                    // 限制在有效範圍內
                    if (numValue >= 1 && numValue <= 100) {
                      setAddFields({ ...addFields, maxParticipants: numValue });
                    }
                    // 如果超出範圍，不更新狀態（保持原值）
                  }
                }
              }}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">日期 *</label>
            <input type="date" className="form-control" required value={addFields.date} onChange={e => setAddFields({ ...addFields, date: e.target.value })} />
          </div>
          <div className="col-md-2">
            <label className="form-label">&nbsp;</label>
            <button type="submit" className="btn btn-primary w-100" disabled={addLoading}>
              {addLoading ? '新增中...' : '新增活動'}
            </button>
          </div>
        </div>
        <div className="row g-2 mb-2">
          <div className="col-md-2">
            <label className="form-label">開始時間 *</label>
            <input type="time" className="form-control" required value={addFields.startTime} onChange={e => setAddFields({ ...addFields, startTime: e.target.value })} />
          </div>
          <div className="col-md-2">
            <label className="form-label">結束時間 *</label>
            <input type="time" className="form-control" required value={addFields.endTime} onChange={e => setAddFields({ ...addFields, endTime: e.target.value })} />
          </div>
          <div className="col-md-2">
            <label className="form-label">&nbsp;</label>
            <button 
              type="button"
              className="btn btn-success w-100" 
              onClick={() => {
                setBatchEvents([{
                  name: '',
                  eventType: 'English Table',
                  date: '',
                  startTime: '',
                  endTime: '',
                  maxParticipants: 30,
                  customEventType: '',
                  customReservationRule: ''
                }]);
                setBatchAddError('');
                setBatchAddResult(null);
                setShowBatchAddModal(true);
              }}
            >
              批量新增活動
            </button>
          </div>
        </div>
        
        {/* 當選擇「其他」時顯示的額外欄位 */}
        {addFields.eventType === '其他' && (
          <div className="row g-2 mb-2">
            <div className="col-md-4">
              <label className="form-label">自定義活動類型名稱 *</label>
              <input 
                className="form-control" 
                placeholder="請輸入活動類型名稱" 
                required 
                value={addFields.customEventType} 
                onChange={e => setAddFields({ ...addFields, customEventType: e.target.value })} 
              />
            </div>
            <div className="col-md-8">
              <label className="form-label">預約開始時間規則 *</label>
              <input 
                className="form-control" 
                placeholder="例：活動開始前兩天的下午3點、這個禮拜二的早上9點等" 
                required 
                value={addFields.customReservationRule} 
                onChange={e => setAddFields({ ...addFields, customReservationRule: e.target.value })} 
              />
              <small className="text-muted">注意：自定義活動類型將使用 English Table 的預約時間邏輯（前一天00:00開始）</small>
            </div>
          </div>
        )}
        
        {addError && <ErrorAlert error={addError} />}
        </form>
        </>
      )}

      {/* 報表內容 */}
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
            {summary.map(evt => {
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
                    {/* 根據角色顯示不同的操作按鈕 */}
                    {actualUserRole === 'worker' ? (
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => navigate(`/admin/operations/${evt.eventId}`)}
                      >
                        活動明細
                      </button>
                    ) : isTeacher ? (
                      <>
                        {canExportReservations && (
                          <button className="btn btn-sm btn-outline-info me-1" onClick={() => handleExport(evt.eventId)}>匯出</button>
                        )}
                        <button
                          className="btn btn-sm btn-outline-success me-1"
                          onClick={() => navigate(`/admin/operations/${evt.eventId}`)}
                        >
                          活動明細
                        </button>
                      </>
                    ) : (
                      <>
                        {canExportReservations && (
                          <button className="btn btn-sm btn-outline-info me-1" onClick={() => handleExport(evt.eventId)}>匯出</button>
                        )}
                        <button
                          className="btn btn-sm btn-outline-success me-1"
                          onClick={() => navigate(`/admin/operations/${evt.eventId}`)}
                        >
                          活動明細
                        </button>
                        <button className="btn btn-sm btn-outline-warning me-1" onClick={() => handleEditEvent(evt)}>修改</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteEvent(evt.eventId, evt.name)}>刪除</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* 編輯活動 Modal */}
      <Modal show={editModalShow} onHide={() => setEditModalShow(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>編輯活動</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ErrorAlert error={editError} />
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>活動名稱 *</Form.Label>
              <Form.Control
                type="text"
                value={editFields.name}
                onChange={(e) => setEditFields({...editFields, name: e.target.value})}
                placeholder="請輸入活動名稱"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>活動類型 *</Form.Label>
              <Form.Select
                value={editFields.eventType}
                onChange={(e) => setEditFields({...editFields, eventType: e.target.value})}
              >
                <option value="English Table">English Table</option>
                <option value="English Club">English Club</option>
                <option value="Job Talk">Job Talk</option>
                <option value="International Forum">International Forum</option>
                <option value="其他">其他</option>
              </Form.Select>
            </Form.Group>

            {editFields.eventType === '其他' && (
              <Form.Group className="mb-3">
                <Form.Label>自訂活動類型 *</Form.Label>
                <Form.Control
                  type="text"
                  value={editFields.customEventType}
                  onChange={(e) => setEditFields({...editFields, customEventType: e.target.value})}
                  placeholder="請輸入自訂活動類型"
                />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>活動日期 *</Form.Label>
              <Form.Control
                type="date"
                value={editFields.date}
                onChange={(e) => setEditFields({...editFields, date: e.target.value})}
              />
            </Form.Group>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>開始時間 *</Form.Label>
                  <Form.Control
                    type="time"
                    value={editFields.startTime}
                    onChange={(e) => setEditFields({...editFields, startTime: e.target.value})}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>結束時間 *</Form.Label>
                  <Form.Control
                    type="time"
                    value={editFields.endTime}
                    onChange={(e) => setEditFields({...editFields, endTime: e.target.value})}
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>人數限制 *</Form.Label>
              <Form.Control
                type="number"
                min="1"
                max="100"
                value={editFields.maxParticipants === '' ? '' : editFields.maxParticipants}
                onChange={(e) => {
                  const value = e.target.value;
                  // 允許完全刪除，空值時設置為空字符串
                  if (value === '') {
                    setEditFields({...editFields, maxParticipants: ''});
                  } else {
                    // 嘗試解析為數字
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue)) {
                      // 限制在有效範圍內
                      if (numValue >= 1 && numValue <= 100) {
                        setEditFields({...editFields, maxParticipants: numValue});
                      }
                      // 如果超出範圍，不更新狀態（保持原值）
                    }
                  }
                }}
                placeholder="30"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditModalShow(false)}>
            取消
          </Button>
          <Button 
            variant="primary" 
            onClick={handleEditSubmit}
            disabled={editLoading}
          >
            {editLoading ? '更新中...' : '更新活動'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 刪除確認 Modal */}
      <Modal show={deleteConfirmModalShow} onHide={() => setDeleteConfirmModalShow(false)}>
        <Modal.Header closeButton>
          <Modal.Title>確認刪除活動</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>您確定要刪除活動「<strong>{deleteEventName}</strong>」嗎？</p>
          <p className="text-danger">此操作無法復原，且會刪除所有相關的預約記錄。</p>
          <Form.Group className="mb-3">
            <Form.Label>請輸入管理員密碼確認：</Form.Label>
            <Form.Control
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="請輸入管理員密碼"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteConfirmModalShow(false)}>
            取消
          </Button>
          <Button 
            variant="danger" 
            onClick={handlePasswordConfirmDelete}
            disabled={deleteLoading || !deletePassword}
          >
            {deleteLoading ? '刪除中...' : '確認刪除'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 批量新增活動 Modal */}
      <Modal show={showBatchAddModal} onHide={() => {
        if (!batchAddLoading) {
          setShowBatchAddModal(false);
          setBatchAddError('');
          setBatchAddResult(null);
          setShowBatchDatePicker(false);
          setBatchSelectedDates([]);
        }
      }} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>批量新增活動</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3 d-flex align-items-center gap-2 flex-wrap">
            <Button variant="outline-primary" size="sm" onClick={addBatchEventRow}>
              + 新增一行
            </Button>
            <Button variant="outline-info" size="sm" onClick={handleBatchDateSelect}>
              📅 批量選擇日期
            </Button>
            <small className="text-muted">可以一次新增多個活動，空行會被自動忽略</small>
          </div>

          {/* 批量日期選擇區域 */}
          {showBatchDatePicker && (
            <div className="alert alert-info mb-3">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <strong>批量選擇日期</strong>
                <Button variant="link" size="sm" className="p-0" onClick={() => {
                  setShowBatchDatePicker(false);
                  setBatchSelectedDates([]);
                }}>
                  ✕ 關閉
                </Button>
              </div>
              <p className="mb-2 small">請先在第一行填寫活動名稱、時間等資訊，然後選擇多個日期。系統會自動為每個日期創建一行活動。</p>
              
              <div className="row g-2 mb-2">
                <div className="col-md-6">
                  <Form.Label className="small">快速添加日期（支援多種格式）</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows="3"
                    id="batch-date-input"
                    placeholder="例如：&#10;2025-03-01, 2025-03-02, 2025-03-03&#10;或：2025-03-01 到 2025-03-05（日期範圍）&#10;或：每行一個日期"
                  />
                  <div className="d-flex gap-2 mt-1">
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      onClick={() => {
                        const textarea = document.getElementById('batch-date-input');
                        if (textarea && textarea.value) {
                          const dates = parseDateString(textarea.value);
                          if (dates.length > 0) {
                            setBatchSelectedDates([...new Set([...batchSelectedDates, ...dates])].sort());
                            textarea.value = '';
                            showSuccessMessage(`已添加 ${dates.length} 個日期`);
                          } else {
                            showErrorMessage('無法解析日期，請檢查格式');
                          }
                        }
                      }}
                    >
                      解析並添加
                    </Button>
                    <Form.Text className="text-muted small align-self-center">
                      支援格式：逗號分隔、換行分隔、日期範圍（如：2025-03-01 到 2025-03-05）
                    </Form.Text>
                  </div>
                </div>
                <div className="col-md-6">
                  <Form.Label className="small">或選擇單個日期</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="date"
                      size="sm"
                      id="single-date-input"
                    />
                    <Button variant="outline-primary" size="sm" onClick={() => {
                      const input = document.getElementById('single-date-input');
                      if (input && input.value) {
                        addDateToBatch(input.value);
                        input.value = '';
                      }
                    }}>
                      添加
                    </Button>
                  </div>
                </div>
              </div>

              {batchSelectedDates.length > 0 && (
                <div className="mt-2">
                  <Form.Label className="small">已選擇的日期 ({batchSelectedDates.length} 個)：</Form.Label>
                  <div className="d-flex flex-wrap gap-2 mt-1">
                    {batchSelectedDates.map((date, idx) => (
                      <span key={idx} className="badge bg-primary d-flex align-items-center gap-1">
                        {dayjs(date).format('YYYY-MM-DD')}
                        <button
                          type="button"
                          className="btn-close btn-close-white"
                          style={{ fontSize: '0.6rem' }}
                          onClick={() => removeDateFromBatch(date)}
                          aria-label="移除"
                        />
                      </span>
                    ))}
                  </div>
                  <div className="mt-2">
                    <Button variant="success" size="sm" onClick={applyBatchDates}>
                      應用日期（將創建 {batchSelectedDates.length} 個活動）
                    </Button>
                    <Button variant="outline-secondary" size="sm" className="ms-2" onClick={() => setBatchSelectedDates([])}>
                      清空選擇
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="table table-bordered table-sm">
              <thead className="table-light sticky-top">
                <tr>
                  <th style={{ width: '5%' }}>#</th>
                  <th style={{ width: '18%' }}>活動名稱 *</th>
                  <th style={{ width: '15%' }}>活動類型 *</th>
                  <th style={{ width: '12%' }}>日期 *</th>
                  <th style={{ width: '12%' }}>開始時間 *</th>
                  <th style={{ width: '12%' }}>結束時間 *</th>
                  <th style={{ width: '10%' }}>人數限制 *</th>
                  <th style={{ width: '6%' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {batchEvents.map((event, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <Form.Control
                        type="text"
                        size="sm"
                        value={event.name}
                        onChange={(e) => updateBatchEvent(index, 'name', e.target.value)}
                        placeholder="活動名稱"
                      />
                    </td>
                    <td>
                      <Form.Select
                        size="sm"
                        value={event.eventType}
                        onChange={(e) => updateBatchEvent(index, 'eventType', e.target.value)}
                      >
                        <option value="English Table">English Table</option>
                        <option value="Job Talk">Job Talk</option>
                        <option value="English Club">English Club</option>
                        <option value="International Forum">International Forum</option>
                      </Form.Select>
                    </td>
                    <td>
                      <Form.Control
                        type="date"
                        size="sm"
                        value={event.date}
                        onChange={(e) => updateBatchEvent(index, 'date', e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="time"
                        size="sm"
                        value={event.startTime}
                        onChange={(e) => updateBatchEvent(index, 'startTime', e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="time"
                        size="sm"
                        value={event.endTime}
                        onChange={(e) => updateBatchEvent(index, 'endTime', e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        size="sm"
                        min="1"
                        max="100"
                        value={event.maxParticipants === '' ? '' : event.maxParticipants}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            updateBatchEvent(index, 'maxParticipants', '');
                          } else {
                            const numValue = parseInt(value, 10);
                            if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
                              updateBatchEvent(index, 'maxParticipants', numValue);
                            }
                          }
                        }}
                        placeholder="30"
                      />
                    </td>
                    <td>
                      {batchEvents.length > 1 && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeBatchEventRow(index)}
                        >
                          刪除
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {batchAddError && (
            <div className="alert alert-danger mt-3">
              <strong>錯誤：</strong>
              <pre style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{batchAddError}</pre>
            </div>
          )}

          {batchAddResult && (
            <div className="alert alert-success mt-3">
              <strong>成功！</strong>
              <p className="mb-0">
                成功新增 {batchAddResult.successCount} 個活動
                {batchAddResult.failureCount > 0 && (
                  <span className="text-warning">，失敗 {batchAddResult.failureCount} 個</span>
                )}
              </p>
              {batchAddResult.errors && batchAddResult.errors.length > 0 && (
                <div className="mt-2">
                  <strong>錯誤詳情：</strong>
                  <ul className="mb-0">
                    {batchAddResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowBatchAddModal(false);
              setBatchAddError('');
              setBatchAddResult(null);
            }}
            disabled={batchAddLoading}
          >
            取消
          </Button>
          <Button 
            variant="primary" 
            onClick={handleBatchAddEvents}
            disabled={batchAddLoading}
          >
            {batchAddLoading ? '新增中...' : '批量新增'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default AdminHome;
