using Segra.Backend.Core.Models;

namespace Segra.Backend.Games.CounterStrike2;

public static class HighlightTitle
{
    public static string? FromBookmarks(IEnumerable<Bookmark> bookmarks)
    {
        var kills = bookmarks.Where(b => b.Type == BookmarkType.Kill).ToList();
        if (!kills.Any(b => !string.IsNullOrWhiteSpace(b.Map))) return null;
        bool multipleRounds = kills.Select(b => (b.Map, b.Round)).Distinct().Count() > 1 && kills.Any(b => b.Round.HasValue);
        int count = kills.All(b => b.Round.HasValue) ? kills.Count : Math.Max(kills.Count, kills.Max(b => b.Subtype switch
        {
            BookmarkSubtype.DoubleKill => 2, BookmarkSubtype.TripleKill => 3,
            BookmarkSubtype.QuadKill => 4, BookmarkSubtype.Ace => 5, _ => 1
        }));
        bool ace = !multipleRounds && count >= 5 && kills.Any(b => b.Subtype == BookmarkSubtype.Ace);
        int taps = kills.Count(b => b.IsOneTap);
        bool headshot = kills.Any(b => b.IsHeadshot || b.Subtype == BookmarkSubtype.Headshot);
        string label = multipleRounds ? $"💥 {kills.Count} Kills" : count switch
        {
            >= 5 when ace => $"🏆 {count}K ACE", >= 5 => $"🔥 {count}K", 4 => "🔥 4K", 3 => "👊 3K", 2 => "✌️ 2K",
            _ when taps > 0 => "☝️ One Tap", _ when headshot => "🎯 Headshot", _ => "💥 Kill"
        };
        var details = new List<string>();
        if (count > 1 && taps > 0) details.Add($"☝️ 1tap{(taps > 1 ? $" x{taps}" : "")}");
        if (kills.Any(b => b.IsCollateral)) details.Add("👾 collateral");
        if (count > 1 && headshot && taps == 0) details.Add("🎯 HS");
        if (details.Count > 0) label += $" ({string.Join(", ", details)})";
        var weapons = kills.Select(b => WeaponName(b.Weapon) is string w ? w + (b.WeaponIsInferred ? "?" : "") : null).Where(w => w != null).Distinct().ToList();
        if (weapons.Count > 0) label += $" · {string.Join(", ", weapons)}";
        var maps = kills.Select(b => MapName(b.Map)).Where(m => m != null).Distinct();
        return $"{label} - {string.Join(" / ", maps)}";
    }

    public static string? ForExport(string? requestedTitle, string? sourceTitle, IEnumerable<Bookmark> sourceBookmarks, IEnumerable<Bookmark> exportedBookmarks, bool sourceIsAutomatic = false)
    {
        if (!string.IsNullOrWhiteSpace(requestedTitle) &&
            (requestedTitle != sourceTitle || (!sourceIsAutomatic && sourceTitle != FromBookmarks(sourceBookmarks)))) return requestedTitle;
        return FromBookmarks(exportedBookmarks);
    }

    public static string? MapName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        string name = value.Split('/').Last();
        if (name.StartsWith("de_") || name.StartsWith("cs_")) name = name[3..];
        return name switch
        {
            "dust2" => "Dust II", "office" => "Office", "italy" => "Italy",
            _ => System.Globalization.CultureInfo.InvariantCulture.TextInfo.ToTitleCase(name.Replace('_', ' '))
        };
    }

    public static string? WeaponName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        string name = value.StartsWith("weapon_") ? value[7..] : value;
        return name switch
        {
            "ak47" => "AK-47", "m4a1" => "M4A4", "m4a1_silencer" => "M4A1-S",
            "usp_silencer" => "USP-S", "hkp2000" => "P2000", "deagle" => "Desert Eagle",
            "glock" => "Glock-18", "elite" => "Dual Berettas", "fiveseven" => "Five-SeveN",
            "cz75a" => "CZ75-Auto", "revolver" => "R8 Revolver", "tec9" => "Tec-9",
            "ssg08" => "SSG 08", "scar20" => "SCAR-20", "sg556" => "SG 553",
            "galilar" => "Galil AR", "mp5sd" => "MP5-SD", "mac10" => "MAC-10",
            "sawedoff" => "Sawed-Off", "hegrenade" => "HE Grenade",
            "inferno" or "molotov" => "Molotov", "incgrenade" => "Incendiary Grenade",
            _ when name.StartsWith("knife") || name == "bayonet" => "Knife",
            _ => name.Replace('_', ' ').ToUpperInvariant()
        };
    }
}
