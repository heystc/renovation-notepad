import React from 'react';
import type { TagConfig, Settings } from '../../types';
import { getRoomIcon } from '../../utils/icons';

interface TagBadgeProps {
  tagId: string;
  settings: Settings;
}

// 从所有分组中收集所有标签，并查找
const findTag = (tagId: string, settings: Settings): TagConfig | undefined => {
  // 先从分组找
  if (settings.tagGroups) {
    for (const group of settings.tagGroups) {
      const found = group.tags.find(t => t.id === tagId);
      if (found) return found;
    }
  }
  // 向后兼容：顶级tags
  if (settings.tags) {
    return settings.tags.find(t => t.id === tagId);
  }
  // 向后兼容：rooms
  if (settings.rooms) {
    return settings.rooms.find(t => t.id === tagId);
  }
  return undefined;
};

export const TagBadge: React.FC<TagBadgeProps> = ({ tagId, settings }) => {
  const config = findTag(tagId, settings);
  if (!config) return null;
  return (
    <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
      {getRoomIcon(config.icon)}
      {config.label}
    </span>
  );
};

export default TagBadge;
