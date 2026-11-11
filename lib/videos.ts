// Videi po kategoriji. Pri svakoj novoj poseti sajtu prikazuje se sledeci video iz liste.
export const CATEGORY_VIDEOS: Record<string, { src: string; poster: string }[]> = {
  football: [
    { src: '/kat-fudbal-1.mp4', poster: '/kat-fudbal-1.jpg' }, // stadion u boji
    { src: '/kat-fudbal-2.mp4', poster: '/kat-fudbal-2.jpg' }, // dron
  ],
  f1: [
    { src: '/kat-f1-1.mp4', poster: '/kat-f1-1.jpg' }, // generisan: svetla na startu
    { src: '/kat-f1-2.mp4', poster: '/kat-f1-2.jpg' }, // krivina na stazi
  ],
  nba: [{ src: '/kat-nba-1.mp4', poster: '/kat-nba-1.jpg' }],
  nfl: [
    { src: '/kat-nfl-1.mp4', poster: '/kat-nfl-1.jpg' }, // generisan
    { src: '/kat-nfl-2.mp4', poster: '/kat-nfl-2.jpg' }, // utakmica
  ],
  other: [{ src: '/hero-kartice.mp4', poster: '/hero-kartice.jpg' }],
  all: [{ src: '/hero-kartice.mp4', poster: '/hero-kartice.jpg' }],
};
