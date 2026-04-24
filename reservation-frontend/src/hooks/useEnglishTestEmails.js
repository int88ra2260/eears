/**
 * 培力英檢一鍵發信：報名成功 / 報名失敗 / 團體推廣信。
 * 封裝 sendingEmails 與 handleSendStatusEmails，維持 ConfirmModal 串接與原有 API 行為。
 */
import { useState, useCallback } from 'react';

/**
 * @param {Object} options
 * @param {string} options.token
 * @param {(config: object) => void} options.openConfirm - 開啟確認框（config: title, message, confirmLabel?, variant?, onConfirm? 等）
 * @param {(message: string, variant?: string) => void} options.showToast
 */
export function useEnglishTestEmails({ token, openConfirm, showToast }) {
  const [sendingEmails, setSendingEmails] = useState(false);

  const handleSendStatusEmails = useCallback((status) => {
    if (!['success', 'failed', 'group_promo'].includes(status)) return;
    const msg = status === 'success'
      ? '確定要對所有「報名成功」者發送通知信嗎？'
      : status === 'failed'
        ? '確定要對所有「報名失敗」者發送通知信嗎？'
        : '確定要對所有「報名成功」且「四項皆報考」者發送團體推廣信嗎？';

    openConfirm({
      title: '確認發送信件',
      message: msg,
      confirmLabel: '發送',
      variant: 'primary',
      onConfirm: async () => {
        setSendingEmails(true);
        try {
          const response = await fetch('/api/english-test/registrations/send-status-emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
          });
          const data = await response.json();
          if (response.ok) {
            showToast(
              data.message + (data.failed > 0 ? `，${data.failed} 筆發送失敗` : ''),
              data.failed > 0 ? 'warning' : 'success'
            );
          } else {
            showToast(data.error || '發信失敗', 'danger');
          }
        } catch (e) {
          console.error(e);
          showToast('發信時發生錯誤', 'danger');
        } finally {
          setSendingEmails(false);
        }
      }
    });
  }, [token, openConfirm, showToast]);

  return {
    sendingEmails,
    handleSendStatusEmails
  };
}

