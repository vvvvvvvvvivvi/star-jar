import React, { useState } from 'react';
import StarJar from './StarJar';
import ComplimentDex from './ComplimentDex';

export default function App() {
  const [activeTab, setActiveTab] = useState('jar');
  const [unlockedCompliments, setUnlockedCompliments] = useState([]);

  const handleUnlock = (compliment) => {
    setUnlockedCompliments((prev) =>
      prev.includes(compliment) ? prev : [...prev, compliment]
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Tab Buttons */}
      <div className="flex justify-center gap-4 pt-4">
      <button
        onClick={() => setActiveTab('jar')}
        className={`px-5 py-3 rounded-full text-sm font-medium transition duration-150 ease-in-out
          ${activeTab === 'jar'
            ? 'bg-[#E4DAF2] text-[#6D679D] shadow-sm'
            : 'bg-[#F2F2F2] text-[#999] hover:bg-[#EAEAEA]'}`}
      >
        Star Jar
      </button>

      <button
        onClick={() => setActiveTab('dex')}
        className={`px-5 py-3 rounded-full text-sm font-medium transition duration-150 ease-in-out
          ${activeTab === 'dex'
            ? 'bg-[#E4DAF2] text-[#6D679D] shadow-sm'
            : 'bg-[#F2F2F2] text-[#999] hover:bg-[#EAEAEA]'}`}
      >
        Star Dex
      </button>


    </div>
  

      {/* Content */}
      <div className="p-4">
        <div className={activeTab === 'jar' ? '' : 'hidden'}>
          <StarJar onComplimentUnlocked={handleUnlock} />
        </div>
        <div className={activeTab === 'dex' ? '' : 'hidden'}>
          <ComplimentDex unlockedCompliments={unlockedCompliments} />
        </div>
      </div>
    </div>
  );
}
