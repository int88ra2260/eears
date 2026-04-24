import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { buildAccessProfile, buildNavContextFromAccessProfile } from '../utils/accessControl';

/**
 * 後台版面用：從 OutletContext 的 token / userRole 建立權限輪廓
 */
export default function useAccessControl() {
  const { token, userRole } = useOutletContext() || {};

  return useMemo(() => {
    const accessProfile = buildAccessProfile(token || '', userRole || '');
    const navContext = buildNavContextFromAccessProfile(accessProfile);
    return {
      token,
      userRole,
      accessProfile,
      navContext,
      ...accessProfile,
    };
  }, [token, userRole]);
}
