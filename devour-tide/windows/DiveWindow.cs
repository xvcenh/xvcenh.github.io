using System;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: AssemblyTitle("吞噬之潮")]
[assembly: AssemblyProduct("Devour Tide")]
[assembly: AssemblyVersion("0.2.0.0")]

sealed class DiveWindow : Form
{
    readonly WebView2 game = new WebView2();
    const string Origin = "https://devour-tide.example";

    DiveWindow()
    {
        Text = "吞噬之潮 · 逃离实验室";
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        BackColor = Color.FromArgb(7, 29, 43);
        ClientSize = new Size(1120, 720);
        MinimumSize = new Size(480, 360);
        StartPosition = FormStartPosition.CenterScreen;
        game.Dock = DockStyle.Fill;
        game.DefaultBackgroundColor = BackColor;
        Controls.Add(game);
        Shown += async delegate
        {
            try
            {
                string profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "DevourTide", "DesktopProfile");
                var env = await CoreWebView2Environment.CreateAsync(null, profile, null);
                await game.EnsureCoreWebView2Async(env);
                game.CoreWebView2.SetVirtualHostNameToFolderMapping("devour-tide.example",
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "game"), CoreWebView2HostResourceAccessKind.DenyCors);
                game.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                game.CoreWebView2.Settings.IsStatusBarEnabled = false;
                game.CoreWebView2.Settings.IsZoomControlEnabled = false;
                game.CoreWebView2.NewWindowRequested += (sender, e) => e.Handled = true;
                game.CoreWebView2.NavigationStarting += (sender, e) => {
                    Uri to;
                    if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out to) || to.GetLeftPart(UriPartial.Authority) != Origin)
                        e.Cancel = true;
                };
                game.CoreWebView2.Navigate(Origin + "/index.html");
            }
            catch (Exception error)
            {
                MessageBox.Show("游戏窗口未能启动。请检查 Microsoft Edge WebView2 Runtime 是否已安装。\n\n" + error.Message,
                    Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
                Close();
            }
        };
        Deactivate += async delegate {
            if (game.CoreWebView2 == null || IsDisposed) return;
            try { await game.CoreWebView2.ExecuteScriptAsync("window.dispatchEvent(new Event('devour-suspend'))"); }
            catch (InvalidOperationException) { /* The window may already be closing. */ }
        };
    }

    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new DiveWindow());
    }
}
