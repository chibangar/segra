using Segra.Backend.Core.Models;
using System.Text.Json;

namespace Segra.Backend.Games.CounterStrike2;

public sealed class Cs2EventTracker
{
    private Snapshot? _previous;
    private sealed record Gun(string Name, int? Ammo);
    private sealed record Snapshot(string Player, string Map, int Round, int Kills, int Deaths,
        int? RoundKills, int? Headshots, Dictionary<string, Gun> Weapons);

    private static JsonElement Field(JsonElement parent, string name) =>
        parent.ValueKind == JsonValueKind.Object && parent.TryGetProperty(name, out var value) ? value : default;
    private static string? Text(JsonElement parent, string name) =>
        Field(parent, name) is var value && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
    private static int? Number(JsonElement parent, string name) =>
        Field(parent, name) is var value && value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var n) ? n : null;

    // Called serially in arrival order by the HTTP integration.
    public IReadOnlyList<Bookmark> Process(string payload)
    {
        using var document = JsonDocument.Parse(payload);
        var root = document.RootElement;
        var player = Field(root, "player"); var map = Field(root, "map");
        var stats = Field(player, "match_stats"); var state = Field(player, "state");
        string? id = Text(player, "steamid"), provider = Text(Field(root, "provider"), "steamid");
        string? name = Text(map, "name"), phase = Text(map, "phase");
        int? kills = Number(stats, "kills"), deaths = Number(stats, "deaths");
        if (id == null || id != provider || name == null || phase is not ("live" or "gameover") || kills == null || deaths == null)
        {
            _previous = null;
            return [];
        }
        var weapons = new Dictionary<string, Gun>();
        var inventory = Field(player, "weapons");
        if (inventory.ValueKind == JsonValueKind.Object)
            foreach (var entry in inventory.EnumerateObject())
                if (Text(entry.Value, "name") is string gun)
                    weapons[gun] = new Gun(gun, Number(entry.Value, "ammo_clip"));
        var current = new Snapshot(id, name, Number(map, "round") ?? -1, kills.Value, deaths.Value,
            Number(state, "round_kills"), Number(state, "round_killhs"), weapons);
        var previous = _previous;
        _previous = current;
        if (previous == null || previous.Player != id || previous.Map != name ||
            current.Kills < previous.Kills || current.Deaths < previous.Deaths) return [];

        int gained = current.Kills - previous.Kills;
        int headshots = Math.Clamp((current.Headshots ?? 0) - (previous.Round == current.Round ? previous.Headshots ?? 0 : 0), 0, gained);
        // Only attribute a firearm when exactly one inventory weapon consumed ammunition.
        // The active weapon alone is unsafe (grenade kills and weapon switches are delayed).
        var fired = weapons.Values.Where(w => w.Ammo.HasValue && previous.Weapons.TryGetValue(w.Name, out var old)
            && old.Ammo.HasValue && w.Ammo < old.Ammo).ToList();
        string? weapon = fired.Count == 1 ? fired[0].Name : null;
        var events = new List<Bookmark>();
        int roundKills = current.RoundKills ?? (previous.Round == current.Round ? (previous.RoundKills ?? 0) + gained : gained);
        for (int i = 0; i < gained; i++)
        {
            int count = Math.Max(1, roundKills - gained + i + 1);
            bool hs = i < headshots;
            events.Add(new Bookmark
            {
                Type = BookmarkType.Kill, Map = name, Round = current.Round, Weapon = weapon, WeaponIsInferred = weapon != null,
                IsHeadshot = hs,
                Subtype = count switch
                {
                    >= 5 => BookmarkSubtype.Ace, 4 => BookmarkSubtype.QuadKill,
                    3 => BookmarkSubtype.TripleKill, 2 => BookmarkSubtype.DoubleKill,
                    _ when hs => BookmarkSubtype.Headshot, _ => null
                }
                // GSI batches counters. Even one ammo decrement cannot confirm a one tap
                // or collateral, so those labels remain unset without per-shot evidence.
            });
        }
        for (int i = previous.Deaths; i < current.Deaths; i++)
            events.Add(new Bookmark { Type = BookmarkType.Death, Map = name, Round = current.Round });
        return events;
    }
}
