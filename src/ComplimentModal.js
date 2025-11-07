import React from 'react';

export default function ComplimentModal({ data, onClose }) {
  const { text, image, locked } = data;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-6 shadow-lg w-80 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-500 hover:text-black text-lg"
        >
          ×
        </button>

        <div className="flex flex-col items-center text-center">
          <img
            src={image}
            alt={text}
            className={`w-20 h-20 mb-4 ${locked ? 'grayscale opacity-30' : ''}`}
          />
          <h2 className="text-xl font-bold text-[#6D679D]">
            {locked ? '???' : text}
          </h2>
          
          <p className="mt-2 text-sm text-gray-500">
            {locked ? 'To be unlocked :>' : data.description}
            </p>

        </div>
      </div>
    </div>
  );
} 
