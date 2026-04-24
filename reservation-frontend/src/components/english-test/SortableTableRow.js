// components/english-test/SortableTableRow.js
// 可拖曳的表格行組件（用於報名成功狀態的拖曳排序）

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableTableRow({ 
  id, 
  children
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? '#e3f2fd' : 'transparent',
    cursor: isDragging ? 'grabbing' : 'grab',
    ...(isDragging && {
      border: '2px dashed #2196f3',
      zIndex: 1000
    })
  };

  // 將拖曳監聽器傳遞給拖曳手柄 td
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && 
        child.props && 
        child.props['data-drag-handle'] === 'true') {
      // 如果是拖曳手柄 td，添加 listeners 和樣式
      return React.cloneElement(child, { 
        ...listeners,
        style: {
          ...child.props.style,
          cursor: isDragging ? 'grabbing' : 'grab'
        }
      });
    }
    return child;
  });

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      {childrenWithProps}
    </tr>
  );
}
