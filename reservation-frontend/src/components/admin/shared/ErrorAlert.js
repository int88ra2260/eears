// components/admin/shared/ErrorAlert.js
// Admin 區共用錯誤訊息區塊，供報表、表單等顯示錯誤用。

import React from 'react';

/**
 * @param {Object} props
 * @param {string} [props.error] - 錯誤訊息，無則不渲染
 */
function ErrorAlert({ error }) {
  if (!error) return null;
  return <div className="alert alert-danger my-2">{error}</div>;
}

export default ErrorAlert;
