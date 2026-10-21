using System.Text.Json;
using Segra.Backend.Core.Models;
using Segra.Backend.Games.CounterStrike2;

int failures = 0;
void Check(string name, string? actual, string? expected)
{
    if (actual == expected) Console.WriteLine($"PASS {name}");
    else { Console.WriteLine($"FAIL {name}: expected '{expected}', got '{actual}'"); failures++; }
}
Bookmark Read(string json) => JsonSerializer.Deserialize<Bookmark>(json)!;
var hs = Read("""{"Type":"Kill","Subtype":"Headshot","Map":"de_mirage","Weapon":"weapon_ak47","IsHeadshot":true}""");
Check("headshot includes weapon and friendly map", HighlightTitle.FromBookmarks([hs]), "🎯 Headshot · AK-47 - Mirage");
var doubleKill = Read("""{"Type":"Kill","Subtype":"DoubleKill","Map":"de_dust2","Weapon":"weapon_deagle"}""");
Check("multi-kill includes weapon", HighlightTitle.FromBookmarks([doubleKill]), "✌️ 2K · Desert Eagle - Dust II");
Check("different weapons are preserved", HighlightTitle.FromBookmarks([hs, doubleKill]), "✌️ 2K (🎯 HS) · AK-47, Desert Eagle - Mirage / Dust II");
Check("legacy bookmarks without context do not invent a map", HighlightTitle.FromBookmarks([new Bookmark { Type = BookmarkType.Kill }]), null);
Check("non-kill events have no highlight title", HighlightTitle.FromBookmarks([new Bookmark { Type = BookmarkType.Death }]), null);
string State(int kills, int hs = 0, int round = 1, string weapon = "weapon_ak47", string player = "self", string map = "de_mirage") =>
    JsonSerializer.Serialize(new {
        provider = new { steamid = "self" },
        map = new { name = map, phase = "live", round }, round = new { phase = "live" },
        player = new { steamid = player, match_stats = new { kills, deaths = 0 },
            state = new { round_kills = kills, round_killhs = hs },
            weapons = new { weapon_0 = new { name = weapon, state = "active", ammo_clip = 25 } } }
    });
var tracker = new Cs2EventTracker();
Check("initial state does not create old kills", tracker.Process(State(5)).Count.ToString(), "0");
Check("round subtotal does not invent kills in this clip", HighlightTitle.FromBookmarks(tracker.Process(State(6, 1))), "🎯 Headshot - Mirage");
// GSI has no per-kill weapon identity: unchanged ammo cannot prove the weapon that killed.
var fresh = new Cs2EventTracker();
fresh.Process(State(0));
Check("single headshot title", HighlightTitle.FromBookmarks(fresh.Process(State(1, 1))), "🎯 Headshot - Mirage");
Check("duplicate update creates no event", fresh.Process(State(1, 1)).Count.ToString(), "0");
Check("spectator updates ignored", fresh.Process(State(9, 5, player: "other")).Count.ToString(), "0");
Check("return from spectator rebases statistics", fresh.Process(State(3, 1)).Count.ToString(), "0");
Check("map switch rebases statistics", fresh.Process(State(4, map: "de_nuke")).Count.ToString(), "0");
var weaponTracker = new Cs2EventTracker();
weaponTracker.Process(State(0).Replace("\"ammo_clip\":25", "\"ammo_clip\":26"));
var weaponEvent = weaponTracker.Process(State(1, 1));
Check("ammo evidence marks a probable weapon", HighlightTitle.FromBookmarks(weaponEvent), "🎯 Headshot · AK-47? - Mirage");
Check("GSI does not falsely confirm one tap", weaponEvent.FirstOrDefault()?.IsOneTap.ToString(), "False");
var multi = new Cs2EventTracker(); multi.Process(State(0));
Check("batched kills are all retained", multi.Process(State(3)).Count.ToString(), "3");
Check("missing statistics are not treated as zero", multi.Process("""{"provider":{"steamid":"self"},"map":{"phase":"live","name":"de_mirage"},"player":{"steamid":"self"}}""").Count.ToString(), "0");
Check("statistics after incomplete update rebase", multi.Process(State(4)).Count.ToString(), "0");
var differentRounds = Enumerable.Range(1, 5).Select(r => Read($$"""{"Type":"Kill","Map":"de_mirage","Round":{{r}}}"""));
Check("kills from five rounds never become an ace", HighlightTitle.FromBookmarks(differentRounds), "💥 5 Kills - Mirage");
var aceRound = Enumerable.Range(1, 5).Select(_ => Read("""{"Type":"Kill","Map":"de_mirage","Round":1,"Subtype":"Ace"}"""));
Check("five kills in an ace round", HighlightTitle.FromBookmarks(aceRound), "🏆 5K ACE - Mirage");
Check("trim regenerates inherited automatic title", HighlightTitle.ForExport("🏆 5K ACE - Mirage", "🏆 5K ACE - Mirage", aceRound, [hs]), "🎯 Headshot · AK-47 - Mirage");
Check("trim preserves a user supplied title", HighlightTitle.ForExport("A minha jogada", "🏆 5K ACE - Mirage", aceRound, [hs]), "A minha jogada");
Check("automatic source flag survives a changed bookmark window", HighlightTitle.ForExport("👊 3K - Mirage", "👊 3K - Mirage", aceRound, [hs], sourceIsAutomatic: true), "🎯 Headshot · AK-47 - Mirage");
var copied = weaponEvent.Single().At(TimeSpan.FromSeconds(2));
Check("replay copy preserves weapon uncertainty", copied.WeaponIsInferred.ToString(), "True");
Check("replay copy retains source identity for deduplication", (copied.Id == weaponEvent.Single().Id).ToString(), "True");
Check("overlapping exported copies get unique identities", (copied.At(TimeSpan.Zero, preserveId: false).Id != copied.At(TimeSpan.FromSeconds(5), preserveId: false).Id).ToString(), "True");
Environment.ExitCode = failures == 0 ? 0 : 1;
