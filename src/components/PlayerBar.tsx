import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { FaCartShopping } from "react-icons/fa6";

export default function PlayerBar() {
  return (
    <div className="fixed bottom-0 left-0 w-full z-50 bg-[--color-card-bg] text-white py-4 px-6 text-center shadow-t">
      PlayerBar (persistent)
    </div>
  );
}
