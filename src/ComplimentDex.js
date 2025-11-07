// src/ComplimentDex.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import compliments from './complimentData';

// --- keep these in sync with StarJar.js ---
const BUILD_VERSION = '2025-08-11-1';
const asset = (p) =>
  `${process.env.PUBLIC_URL}${p.startsWith('/') ? p : `/${p}`}?v=${BUILD_VERSION}`;

const APP_NS = (process.env.PUBLIC_URL || '') + ':starjar';
const KEYS = {
  stars: `${APP_NS}:jarStars`,
  unlocked: `${APP_NS}:unlockedCompliments`,
  ver: `${APP_NS}:version`,
};
// --- end shared bits ---

export default function ComplimentDex() {
  const [unlockedSet, setUnlockedSet] = useState(new Set());
  const [remainingSet, setRemainingSet] = useState(new Set()); // compliments still inside the jar
  const [modalItem, setModalItem] = useState(null);            // {text,image,description}

  // Load from localStorage (unlocked list + what's still in jar)
  const loadState = useCallback(() => {
    try {
      const unlockedArr = JSON.parse(localStorage.getItem(KEYS.unlocked) || '[]');
      const starsArr = JSON.parse(localStorage.getItem(KEYS.stars) || '[]');

      setUnlockedSet(new Set(Array.isArray(unlockedArr) ? unlockedArr : []));
      const stillInJar = Array.isArray(starsArr)
        ? starsArr.map((s) => s.compliment).filter(Boolean)
        : [];
      setRemainingSet(new Set(stillInJar));
    } catch {
      setUnlockedSet(new Set());
      setRemainingSet(new Set());
    }
  }, []);

  // Initial load + live syncing
  useEffect(() => {
    loadState();

    const reload = () => loadState();
    window.addEventListener('starjar:updated', reload); // fired by StarJar after spawn/wish/reset

    const onStorage = (e) => {
      if (e.key === KEYS.unlocked || e.key === KEYS.stars) loadState();
    };
    window.addEventListener('storage', onStorage);

    const onVisible = () => {
      if (document.visibilityState === 'visible') loadState();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('starjar:updated', reload);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadState]);

  // Decide unlocked status:
  // - If jar has data, an item is unlocked if it's NOT in remainingSet or is in unlockedSet
  // - If jar is empty (e.g., after full clear), fall back to unlockedSet
  const items = useMemo(() => {
    const jarHasData = remainingSet.size > 0;
    const withFlags = compliments.map((c) => {
      const unlockedByList = unlockedSet.has(c.text);
      const unlockedByJar = jarHasData && !remainingSet.has(c.text);
      return { ...c, unlocked: unlockedByList || unlockedByJar };
    });
    return withFlags.sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  }, [unlockedSet, remainingSet]);

  // Close modal on ESC
  useEffect(() => {
    if (!modalItem) return;
    const onKey = (e) => e.key === 'Escape' && setModalItem(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalItem]);

  return (
    <div className="max-w-xl mx-auto px-4 pt-4 pb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[#6D679D]">I like you for...</h2>
        <button
          onClick={loadState}
          className="text-sm px-3 py-1 rounded-full border border-[#d6d2e8] bg-white hover:bg-[#f3f0fa] transition"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {items.map((c) => {
          const isUnlocked = c.unlocked;
          const displayName = isUnlocked ? c.text : 'XXX';

          const openModal = () => {
            if (!isUnlocked) return; // guard
            setModalItem({
              text: c.text,
              image: asset(c.image),
              description: c.description,
            });
          };

          return (
            <button
              key={c.text}
              type="button"
              onClick={openModal}
              disabled={!isUnlocked} // <- ensures click only fires for unlocked
              title={isUnlocked ? c.text : 'Locked!'}
              className={`relative rounded-xl p-3 border shadow-sm text-left transition
                         ${isUnlocked
                           ? 'bg-white hover:shadow cursor-pointer'
                           : 'bg-gray-50 cursor-not-allowed'}`}
            >
              <div className="w-14 h-14 mx-auto relative">
                <img
                  src={asset(c.image)}
                  alt={isUnlocked ? c.text : 'Locked star'}
                  className={`w-full h-full object-contain ${
                    isUnlocked ? '' : 'opacity-50 saturate-0'
                  }`}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = asset('/stars/default.PNG');
                  }}
                />

                {/* Revert to the bolder LOCKED overlay you liked */}
                {!isUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-full
                                     bg-white/85 border border-gray-200 text-gray-600">
                      Locked
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-2 text-center">
                <div className="text-xs font-medium text-[#6D679D]">{displayName}</div>
                {isUnlocked ? (
                  <div className="text-[11px] text-gray-500 line-clamp-2 mt-1">
                    {c.description}
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-400 mt-1">Secret!</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-500 mt-4">
        {items.filter((i) => i.unlocked).length}/{compliments.length} collected
      </p>

      {/* Modal */}
      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setModalItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setModalItem(null)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="flex flex-col items-center text-center">
              <img
                src={modalItem.image}
                alt={modalItem.text}
                className="w-16 h-16 mb-3"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = asset('/stars/default.PNG');
                }}
              />
              <h3 className="text-lg font-bold text-[#6D679D]">{modalItem.text}</h3>
              <p className="text-sm text-gray-600 mt-2">{modalItem.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
