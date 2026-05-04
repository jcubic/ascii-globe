import data from './death-star';

const root: any = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {};
const G = root.Globe = root.Globe || {};
G.maps = G.maps || {};
G.maps['death-star'] = data;
