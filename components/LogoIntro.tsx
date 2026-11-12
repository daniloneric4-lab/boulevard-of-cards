'use client';
import { useEffect, useState } from 'react';

// Animirani logo se pusti jednom i ostane na poslednjem kadru.
// Animirani logo: WEBM sa providnom pozadinom; Safari ne podrzava providni VP9, pa dobija MP4 sa "screen" mesanjem.
export default function LogoIntro() {
  const [webm, setWebm] = useState(true);
  useEffect(() => {
    const v = document.createElement('video');
    const ua = navigator.userAgent;
    const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua);
    if (isSafari || !v.canPlayType('video/webm; codecs="vp9"')) setWebm(false);
  }, []);
  return (
    <video
      key={webm ? 'webm' : 'mp4'}
      className="logo-intro"
      src={webm ? '/logo-intro.webm' : '/logo-intro.mp4'}
      autoPlay
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      style={webm ? undefined : { mixBlendMode: 'screen' }}
    />
  );
}
