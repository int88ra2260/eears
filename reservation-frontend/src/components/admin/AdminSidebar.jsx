import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Collapse from 'react-bootstrap/Collapse';
import {
  ADMIN_NAV_SECTIONS,
  filterVisibleNav,
  getSidebarActiveState,
  isSidebarChildActive,
  isSidebarSingleSectionActive,
} from '../../constants/adminNavigation';

export default function AdminSidebar({ pathname, navContext, mobileOpen, onNavigate }) {
  const visible = useMemo(() => filterVisibleNav(ADMIN_NAV_SECTIONS, navContext), [navContext]);
  const active = useMemo(() => getSidebarActiveState(pathname, navContext), [pathname, navContext]);

  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    setCollapsed((prev) => {
      const next = { ...prev };
      visible.forEach((s) => {
        if (s.expandable && active.sectionId === s.id) {
          next[s.id] = false;
        }
      });
      return next;
    });
  }, [pathname, active.sectionId, visible]);

  const toggleSection = (id) => {
    setCollapsed((p) => ({ ...p, [id]: !p[id] }));
  };

  const isExpanded = (id) => collapsed[id] !== true;

  const handleLinkClick = () => {
    onNavigate?.();
  };

  const renderLeafLink = (section, leaf) => {
    const childActive = isSidebarChildActive(active, section.id, leaf.id);
    return (
      <li key={leaf.id}>
        <Link
          to={leaf.path}
          className={`admin-sidebar__link${childActive ? ' admin-sidebar__link--active' : ''}`}
          onClick={handleLinkClick}
        >
          {leaf.label}
        </Link>
      </li>
    );
  };

  return (
    <aside
      id="admin-sidebar-nav"
      className={`admin-sidebar${mobileOpen ? ' admin-sidebar--open' : ''}`}
      aria-label="後台主導覽"
    >
      <div className="admin-sidebar__brand text-muted">EEARS 後台</div>
      <ul className="admin-sidebar__nav">
        {visible.map((section) => {
          if (section.children?.length) {
            const expanded = isExpanded(section.id);
            const sectionHasActive = active.sectionId === section.id;
            return (
              <li key={section.id} className="mb-1">
                <button
                  type="button"
                  className={`admin-sidebar__section-label${
                    sectionHasActive ? ' admin-sidebar__section-label--active' : ''
                  }`}
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={expanded}
                >
                  <span>{section.label}</span>
                  <span className="admin-sidebar__chevron" aria-hidden>
                    {expanded ? '▼' : '▶'}
                  </span>
                </button>
                <Collapse in={expanded}>
                  <ul className="admin-sidebar__sub">
                    {section.children.map((leaf) => renderLeafLink(section, leaf))}
                  </ul>
                </Collapse>
              </li>
            );
          }

          if (!section.path) return null;

          const flatActive = isSidebarSingleSectionActive(active, section.id);
          return (
            <li key={section.id} className="mb-1">
              <Link
                to={section.path}
                className={`admin-sidebar__link d-block${flatActive ? ' admin-sidebar__link--active' : ''}`}
                onClick={handleLinkClick}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
