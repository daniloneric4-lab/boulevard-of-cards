'use client';
import { useEffect, useRef, useState } from 'react';

// Animirani logo se pusti jednom i zaustavi na kadru gde je ceo logo vidljiv
// (poslednje sekunde snimka su zatamnjenje, pa ih ne puštamo).
// WEBM sa providnom pozadinom; Safari ne podrzava providni VP9, pa dobija MP4 sa "screen" mesanjem.
const HOLD_AT = 7;

export default function LogoIntro() {
  const [webm, setWebm] = useState(true);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = document.createElement('video');
    const ua = navigator.userAgent;
    const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua);
    if (isSafari || !v.canPlayType('video/webm; codecs="vp9"')) setWebm(false);
  }, []);
  const hold = () => {
    const v = ref.current;
    if (!v) return;
    if (v.currentTime >= HOLD_AT) {
      v.pause();
      v.currentTime = HOLD_AT;
    }
  };
  return (
    <video
      ref={ref}
      key={webm ? 'webm' : 'mp4'}
      className="logo-intro"
      src={webm ? '/logo-intro.webm' : '/logo-intro.mp4'}
      autoPlay
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      onTimeUpdate={hold}
      onEnded={() => {
        if (ref.current) ref.current.currentTime = HOLD_AT;
      }}
      style={webm ? undefined : { mixBlendMode: 'screen' }}
    />
  );
}
