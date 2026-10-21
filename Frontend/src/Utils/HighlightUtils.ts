import type { Content } from '../Models/types';

export function highlightMatches(
  content: Content,
  map: string,
  weapon: string,
  event: string,
): boolean {
  const bookmarks = content.bookmarks ?? [];
  if (map && !bookmarks.some((b) => b.map === map)) return false;
  if (weapon && !bookmarks.some((b) => b.weapon === weapon)) return false;
  if (!event) return true;
  const kills = bookmarks.filter((b) => b.type === 'Kill');
  switch (event) {
    case 'headshot':
      return kills.some((b) => b.isHeadshot || b.subtype === 'Headshot');
    case 'onetap':
      return kills.some((b) => b.isOneTap);
    case 'collateral':
      return kills.some((b) => b.isCollateral);
    case 'multi':
      return (
        kills.length > 1 ||
        kills.some((b) => ['DoubleKill', 'TripleKill', 'QuadKill', 'Ace'].includes(b.subtype ?? ''))
      );
    case 'ace':
      return kills.some((b) => b.subtype === 'Ace');
    default:
      return true;
  }
}

export const mapLabel = (value: string) =>
  value
    .split('/')
    .pop()!
    .replace(/^(de|cs)_/, '')
    .replace(/^dust2$/, 'Dust II')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const weaponLabel = (value: string) =>
  ({
    weapon_ak47: 'AK-47',
    weapon_deagle: 'Desert Eagle',
    weapon_m4a1: 'M4A4',
    weapon_m4a1_silencer: 'M4A1-S',
    weapon_usp_silencer: 'USP-S',
    weapon_hkp2000: 'P2000',
    weapon_glock: 'Glock-18',
    weapon_ssg08: 'SSG 08',
    weapon_galilar: 'Galil AR',
    weapon_sg556: 'SG 553',
    weapon_elite: 'Dual Berettas',
    weapon_fiveseven: 'Five-SeveN',
    weapon_cz75a: 'CZ75-Auto',
    weapon_tec9: 'Tec-9',
    weapon_mp5sd: 'MP5-SD',
    weapon_mac10: 'MAC-10',
  })[value] ??
  value
    .replace(/^weapon_/, '')
    .replace(/_/g, ' ')
    .toUpperCase();
