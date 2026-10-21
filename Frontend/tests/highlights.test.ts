import { test } from 'node:test';
import assert from 'node:assert/strict';
import { highlightMatches } from '../src/Utils/HighlightUtils.ts';
import type { Content } from '../src/Models/types.ts';

const clip = {
  title: '🎯 Headshot · AK-47 - Mirage',
  bookmarks: [{ type: 'Kill', map: 'de_mirage', weapon: 'weapon_ak47', isHeadshot: true }],
} as unknown as Content;
test('filters combine map, weapon and event', () => {
  assert.equal(highlightMatches(clip, 'de_mirage', 'weapon_ak47', 'headshot'), true);
  assert.equal(highlightMatches(clip, 'de_dust2', 'weapon_ak47', 'headshot'), false);
  assert.equal(highlightMatches(clip, 'de_mirage', 'weapon_awp', 'headshot'), false);
  assert.equal(highlightMatches(clip, 'de_mirage', 'weapon_ak47', 'onetap'), false);
});
test('unfiltered legacy clips stay visible', () => {
  assert.equal(highlightMatches({ bookmarks: [] } as unknown as Content, '', '', ''), true);
  assert.equal(
    highlightMatches({ bookmarks: [] } as unknown as Content, 'de_mirage', '', ''),
    false,
  );
});
