import React, { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import Spinner from 'react-bootstrap/Spinner';
import useAdminEventWorkspace from '../../hooks/useAdminEventWorkspace';
import AdminEventDetailTabs from '../../components/admin/events/AdminEventDetailTabs';
import AdminEventDetailHeader from '../../components/admin/events/AdminEventDetailHeader';
import { EVENT_DETAIL_COPY } from '../../constants/adminEventDetailCopy';

export default function AdminEventDetailPage() {
  const { eventId } = useParams();
  const { token, userRole, accessProfile } = useOutletContext();
  const [activeTab, setActiveTab] = useState('reservations');
  const ws = useAdminEventWorkspace({ token, userRole, accessProfile, eventId, activeTab });

  if (ws.detailLoading) {
    return (
      <div className="d-flex align-items-center gap-2 py-4">
        <Spinner animation="border" size="sm" />
        <span>{EVENT_DETAIL_COPY.pageLoading}</span>
      </div>
    );
  }

  if (ws.detailError) {
    return (
      <div className="alert alert-danger">
        {ws.detailError}
        <div className="mt-2">
          <Link to="/admin/operations" className="btn btn-outline-primary btn-sm">
            返回活動列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminEventDetailHeader ws={ws} onGoCheckinTab={() => setActiveTab('checkin')} />

      <AdminEventDetailTabs {...ws} activeKey={activeTab} onSelect={setActiveTab} />
    </div>
  );
}
