// src/StarJar.js
import React, { useEffect, useState, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import compliments from './complimentData';

// ---------- asset + storage keys ----------
const BUILD_VERSION = '2025-08-11-1'; // bump when you update public assets
const asset = (p) =>
  `${process.env.PUBLIC_URL}${p.startsWith('/') ? p : `/${p}`}?v=${BUILD_VERSION}`;

const APP_NS = (process.env.PUBLIC_URL || '') + ':starjar';
const KEYS = {
  stars: `${APP_NS}:jarStars`,
  unlocked: `${APP_NS}:unlockedCompliments`,
  ver: `${APP_NS}:version`,
};
const STORAGE_VERSION = '1';

// Forewords (onboarding) storage flag
const INTRO_KEY = `${APP_NS}:introDismissed`;

// ---------- mask for in-jar collisions ----------
const maskImageSrc = asset('/jar/spawn-mask.PNG');

const createMaskContext = () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = maskImageSrc;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, 300, 300);
      resolve(ctx);
    };

    img.onerror = () => {
      console.warn('spawn-mask.PNG failed to load:', maskImageSrc);
      resolve(null);
    };
  });
};

const getNonOverlappingPosition = async (existing, radius = 32) => {
  const ctx = await createMaskContext();
  if (!ctx) return { x: 150, y: 180 };

  const halfSize = radius / 2;
  let attempts = 0;

  while (attempts < 1000) {
    const x = Math.floor(Math.random() * 300);
    const y = Math.floor(Math.random() * 300);

    const corners = [
      { x: x - halfSize, y: y - halfSize },
      { x: x + halfSize, y: y - halfSize },
      { x: x - halfSize, y: y + halfSize },
      { x: x + halfSize, y: y + halfSize },
    ];

    const allValid = corners.every(({ x, y }) => {
      if (x < 0 || x >= 300 || y < 0 || y >= 300) return false;
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      return pixel[3] >= 50;
    });

    const notTooClose = existing.every((pos) => {
      const dx = pos.x - x;
      const dy = pos.y - y;
      return dx * dx + dy * dy > radius * radius;
    });

    if (allValid && notTooClose) return { x, y };
    attempts++;
  }

  return { x: 150, y: 180 };
};

// ---------- Slide Card (Forewords) ----------
function IntroSlideCard({ open, slides, index, setIndex, onClose, onNeverShow }) {
  const canBack = index > 0;
  const canNext = index < slides.length - 1;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="w-full sm:w-[440px] mx-4 sm:mx-0 rounded-2xl shadow-xl border border-[#E9E3F9] bg-white"
      >
        {/* Header */}
        <div
          className="px-5 pt-4 pb-3 rounded-t-2xl flex items-start justify-between border-b border-[#E9E3F9]"
          style={{
            backgroundColor: '#F8F7FC',
          }}
        >
          <h3 className="text-lg font-semibold" style={{ color: '#6D679D' }}>
            {slides[index].title}
          </h3>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm text-gray-600">{slides[index].body}</p>

          {/* Pager dots */}
          <div className="mt-4 flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className="w-2.5 h-2.5 rounded-full transition"
                style={{
                  backgroundColor: i === index ? '#6D679D' : '#D6D2E8',
                  opacity: i === index ? 1 : 0.9,
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Footer buttons */}
          <div className="mt-5 mb-4 flex items-center justify-between">
            <button
              onClick={onNeverShow}
              className="text-xs underline"
              style={{ color: '#6D679D' }}
            >
              Don’t show again
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => canBack && setIndex(index - 1)}
                disabled={!canBack}
                className={`px-3 py-1.5 rounded-full border text-sm transition ${
                  canBack ? 'hover:bg-white/60' : 'cursor-not-allowed opacity-60'
                }`}
                style={{ borderColor: '#D6D2E8', color: '#6D679D', background: 'white' }}
              >
                Back
              </button>

              {canNext ? (
                <button
                  onClick={() => setIndex(index + 1)}
                  className="px-4 py-1.5 rounded-full text-sm text-white transition"
                  style={{ background: '#6D679D' }}
                >
                  Okay?
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-full text-sm text-white transition"
                  style={{ background: '#6D679D' }}
                >
                  Stars!
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ---------- Star image ----------
const Star = React.forwardRef(({ src, x, y, updateFinalPosition }, ref) => {
  const controls = useAnimation();
  const [mounted, setMounted] = useState(false);

  // prevent jump: set transform once, don't re-init on re-render
  useEffect(() => {
    controls.set({ x: x - 16, y: y - 16, scale: 1 });
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useImperativeHandle(ref, () => ({
    async shake() {
      if (!mounted) return;

      const ctx = await createMaskContext();
      if (!ctx) return;

      const starSize = 32;
      const halfSize = starSize / 2;

      let finalX = x;
      let finalY = y;

      for (let i = 0; i < 8; i++) {
        let newX = finalX + (Math.random() - 0.5) * 20;
        let newY = finalY + (Math.random() - 0.5) * 20;

        const corners = [
          { x: newX - halfSize, y: newY - halfSize },
          { x: newX + halfSize, y: newY - halfSize },
          { x: newX - halfSize, y: newY + halfSize },
          { x: newX + halfSize, y: newY + halfSize },
        ];

        const isValid = corners.every(({ x, y }) => {
          if (x < 0 || x >= 300 || y < 0 || y >= 300) return false;
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          return pixel[3] >= 50;
        });

        if (!isValid) continue;

        await controls.start({
          x: newX - 16,
          y: newY - 16,
          transition: { duration: 0.08 },
        });

        finalX = newX;
        finalY = newY;
      }

      await controls.start({
        x: finalX - 16,
        y: finalY - 16,
        transition: { duration: 0.4, ease: 'easeOut' },
      });

      updateFinalPosition(finalX, finalY);
    },
  }));

  return (
    <motion.img
      src={asset(src)}
      alt="star"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = asset('/stars/default.PNG');
      }}
      className="absolute w-8 h-8 pointer-events-none"
      animate={controls}
      initial={false}
      layout={false}
      style={{ zIndex: 5 }}
    />
  );
});

// ---------- Main component ----------
export default function StarJar({ onComplimentUnlocked }) {
  const [stars, setStars] = useState([]); // [{id, src (relative), x, y, compliment}]
  const [hasSpawned, setHasSpawned] = useState(false);
  const [wish, setWish] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const [selectedCompliment, setSelectedCompliment] = useState(null);

  // Intro deck state
  const [showIntro, setShowIntro] = useState(false);
  const [introIndex, setIntroIndex] = useState(0);
  const forewords = [
    {
      title: 'oh:0',
      body:
        "",
      hint: "Press 'Next' to continue!",
    },
    {
      title: "You found this...",
      body:
        "you really shouldn't be seeing this... i made it for someone very important to me...",
    },
    {
      title: 'But since you are here...',
      body:
        'if you also have someone very dear to you that you just want to shower them with compliments...',
    },
    {
      title: 'I have something for you? Maybe?',
      body:
        'I have this star jar for you to play around! Write something down for a special person, or even better, for yourself!',
    },
    {
      title: 'Write your own',
      body:
        'and I will save mine for my special boy :>',
    },
  ];

  const starRefs = useRef([]);

  // ---- load once on mount ----
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEYS.ver);
      if (v !== STORAGE_VERSION) {
        localStorage.setItem(KEYS.ver, STORAGE_VERSION);
      }
      const saved = JSON.parse(localStorage.getItem(KEYS.stars) || '[]');
      if (Array.isArray(saved) && saved.length > 0) {
        setStars(saved); // saved uses RELATIVE image paths
        setHasSpawned(true);
        starRefs.current = saved.map(() => React.createRef());
      } else {
        setHasSpawned(false);
      }
    } catch (e) {
      console.warn('Failed to load saved jar:', e);
    }
  }, []);

  // ---- show intro if not dismissed and not spawned ----
  useEffect(() => {
    const dismissed = localStorage.getItem(INTRO_KEY) === '1';
    if (!dismissed && !hasSpawned) {
      setIntroIndex(0);
      setShowIntro(true);
    }
  }, [hasSpawned]);

  // ---- persist when stars change (after spawn) ----
  useEffect(() => {
    if (!hasSpawned) return;
    try {
      localStorage.setItem(KEYS.stars, JSON.stringify(stars));
    } catch (e) {
      console.warn('Failed to save jar:', e);
    }
  }, [stars, hasSpawned]);

  // ---- keep refs array aligned with stars array ----
  useEffect(() => {
    if (starRefs.current.length !== stars.length) {
      starRefs.current = stars.map((_, i) => starRefs.current[i] || React.createRef());
    }
  }, [stars]);

  const spawnStars = async () => {
    const generated = [];
    for (let i = 0; i < compliments.length; i++) {
      const pos = await getNonOverlappingPosition(generated);
      generated.push({
        id: `star-${i}`,
        src: compliments[i].image, // save RELATIVE path
        x: pos.x,
        y: pos.y,
        compliment: compliments[i].text,
      });
    }
    setStars(generated);
    setHasSpawned(true);
    setWish('');
    setShowVideo(false);
    starRefs.current = generated.map(() => React.createRef());

    localStorage.setItem(KEYS.stars, JSON.stringify(generated));
    window.dispatchEvent(new Event('starjar:updated'));
  };

  // update by ID (not index)
  const updateStarPosition = (id, x, y) => {
    setStars((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)));
  };

  const shakeStars = async () => {
    if (starRefs.current.length !== stars.length) {
      starRefs.current = stars.map((_, i) => starRefs.current[i] || React.createRef());
    }
    await Promise.all(starRefs.current.map((ref) => ref.current?.shake?.()));
  };

  const makeWish = async () => {
    if (!hasSpawned || stars.length === 0) return;

    await shakeStars(); // do motion first

    // pick a star
    const idx = Math.floor(Math.random() * stars.length);
    const picked = stars[idx];

    // filename helper: strip cache/query/hash
    const filename = (url = '') => url.split('/').pop().split('?')[0].split('#')[0];

    const pickedFile = filename(picked.src); // e.g. "pink1.PNG"
    const complimentText = compliments.find((c) => filename(c.image) === pickedFile)?.text;
    if (!complimentText) return;

    // compute next state BEFORE writing
    const nextStars = stars.filter((_, i) => i !== idx);

    // keep refs aligned (remove the same index)
    if (starRefs.current?.length) {
      starRefs.current.splice(idx, 1);
    }

    // update storage FIRST so listeners see the latest
    localStorage.setItem(KEYS.stars, JSON.stringify(nextStars));
    const prevUnlocked = JSON.parse(localStorage.getItem(KEYS.unlocked) || '[]');
    const nextUnlocked = [...new Set([...prevUnlocked, complimentText])];
    localStorage.setItem(KEYS.unlocked, JSON.stringify(nextUnlocked));

    // notify Dex (and any others) to reload
    window.dispatchEvent(new Event('starjar:updated'));

    // now update UI state
    setStars(nextStars);
    setWish(complimentText);
    setShowVideo(true);

    if (typeof onComplimentUnlocked === 'function') {
      onComplimentUnlocked(complimentText);
    }
  };

  const resetJar = () => {
    localStorage.removeItem(KEYS.stars);
    localStorage.removeItem(KEYS.unlocked);
    // show intro again on reset
    localStorage.removeItem(INTRO_KEY);
    setIntroIndex(0);
    setShowIntro(true);

    setStars([]);
    setHasSpawned(false);
    setWish(null);
    setShowVideo(false);
    setSelectedCompliment(null);
    setPasswordInput('');
    setShowResetModal(false);
    starRefs.current = [];
    window.dispatchEvent(new Event('starjar:updated'));
  };

  const [showResetModal, setShowResetModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const handlePasswordSubmit = () => {
    if (passwordInput === 'kakalove0608') {
      resetJar();
    } else {
      alert('Why you trying to break the law');
    }
  };

  return (
    <div className="flex flex-col items-center mt-10">
      <div className="relative w-[300px] h-[300px]">
        <img
          src={asset('/jar/back.PNG')}
          alt="jar back"
          className="absolute inset-0 w-full h-full object-contain z-0"
        />

        {stars.map((star, i) =>
          star?.src ? (
            <Star
              key={star.id}
              src={star.src} // relative here; Star wraps with asset()
              x={star.x}
              y={star.y}
              ref={starRefs.current[i]}
              updateFinalPosition={(x, y) => updateStarPosition(star.id, x, y)}
            />
          ) : null
        )}

        <img
          src={asset('/jar/lid.PNG')}
          alt="jar lid"
          className="absolute inset-0 w-full h-full object-contain z-10"
        />
      </div>

      <div className="flex gap-4 mt-6 flex-wrap justify-center">
        {!hasSpawned ? (
          <motion.button
            className="bg-[#D8D1EF] hover:bg-[#CFC6EA]
                       text-[#5C5575] text-lg px-6 py-3 rounded-full
                       shadow-md font-semibold transition
                       hover:scale-105 duration-200 ease-out
                       backdrop-blur-sm border border-[#E9E3F9]"
            onClick={spawnStars}
          >
            Press me!
          </motion.button>
        ) : (
          <>
            <motion.button
              className="bg-white/30 backdrop-blur-md
                         border border-[#D1D9EC] text-sm text-[#555]
                         px-4 py-2 rounded-full shadow-sm
                         hover:bg-white/50 hover:scale-105 transition"
              onClick={shakeStars}
            >
              Shake me
            </motion.button>

            <motion.button
              className="bg-[#bdaddb] hover:bg-[#b2d0f7] text-white
                         text-lg px-6 py-3 rounded-full font-semibold
                         shadow-md transition hover:scale-105 disabled:opacity-50"
              onClick={makeWish}
              disabled={stars.length === 0}
            >
              Make a wish!
            </motion.button>
          </>
        )}
      </div>

      <div className="mt-7 text-center h-24 flex items-center justify-center">
        {showVideo && (
          <video
            playsInline
            autoPlay
            muted
            disablePictureInPicture
            className="w-49 h-36 object-contain"
            onEnded={() => setShowVideo(false)}
          >
            <source src={asset('/stars/unravel.mp4')} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}

        {!showVideo && wish && (
          <div className="text-center flex flex-col items-center gap-2">
            <p className="text-[#6D679D] text-xl font-semibold">✨ {wish} ✨</p>
            <button
              onClick={() => {
                const c = compliments.find((cc) => cc.text === wish);
                const image = c?.image || '/stars/default.PNG';

                setSelectedCompliment({
                  text: c?.text || wish,
                  image: asset(image),
                  description:
                    c?.description ||
                    'This star reflects one of your amazing qualities. Keep collecting more!',
                  locked: false,
                });
              }}
              className="mt-1 px-3 py-1 rounded-full text-sm bg-white text-[#6D679D] border border-[#d6d2e8] hover:bg-[#f3f0fa] transition"
            >
              Read more
            </button>
          </div>
        )}
      </div>

      {selectedCompliment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full relative text-center">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setSelectedCompliment(null)}
            >
              ✕
            </button>
            <img
              src={selectedCompliment.image}
              alt={selectedCompliment.text}
              className="w-16 h-16 mx-auto mb-4"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = asset('/stars/default.PNG');
              }}
            />
            <h3 className="text-lg font-bold text-[#6D679D]">
              {selectedCompliment.text}
            </h3>
            <p className="text-sm text-gray-500 mt-2">{selectedCompliment.description}</p>
          </div>
        </div>
      )}

      {/* Reset Button Fixed Bottom Right */}
      {hasSpawned && (
        <button
          className="fixed bottom-4 right-4 bg-[#D3DCE6] hover:bg-[#C6D0DB] text-sm text-black px-4 py-2 rounded-full shadow z-50"
          onClick={() => setShowResetModal(true)}
        >
          Reset Jar
        </button>
      )}

      {/* Help / About button to reopen intro */}
      {!showIntro && (
        <button
          className="fixed bottom-4 left-4 bg-white/80 backdrop-blur-md border text-xs px-2 py-1 rounded-full shadow"
          style={{ borderColor: '#E9E3F9', color: '#6D679D' }}
          onClick={() => setShowIntro(true)}
          title="About this app"
        >
          ?
        </button>
      )}

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80 text-center">
            <h3 className="text-lg font-semibold mb-4">Enter password to reset</h3>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded mb-4"
              placeholder="Password"
            />
            <div className="flex justify-center gap-4">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                onClick={handlePasswordSubmit}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forewords Slide Card */}
      <IntroSlideCard
        open={showIntro}
        slides={forewords}
        index={introIndex}
        setIndex={setIntroIndex}
        onClose={() => {
          setShowIntro(false);
          localStorage.setItem(INTRO_KEY, '1'); // one-time dismiss on close
        }}
        onNeverShow={() => {
          localStorage.setItem(INTRO_KEY, '1');
          setShowIntro(false);
        }}
      />
    </div>
  );
}
