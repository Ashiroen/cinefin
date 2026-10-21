/// <reference types="vite/client" />

declare module '*.svg' {
  const src: string;
  export default src;
}

interface Window {
  __CINEFIN_PLEX_TV__?: string;
}
