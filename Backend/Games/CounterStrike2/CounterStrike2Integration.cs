using Serilog;
using System.Net;
using System.Text;
using System.Text.Json;
using Segra.Backend.App;
using Segra.Backend.Core.Models;

namespace Segra.Backend.Games.CounterStrike2
{
    internal class CounterStrike2Integration : Integration, IDisposable
    {
        private readonly HttpListener _listener = new();
        private const string Prefix = "http://127.0.0.1:1340/";
        private int _lastValidKills = 0;
        private int _lastValidDeaths = 0;
        private int _currentRound = -1;
        private int _roundKills = 0;
        private string? _lastRoundPhase = null;
        private bool _initialStatsCaptured = false;

        private class GameState
        {
            [System.Text.Json.Serialization.JsonPropertyName("player")]
            public Player? Player { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("provider")]
            public Provider? Provider { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("map")]
            public Map? Map { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("round")]
            public Round? Round { get; set; }
        }

        private class Player
        {
            [System.Text.Json.Serialization.JsonPropertyName("steamid")]
            public string? SteamId { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("match_stats")]
            public MatchStats? MatchStats { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("state")]
            public PlayerState? State { get; set; }
        }

        private class PlayerState
        {
            [System.Text.Json.Serialization.JsonPropertyName("health")]
            public int? Health { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("round_kills")]
            public int? RoundKills { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("round_killhs")]
            public int? RoundKillHs { get; set; }
        }

        private class Provider
        {
            [System.Text.Json.Serialization.JsonPropertyName("steamid")]
            public string? SteamId { get; set; }
        }

        private class Round
        {
            [System.Text.Json.Serialization.JsonPropertyName("phase")]
            public string? Phase { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("win_team")]
            public string? WinTeam { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("bomb")]
            public string? Bomb { get; set; }
        }

        private class Map
        {
            [System.Text.Json.Serialization.JsonPropertyName("phase")]
            public string? Phase { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("round")]
            public int? Round { get; set; }
        }

        private class MatchStats
        {
            [System.Text.Json.Serialization.JsonPropertyName("kills")]
            public int? Kills { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("deaths")]
            public int? Deaths { get; set; }
        }

        public override async Task Start()
        {
            try
            {
                EnsureCfgExists();
                InitializeListener();
                Log.Information($"Counter Strike 2 integration listening on {Prefix}");
                while (_listener.IsListening)
                {
                    try
                    {
                        HttpListenerContext context = await _listener.GetContextAsync();

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                await HandleRequest(context);
                            }
                            catch (Exception ex)
                            {
                                Log.Warning($"Error handling CS2 request: {ex.Message}");
                            }
                        });
                    }
                    catch (Exception ex) when (ex is ObjectDisposedException or HttpListenerException)
                    {
                        Log.Information("CS2 integration listener stopped");
                        break;
                    }
                    catch (Exception ex)
                    {
                        Log.Warning($"CS2 integration error: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                Log.Error($"Failed to start CS2 integration: {ex.Message}");
            }
        }

        public override Task Shutdown()
        {
            Log.Information("Shutting down CS2 integration");
            try
            {
                _listener.Stop();
                _listener.Close();
            }
            catch (Exception ex)
            {
                Log.Warning($"Error shutting down CS2 integration: {ex.Message}");
            }
            return Task.CompletedTask;
        }

        public void Dispose() => Shutdown().Wait();

        private void InitializeListener()
        {
            _listener.Prefixes.Add(Prefix);
            _listener.Start();
        }

        private async Task HandleRequest(HttpListenerContext context)
        {
            try
            {
                if (context.Request.HttpMethod == "POST")
                {
                    string body = await ReadRequestBodyAsync(context.Request);
                    GameState gameState = DeserializeState(body);
                    ProcessGameState(gameState);
                }
            }
            catch (Exception ex)
            {
                Log.Warning($"Error handling CS2 request: {ex.Message}");
            }
            finally
            {
                await WriteResponseAsync(context.Response);
                context.Response.Close();
            }
        }

        private async Task<string> ReadRequestBodyAsync(HttpListenerRequest request)
        {
            using var reader = new StreamReader(request.InputStream, Encoding.UTF8);
            return await reader.ReadToEndAsync();
        }

        private async Task WriteResponseAsync(HttpListenerResponse response)
        {
            byte[] buffer = Encoding.UTF8.GetBytes("");
            response.ContentLength64 = buffer.Length;
            using (Stream output = response.OutputStream)
            {
                await output.WriteAsync(buffer, 0, buffer.Length);
            }
        }

        private GameState DeserializeState(string body)
        {
            try
            {
                return JsonSerializer.Deserialize<GameState>(body, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }) ?? new GameState();
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to deserialize CS2 state\n{Body}", body);
                return new GameState();
            }
        }

        private void ProcessGameState(GameState gameState)
        {
            try
            {
                if (!IsValidState(gameState))
                {
                    return;
                }

                ProcessStatChanges(gameState);
            }
            catch (Exception ex)
            {
                Log.Warning($"Error processing game state: {ex.Message}");
            }
        }

        private void ProcessStatChanges(GameState gameState)
        {
            var currentKills = gameState.Player?.MatchStats?.Kills ?? 0;
            var currentDeaths = gameState.Player?.MatchStats?.Deaths ?? 0;

            // Track round changes to reset round kills
            int? mapRound = gameState.Map?.Round;
            string? roundPhase = gameState.Round?.Phase;

            if (mapRound.HasValue && mapRound.Value != _currentRound)
            {
                Log.Information($"CS2 round changed: {_currentRound} -> {mapRound.Value}");
                _currentRound = mapRound.Value;
                _roundKills = 0;
            }

            if (roundPhase != null && !string.Equals(roundPhase, _lastRoundPhase, StringComparison.OrdinalIgnoreCase))
            {
                if (string.Equals(roundPhase, "freezetime", StringComparison.OrdinalIgnoreCase))
                {
                    Log.Information("CS2 round freezetime started, resetting round kills");
                    _roundKills = 0;
                }
                _lastRoundPhase = roundPhase;
            }

            if (!_initialStatsCaptured)
            {
                Log.Information($"Initial CS2 stats captured: K:{currentKills} D:{currentDeaths}");
                _lastValidKills = currentKills;
                _lastValidDeaths = currentDeaths;
                _initialStatsCaptured = true;
                return;
            }

            if (currentDeaths < _lastValidDeaths || currentKills < _lastValidKills)
            {
                Log.Information("New game detected, resetting stats");
                _lastValidKills = currentKills;
                _lastValidDeaths = currentDeaths;
                _roundKills = 0;
                _currentRound = mapRound ?? -1;
                return;
            }

            if (currentKills > _lastValidKills)
            {
                int killsGained = currentKills - _lastValidKills;
                Log.Information($"Kill detected: {_lastValidKills} -> {currentKills} (+{killsGained})");

                // If GSI sends round_kills directly from player.state, synchronize with it
                int? gsiRoundKills = gameState.Player?.State?.RoundKills;
                int startKills;

                if (gsiRoundKills.HasValue && gsiRoundKills.Value >= killsGained)
                {
                    _roundKills = gsiRoundKills.Value;
                    startKills = _roundKills - killsGained;
                }
                else
                {
                    startKills = _roundKills;
                    _roundKills += killsGained;
                }

                for (int i = 1; i <= killsGained; i++)
                {
                    int currentK = startKills + i;
                    BookmarkSubtype? subtype = currentK switch
                    {
                        2 => BookmarkSubtype.DoubleKill,
                        3 => BookmarkSubtype.TripleKill,
                        4 => BookmarkSubtype.QuadKill,
                        >= 5 => BookmarkSubtype.Ace,
                        _ => null
                    };

                    if (subtype == BookmarkSubtype.Ace)
                    {
                        Log.Information($"★ ACE DETECTED! ★ Player scored 5+ kills ({currentK}) in round {_currentRound}!");
                    }
                    else if (subtype != null)
                    {
                        Log.Information($"CS2 Multi-Kill detected: {subtype} ({currentK} kills in round)");
                    }

                    AddBookmark(BookmarkType.Kill, subtype);
                }
            }

            if (currentDeaths > _lastValidDeaths)
            {
                int deathsGained = currentDeaths - _lastValidDeaths;
                Log.Information($"Death detected: {_lastValidDeaths} -> {currentDeaths} (+{deathsGained})");

                for (int i = 0; i < deathsGained; i++)
                {
                    AddBookmark(BookmarkType.Death);
                }
            }

            _lastValidKills = currentKills;
            _lastValidDeaths = currentDeaths;
        }

        private static bool IsValidState(GameState gameState)
        {
            if (gameState.Map?.Phase != "live" && gameState.Map?.Phase != "gameover")
            {
                return false;
            }

            if (gameState.Player?.MatchStats == null)
            {
                return false;
            }

            // Check if the player is the same as the provider (this might not be the case if the player is spectating another player)
            if (gameState.Player.SteamId != gameState.Provider?.SteamId)
            {
                return false;
            }

            return true;
        }

        private static void AddBookmark(BookmarkType type, BookmarkSubtype? subtype = null)
        {
            GameIntegrationService.RegisterGameEvent(type, "Counter-Strike 2", subtype);
        }

        private void EnsureCfgExists()
        {
            try
            {
                string? cfgDir = ResolveCfgDirectory(ExePath);
                if (cfgDir == null)
                {
                    Log.Warning($"Could not derive CS2 cfg directory from exe path '{ExePath}'. Skipping cfg write.");
                    return;
                }

                string cfgPath = Path.Combine(cfgDir, "gamestate_integration_segra.cfg");
                string expectedContent = GenerateCfg();

                if (File.Exists(cfgPath))
                {
                    string existingContent = File.ReadAllText(cfgPath);
                    if (existingContent.Equals(expectedContent, StringComparison.Ordinal))
                    {
                        return;
                    }
                }

                Directory.CreateDirectory(cfgDir);
                File.WriteAllText(cfgPath, expectedContent);
                Log.Information($"Created CS2 gamestate integration config at {cfgPath}");
                _ = MessageService.ShowModal("Game integration", $"There has been an update to the CS2 integration. Please restart the game to apply the changes.", "warning");
            }
            catch (Exception ex)
            {
                Log.Warning($"Could not ensure CS2 cfg exists: {ex.Message}");
            }
        }

        private static string? ResolveCfgDirectory(string? exePath)
        {
            // CS2 exe lives at: <install>\Counter-Strike Global Offensive\game\bin\win64\cs2.exe
            // The cfg dir is:   <install>\Counter-Strike Global Offensive\game\csgo\cfg
            if (string.IsNullOrEmpty(exePath)) return null;

            string? winDir = Path.GetDirectoryName(exePath);          // ...\game\bin\win64
            string? binDir = Path.GetDirectoryName(winDir);            // ...\game\bin
            string? gameDir = Path.GetDirectoryName(binDir);           // ...\game
            if (string.IsNullOrEmpty(gameDir)) return null;

            return Path.Combine(gameDir, "csgo", "cfg");
        }

        private string GenerateCfg()
        {
            return "\"Segra\" {\n" +
                "    \"uri\" \"http://localhost:1340/\"\n" +
                "    \"timeout\" \"5.0\"\n" +
                "    \"buffer\" \"0.1\"\n" +
                "    \"throttle\" \"0.2\"\n" +
                "    \"heartbeat\" \"2.0\"\n" +
                "    \"data\" {\n" +
                "        \"player_id\" \"1\"\n" +
                "        \"provider\" \"1\"\n" +
                "        \"map\" \"1\"\n" +
                "        \"round\" \"1\"\n" +
                "        \"player_state\" \"1\"\n" +
                "        \"player_match_stats\" \"1\"\n" +
                "    }\n" +
                "}";
        }
    }
}
