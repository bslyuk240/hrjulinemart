import React, { useEffect, useRef, useState } from 'react';

export default function PullToRefresh({ onRefresh, threshold = 70, children }) {
  const [distance, setDistance] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(null);
  const enabledRef = useRef(false);

  useEffect(() => {
    // Enable only on small/medium screens
    const checkEnabled = () => {
      enabledRef.current = typeof window !== 'undefined' && window.innerWidth < 1024;
    };
    checkEnabled();
    window.addEventListener('resize', checkEnabled);
    return () => window.removeEventListener('resize', checkEnabled);
  }, []);

  useEffect(() => {
    const onTouchStart = (e) => {
      if (!enabledRef.current || refreshing) return;
      // Never hijack scroll gestures that start inside the sidebar.
      if (e.target?.closest?.('[data-sidebar="true"]')) return;
      if (window.scrollY > 0) return; // only when at top
      const touch = e.touches[0];
      startYRef.current = touch.clientY;
      setDistance(0);
      setPulling(true);
    };

    const onTouchMove = (e) => {
      if (!enabledRef.current || !pulling || startYRef.current == null) return;
      const touch = e.touches[0];
      const dy = touch.clientY - startYRef.current;
      if (dy > 0 && window.scrollY === 0) {
        // dampen pull distance
        const damp = dy * 0.5;
        setDistance(Math.min(damp, threshold * 1.8));
        // prevent native overscroll bounce
        e.preventDefault();
      } else {
        setDistance(0);
        setPulling(false);
      }
    };

    const onTouchEnd = async () => {
      if (!enabledRef.current) return;
      if (pulling && distance >= threshold && !refreshing) {
        try {
          setRefreshing(true);
          await (onRefresh ? onRefresh() : Promise.resolve(window.location.reload()))
        } finally {
          // allow a small delay for visual feedback
          setTimeout(() => {
            setRefreshing(false);
            setDistance(0);
          }, 300);
        }
      } else {
        setDistance(0);
        setPulling(false);
      }
      startYRef.current = null;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [pulling, distance, refreshing, onRefresh, threshold]);

  return (
    <div className="relative">
      {/* Indicator fixed near top; respects safe-area via CSS helpers */}
      <div
        className={`pointer-events-none fixed left-0 right-0 flex items-center justify-center z-50 transition-all duration-150 ${
          distance > 0 || refreshing ? '' : 'opacity-0'
        }`}
        style={{
          top: 'calc(var(--safe-area-inset-top) + 8px)',
        }}
      >
        <div className="bg-white/95 backdrop-blur rounded-full shadow px-3 py-1.5 border border-gray-200 text-xs text-gray-700 flex items-center gap-2">
          {!refreshing ? (
            <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          ) : (
            <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full inline-block animate-spin" />
          )}
          <span>{refreshing ? 'Refreshing...' : distance >= threshold ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      </div>
      {children}
    </div>
  );
}
