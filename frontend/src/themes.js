const T = (background, panel, text, muted, border, primary, secondary, accent, success, warning, error, scheme) =>
  ({ background, panel, text, muted, border, primary, secondary, accent, success, warning, error, scheme });

export const THEMES = {
  jaringan: T("#0a0f1a", "#0d1424", "#d7e0f0", "#8190ad", "#1c2842", "#5aa9ff", "#a78bfa", "#3ddc97", "#3ddc97", "#f5b041", "#ff6b6b"),
  tokyonight: T("#1a1b26", "#16161e", "#c0caf5", "#7b83aa", "#292e42", "#7aa2f7", "#bb9af7", "#7dcfff", "#9ece6a", "#e0af68", "#f7768e"),
  "tokyonight-day": T("#e1e2e7", "#d0d5e3", "#3760bf", "#6172b0", "#c4c8da", "#2e7de9", "#9854f1", "#007197", "#587539", "#8c6c3e", "#c4234f", "light"),
  everforest: T("#2d353b", "#232a2e", "#d3c6aa", "#9aa79d", "#3d484d", "#7fbbb3", "#d699b6", "#83c092", "#a7c080", "#dbbc7f", "#e67e80"),
  ayu: T("#0a0e14", "#07090d", "#bfbdb6", "#707a8c", "#1b2330", "#59c2ff", "#d2a6ff", "#95e6cb", "#aad94c", "#e6b450", "#f07178"),
  catppuccin: T("#1e1e2e", "#181825", "#cdd6f4", "#8c91ab", "#313244", "#89b4fa", "#cba6f7", "#94e2d5", "#a6e3a1", "#f9e2af", "#f38ba8"),
  "catppuccin-macchiato": T("#24273a", "#1e2030", "#cad3f5", "#8e94ae", "#363a4f", "#8aadf4", "#c6a0f6", "#8bd5ca", "#a6da95", "#eed49f", "#ed8796"),
  gruvbox: T("#282828", "#1d2021", "#ebdbb2", "#a89984", "#3c3836", "#83a598", "#d3869b", "#8ec07c", "#b8bb26", "#fabd2f", "#fb4934"),
  kanagawa: T("#1f1f28", "#16161d", "#dcd7ba", "#8a8980", "#2a2a37", "#7e9cd8", "#957fb8", "#7fb4ca", "#98bb6c", "#e6c384", "#e46876"),
  nord: T("#2e3440", "#3b4252", "#d8dee9", "#8a94aa", "#434c5e", "#88c0d0", "#81a1c1", "#8fbcbb", "#a3be8c", "#d08770", "#bf616a"),
  matrix: T("#000000", "#050805", "#7dff8f", "#3fa152", "#0f3a1a", "#00ff41", "#39d353", "#00c853", "#00ff41", "#d4ff00", "#ff4d4d"),
  "one-dark": T("#282c34", "#21252b", "#abb2bf", "#8b92a0", "#3e4451", "#61afef", "#c678dd", "#56b6c2", "#98c379", "#e5c07b", "#e06c75"),
};

export const THEME_NAMES = ["system", ...Object.keys(THEMES)];

export const palette = (name) =>
  name === "system"
    ? THEMES[window.matchMedia("(prefers-color-scheme: light)").matches ? "tokyonight-day" : "jaringan"]
    : THEMES[name];

export const applyTheme = (name) => {
  const p = palette(name);
  const root = document.documentElement;
  Object.entries(p).forEach(([k, v]) => {
    if (k !== "scheme") root.style.setProperty(`--${k}`, v);
  });
  root.style.colorScheme = p.scheme || "dark";
};

export const loadTheme = () => {
  try {
    const t = localStorage.getItem("pulse-theme");
    return THEME_NAMES.includes(t) ? t : "jaringan";
  } catch {
    return "jaringan";
  }
};

export const saveTheme = (t) => {
  try { localStorage.setItem("pulse-theme", t); } catch { /* abaikan */ }
};
