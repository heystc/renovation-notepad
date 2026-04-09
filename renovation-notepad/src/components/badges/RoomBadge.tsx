import React from 'react';
import type { RoomConfig } from '../../types';
import { getRoomIcon } from '../../utils/icons';

interface RoomBadgeProps {
  room: string;
  rooms: RoomConfig[];
}

export const RoomBadge: React.FC<RoomBadgeProps> = ({ room, rooms }) => {
  const config = rooms.find(r => r.id === room) || rooms[0];
  return (
    <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
      {getRoomIcon(config.icon)}
      {config.label}
    </span>
  );
};

export default RoomBadge;
