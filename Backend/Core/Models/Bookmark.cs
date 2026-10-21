using System.Text.Json.Serialization;

namespace Segra.Backend.Core.Models
{
    public class Bookmark
    {
        private static readonly Random random = new();
        public int Id { get; set; } = random.Next(1, int.MaxValue);
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public BookmarkType Type { get; set; }
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public BookmarkSubtype? Subtype { get; set; }
        public TimeSpan Time { get; set; }
        public DateTime? OccurredAt { get; set; }
        public string? Map { get; set; }
        public string? Weapon { get; set; }
        public bool WeaponIsInferred { get; set; }
        public int? Round { get; set; }
        public bool IsHeadshot { get; set; }
        // These labels are only set when a source can confirm the shot that caused the kill.
        public bool IsOneTap { get; set; }
        public bool IsCollateral { get; set; }

        public Bookmark At(TimeSpan time, bool preserveId = true) => new()
        {
            Id = preserveId ? Id : random.Next(1, int.MaxValue), Type = Type, Subtype = Subtype, Time = time, OccurredAt = OccurredAt,
            Map = Map, Weapon = Weapon, WeaponIsInferred = WeaponIsInferred, Round = Round, IsHeadshot = IsHeadshot,
            IsOneTap = IsOneTap, IsCollateral = IsCollateral
        };
    }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum BookmarkType
    {
        Manual,
        [IncludeInHighlight] Kill,
        [IncludeInHighlight] Goal,
        Assist,
        Death
    }

    /// <summary>
    /// Marks a BookmarkType as one that should be included in auto-generated highlights.
    /// </summary>
    [AttributeUsage(AttributeTargets.Field)]
    public class IncludeInHighlightAttribute : Attribute { }

    public static class BookmarkTypeExtensions
    {
        /// <summary>
        /// Returns true if this bookmark type should be included in auto-generated highlights.
        /// </summary>
        public static bool IncludeInHighlight(this BookmarkType type) =>
            typeof(BookmarkType).GetField(type.ToString())!
                .GetCustomAttributes(typeof(IncludeInHighlightAttribute), false).Length > 0;
    }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum BookmarkSubtype
    {
        Headshot,
        DoubleKill,
        TripleKill,
        QuadKill,
        Ace
    }
}
