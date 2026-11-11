// Videi po kategoriji. Pri svakoj novoj poseti sajtu prikazuje se sledeci video iz liste.
// pos = koji deo kadra se vidi kad se video seče (CSS object-position)
export const CATEGORY_VIDEOS: Record<string, { src: string; poster: string; pos?: string }[]> = {
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
    { src: '/kat-nfl-2.mp4', poster: '/kat-nfl-2.jpg', pos: 'center 30%' }, // utakmica, kadar spusten
  ],
  other: [{ src: '/hero-kartice.mp4', poster: '/hero-kartice.jpg' }],
  all: [{ src: '/hero-kartice.mp4', poster: '/hero-kartice.jpg' }],
};
