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
        private readonly Cs2EventTracker _tracker = new();

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

                        await HandleRequest(context);
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
                    foreach (var bookmark in _tracker.Process(body))
                        GameIntegrationService.RegisterGameEvent(bookmark.Type, "Counter-Strike 2", bookmark.Subtype, details: bookmark);
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
                "        \"player_weapons\" \"1\"\n" +
                "    }\n" +
                "}";
        }
    }
}
