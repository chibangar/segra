#if WINDOWS
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Segra.Backend.Core.Models;
using Serilog;

using Segra.Backend.Platform;

namespace Segra.Backend.Windows.Display
{
    public enum InGameNotificationType
    {
        Clipping,
        ClipSaved,
        Bookmark,
        Kill,
        Headshot,
        Goal,
        Assist
    }

    /// <summary>
    /// Displays a non-intrusive, click-through, topmost in-game notification overlay (similar to Medal.tv / Shadowplay)
    /// when saving clips, bookmarks, kills, or replay buffers. Never takes focus from fullscreen or windowed games.
    /// </summary>
    public static class InGameNotificationService
    {
        private static NotificationForm? _activeForm;
        private static readonly object _syncLock = new();
        private static Thread? _uiThread;
        private static SynchronizationContext? _syncContext;
        private static readonly AutoResetEvent _threadReady = new(false);

        static InGameNotificationService()
        {
            StartUiThread();
        }

        private static void StartUiThread()
        {
            _uiThread = new Thread(() =>
            {
                Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
                var context = new WindowsFormsSynchronizationContext();
                SynchronizationContext.SetSynchronizationContext(context);
                _syncContext = context;
                _threadReady.Set();
                Application.Run();
            })
            {
                IsBackground = true,
                Name = "InGameNotificationThread"
            };
            _uiThread.SetApartmentState(ApartmentState.STA);
            _uiThread.Start();
            _threadReady.WaitOne(2000);
        }

        public static void ShowClipping(string? gameName)
        {
            bool isPt = IsPortuguese();
            string title = isPt ? "A GRAVAR CLIP..." : "CLIPPING...";
            string subtitle = !string.IsNullOrWhiteSpace(gameName) ? gameName : (isPt ? "Replay Buffer" : "Replay Buffer");
            ShowNotification(title, subtitle, InGameNotificationType.Clipping);
        }

        public static void ShowClipSaved(string? gameName)
        {
            bool isPt = IsPortuguese();
            string title = isPt ? "CLIP GUARDADO!" : "CLIP SAVED!";
            string subtitle = !string.IsNullOrWhiteSpace(gameName) ? gameName : (isPt ? "Replay Guardado" : "Replay Saved");
            ShowNotification(title, subtitle, InGameNotificationType.ClipSaved);
            PlaySound();
        }

        public static void ShowKill(string? gameName, bool isHeadshot = false)
        {
            bool isPt = IsPortuguese();
            string title = isHeadshot ? "HEADSHOT!" : (isPt ? "KILL REGISTADA!" : "KILL RECORDED!");
            string subtitle = Settings.Instance.AutoClipKills
                ? (isPt ? "Clip Auto-Guardado" : "Auto-Clip Saved")
                : (!string.IsNullOrWhiteSpace(gameName) ? gameName : (isPt ? "Momento de Destaque" : "Highlight Saved"));
            ShowNotification(title, subtitle, isHeadshot ? InGameNotificationType.Headshot : InGameNotificationType.Kill);
            PlaySound();
        }

        public static void ShowEvent(BookmarkType type, BookmarkSubtype? subtype, string? gameName)
        {
            bool isPt = IsPortuguese();
            switch (type)
            {
                case BookmarkType.Kill:
                    ShowKill(gameName, subtype == BookmarkSubtype.Headshot);
                    break;
                case BookmarkType.Goal:
                    string goalSubtitle = Settings.Instance.AutoClipKills
                        ? (isPt ? "Clip Auto-Guardado" : "Auto-Clip Saved")
                        : (!string.IsNullOrWhiteSpace(gameName) ? gameName : "");
                    ShowNotification(isPt ? "GOLO!" : "GOAL!", goalSubtitle, InGameNotificationType.Goal);
                    PlaySound();
                    break;
                case BookmarkType.Assist:
                    ShowNotification(isPt ? "ASSISTÊNCIA!" : "ASSIST!", gameName ?? "", InGameNotificationType.Assist);
                    PlaySound();
                    break;
                case BookmarkType.Manual:
                    ShowBookmark(gameName);
                    break;
            }
        }

        public static void ShowBookmark(string? gameName, string? momentType = null)
        {
            bool isPt = IsPortuguese();
            string title = isPt ? "MARCADOR ADICIONADO!" : "BOOKMARK CREATED!";
            string subtitle = !string.IsNullOrWhiteSpace(momentType)
                ? momentType
                : (!string.IsNullOrWhiteSpace(gameName) ? gameName : (isPt ? "Momento Marcado" : "Bookmark Saved"));
            ShowNotification(title, subtitle, InGameNotificationType.Bookmark);
        }

        private static void PlaySound()
        {
            try
            {
                if (Settings.Instance.SoundEffectsVolume > 0)
                {
                    PlatformServices.Sound.Play(Properties.Resources.bookmark, Settings.Instance.SoundEffectsVolume);
                }
            }
            catch { }
        }

        private static bool IsPortuguese()
        {
            try
            {
                var lang = Settings.Instance.Language;
                if (!string.IsNullOrEmpty(lang))
                {
                    return lang.StartsWith("pt", StringComparison.OrdinalIgnoreCase);
                }
            }
            catch
            {
                // Fallback to true since default is pt-PT
            }
            return true;
        }

        public static void ShowNotification(string title, string subtitle, InGameNotificationType type)
        {
            try
            {
                if (!Settings.Instance.ShowInGameNotifications)
                    return;

                // Also notify frontend so it appears in real-time inside the Segra app window
                _ = Task.Run(() => App.MessageService.SendFrontendMessage("InGameNotification", new
                {
                    title,
                    subtitle,
                    type = type.ToString()
                }));

                if (_syncContext == null)
                    return;

                _syncContext.Post(_ =>
                {
                    lock (_syncLock)
                    {
                        if (_activeForm == null || _activeForm.IsDisposed)
                        {
                            _activeForm = new NotificationForm();
                        }
                        _activeForm.ShowData(title, subtitle, type);
                    }
                }, null);
            }
            catch (Exception ex)
            {
                Log.Warning($"Error showing in-game notification: {ex.Message}");
            }
        }

        private class NotificationForm : Form
        {
            [DllImport("user32.dll")]
            private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

            [DllImport("user32.dll")]
            private static extern IntPtr GetForegroundWindow();

            [DllImport("user32.dll", SetLastError = true)]
            private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

            private static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
            private const uint SWP_NOACTIVATE = 0x0010;
            private const uint SWP_SHOWWINDOW = 0x0040;

            private const int SW_SHOWNOACTIVATE = 4;
            private const int WS_EX_TOPMOST = 0x00000008;
            private const int WS_EX_TRANSPARENT = 0x00000020;
            private const int WS_EX_TOOLWINDOW = 0x00000080;
            private const int WS_EX_NOACTIVATE = 0x08000000;

            private System.Windows.Forms.Timer? _animTimer;
            private float _progress = 0f;
            private int _ticks = 0;
            private const int TotalTicks = 140; // ~3.5 seconds at 25ms per tick

            private float _scale = 1.0f;
            private string _title = "";
            private string _subtitle = "";
            private InGameNotificationType _type;
            private Bitmap? _logoBitmap;

            public NotificationForm()
            {
                FormBorderStyle = FormBorderStyle.None;
                StartPosition = FormStartPosition.Manual;
                ShowInTaskbar = false;
                TopMost = true;
                DoubleBuffered = true;
                BackColor = Color.FromArgb(15, 23, 42); // Slate-900 / dark theme
                Opacity = 0.0;

                SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer, true);

                ApplyConfiguredSize();
                LoadLogo();
                UpdatePosition();

                _animTimer = new System.Windows.Forms.Timer { Interval = 25 };
                _animTimer.Tick += OnAnimTick;
            }

            protected override bool ShowWithoutActivation => true;

            protected override CreateParams CreateParams
            {
                get
                {
                    var cp = base.CreateParams;
                    cp.ExStyle |= WS_EX_NOACTIVATE | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_TOPMOST;
                    return cp;
                }
            }

            private void ApplyConfiguredSize()
            {
                var sizeSetting = Settings.Instance.InGameNotificationSize;
                _scale = sizeSetting switch
                {
                    InGameNotificationSize.Small => 0.8f,
                    InGameNotificationSize.Large => 1.25f,
                    _ => 1.0f
                };

                int width = (int)Math.Round(340 * _scale);
                int height = (int)Math.Round(76 * _scale);
                Size = new Size(width, height);
            }

            private void LoadLogo()
            {
                try
                {
                    using var ico = Properties.Resources.icon;
                    if (ico != null)
                    {
                        int iconDim = (int)Math.Round(38 * _scale);
                        _logoBitmap?.Dispose();
                        _logoBitmap = new Bitmap(ico.ToBitmap(), new Size(iconDim, iconDim));
                    }
                }
                catch
                {
                    _logoBitmap = null;
                }
            }

            public void UpdatePosition()
            {
                try
                {
                    IntPtr fg = GetForegroundWindow();
                    Screen screen = (fg != IntPtr.Zero)
                        ? Screen.FromHandle(fg)
                        : (Screen.PrimaryScreen ?? Screen.AllScreens.FirstOrDefault()!);
                    var area = screen?.Bounds ?? screen?.WorkingArea ?? new Rectangle(0, 0, 1920, 1080);
                    int padX = 24;
                    int padY = 24;

                    int x, y;
                    switch (Settings.Instance.InGameNotificationPosition)
                    {
                        case InGameNotificationPosition.TopLeft:
                            x = area.Left + padX;
                            y = area.Top + padY;
                            break;
                        case InGameNotificationPosition.BottomLeft:
                            x = area.Left + padX;
                            y = area.Bottom - Height - padY;
                            break;
                        case InGameNotificationPosition.BottomRight:
                            x = area.Right - Width - padX;
                            y = area.Bottom - Height - padY;
                            break;
                        case InGameNotificationPosition.TopRight:
                        default:
                            x = area.Right - Width - padX;
                            y = area.Top + padY;
                            break;
                    }

                    Location = new Point(x, y);
                }
                catch
                {
                    Location = new Point(1920 - Width - 24, 24);
                }
            }

            public void ShowData(string title, string subtitle, InGameNotificationType type)
            {
                ApplyConfiguredSize();
                LoadLogo();
                UpdatePosition();

                _title = title;
                _subtitle = subtitle;
                _type = type;
                _ticks = 0;

                ShowWindow(Handle, SW_SHOWNOACTIVATE);
                SetWindowPos(Handle, HWND_TOPMOST, Location.X, Location.Y, Width, Height, SWP_NOACTIVATE | SWP_SHOWWINDOW);

                if (_animTimer != null && !_animTimer.Enabled)
                {
                    _animTimer.Start();
                }

                Invalidate();
            }

            private void OnAnimTick(object? sender, EventArgs e)
            {
                _ticks++;

                // Fade in (first 10 ticks = 250ms)
                if (_ticks <= 10)
                {
                    Opacity = Math.Min(0.96, _ticks * 0.096);
                }
                // Fade out (last 12 ticks = 300ms)
                else if (_ticks > TotalTicks - 12)
                {
                    int remaining = TotalTicks - _ticks;
                    Opacity = Math.Max(0.0, remaining * (0.96 / 12));
                }
                else
                {
                    Opacity = 0.96;
                }

                _progress = Math.Clamp((float)_ticks / TotalTicks, 0f, 1f);
                Invalidate();

                if (_ticks >= TotalTicks)
                {
                    _animTimer?.Stop();
                    Opacity = 0.0;
                    Hide();
                }
            }

            protected override void OnPaint(PaintEventArgs e)
            {
                base.OnPaint(e);
                var g = e.Graphics;
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

                Color accentColor = _type switch
                {
                    InGameNotificationType.Clipping => Color.FromArgb(56, 189, 248),   // Cyan / Sky-400
                    InGameNotificationType.ClipSaved => Color.FromArgb(34, 197, 94),   // Emerald / Green-500
                    InGameNotificationType.Bookmark => Color.FromArgb(245, 158, 11),   // Amber-500
                    InGameNotificationType.Kill => Color.FromArgb(239, 68, 68),       // Red / Rose-500
                    InGameNotificationType.Headshot => Color.FromArgb(249, 115, 22),   // Orange-500
                    InGameNotificationType.Goal => Color.FromArgb(234, 179, 8),       // Yellow-500
                    InGameNotificationType.Assist => Color.FromArgb(168, 85, 247),     // Purple-500
                    _ => Color.FromArgb(56, 189, 248)
                };

                var rect = new Rectangle(0, 0, Width - 1, Height - 1);
                int radius = (int)Math.Round(10 * _scale);

                // Background
                using (var bgBrush = new SolidBrush(Color.FromArgb(24, 30, 42)))
                using (var bgPath = GetRoundedPath(rect, radius))
                {
                    g.FillPath(bgBrush, bgPath);
                }

                // Glowing border
                using (var borderPen = new Pen(accentColor, Math.Max(1.5f, 1.75f * _scale)))
                using (var borderPath = GetRoundedPath(rect, radius))
                {
                    g.DrawPath(borderPen, borderPath);
                }

                // App Logo on the left
                int iconX = (int)Math.Round(16 * _scale);
                int iconY = (int)Math.Round(18 * _scale);
                int iconDim = (int)Math.Round(38 * _scale);
                if (_logoBitmap != null)
                {
                    g.DrawImage(_logoBitmap, iconX, iconY, iconDim, iconDim);
                }
                else
                {
                    // Fallback icon placeholder
                    using var badgeBrush = new SolidBrush(accentColor);
                    g.FillEllipse(badgeBrush, iconX, iconY, iconDim, iconDim);
                }

                // Status indicator pill / dot next to title
                int textX = iconX + iconDim + (int)Math.Round(10 * _scale);
                int dotY = (int)Math.Round(21 * _scale);
                int dotDim = (int)Math.Round(7 * _scale);
                using (var dotBrush = new SolidBrush(accentColor))
                {
                    g.FillEllipse(dotBrush, textX, dotY, dotDim, dotDim);
                }

                // Title
                using (var titleFont = new Font("Segoe UI", 9.5f * _scale, FontStyle.Bold))
                using (var titleBrush = new SolidBrush(Color.White))
                {
                    g.DrawString(_title, titleFont, titleBrush, new PointF(textX + (int)Math.Round(12 * _scale), (int)Math.Round(15 * _scale)));
                }

                // Subtitle (Game Name)
                using (var subFont = new Font("Segoe UI", 8.5f * _scale, FontStyle.Regular))
                using (var subBrush = new SolidBrush(Color.FromArgb(148, 163, 184)))
                {
                    g.DrawString(_subtitle, subFont, subBrush, new PointF(textX + (int)Math.Round(12 * _scale), (int)Math.Round(37 * _scale)));
                }

                // Bottom progress / duration bar
                int barHeight = Math.Max(2, (int)Math.Round(3 * _scale));
                int barY = Height - barHeight - 2;
                int barWidth = (int)((Width - 20) * (1f - _progress));
                if (barWidth > 0)
                {
                    using var barBrush = new SolidBrush(accentColor);
                    g.FillRectangle(barBrush, 10, barY, barWidth, barHeight);
                }
            }

            private static GraphicsPath GetRoundedPath(Rectangle rect, int radius)
            {
                var path = new GraphicsPath();
                int diameter = radius * 2;
                path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
                path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
                path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
                path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
                path.CloseFigure();
                return path;
            }

            protected override void Dispose(bool disposing)
            {
                if (disposing)
                {
                    _animTimer?.Dispose();
                    _logoBitmap?.Dispose();
                }
                base.Dispose(disposing);
            }
        }
    }
}
#endif
