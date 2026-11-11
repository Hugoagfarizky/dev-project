export type StudioPreset = 'build' | 'program' | 'simulate';

export interface LayoutInput {
  width: number;
  height: number;
  preset: StudioPreset;
  userOverrides?: Record<PanelKey, UserPanelOverride>;
}

export interface CollapsedPanels {
  assets: boolean;
  monitor: boolean;
  program: boolean;
  console: boolean;
}

export interface LayoutResult {
  tooSmall: boolean;
  compact: boolean;
  shortHeight: boolean;
  leftWidth: number;
  rightWidth: number;
  programHeight: number;
  consoleHeight: number;
  presetCollapsed: CollapsedPanels;
  responsiveCollapsed: CollapsedPanels;
  collapsed: CollapsedPanels;
  viewportWidth: number;
  viewportHeight: number;
}

export type PanelKey = 'assets' | 'monitor' | 'program' | 'console';
export type UserPanelOverride = boolean | null;

export function resolveCollapsedPanels(input: {
  presetCollapsed: CollapsedPanels;
  responsiveCollapsed: CollapsedPanels;
  userOverrides: Record<PanelKey, UserPanelOverride>;
}): CollapsedPanels {
  return {
    assets:
      input.responsiveCollapsed.assets ||
      (input.userOverrides.assets ?? input.presetCollapsed.assets),
    monitor:
      input.responsiveCollapsed.monitor ||
      (input.userOverrides.monitor ?? input.presetCollapsed.monitor),
    program:
      input.responsiveCollapsed.program ||
      (input.userOverrides.program ?? input.presetCollapsed.program),
    console:
      input.responsiveCollapsed.console ||
      (input.userOverrides.console ?? input.presetCollapsed.console)
  };
}

export function computeLayout(input: LayoutInput): LayoutResult {
  const { width, height, preset } = input;
  const userOverrides = input.userOverrides ?? {
    assets: null,
    monitor: null,
    program: null,
    console: null
  };
  const tooSmall = width < 1024 || height < 640;
  const compact = width >= 1024 && width < 1200;
  const shortHeight = height < 760;

  const leftWidth = compact ? 220 : 260;
  const rightWidth = compact ? 280 : 320;
  const expandedProgramHeight = shortHeight ? 200 : 320;
  const expandedConsoleHeight = shortHeight ? 160 : 200;

  const presetCollapsed: CollapsedPanels = {
    assets: preset !== 'build',
    monitor: false,
    program: preset !== 'program',
    console: preset !== 'simulate'
  };

  const responsiveCollapsed: CollapsedPanels = {
    assets: false,
    monitor: false,
    program: false,
    console: false
  };

  const collapsed = { ...presetCollapsed };
  let programHeight = expandedProgramHeight;
  let consoleHeight = expandedConsoleHeight;

  function effectiveConsoleCollapsed() {
    return responsiveCollapsed.console || (userOverrides.console ?? presetCollapsed.console);
  }

  function effectiveProgramCollapsed() {
    return responsiveCollapsed.program || (userOverrides.program ?? presetCollapsed.program);
  }

  const horizontalSplitters = 2;
  let verticalSplitters = effectiveProgramCollapsed() || effectiveConsoleCollapsed() ? 1 : 2;
  const viewportWidth = width - leftWidth - rightWidth - horizontalSplitters;
  let viewportHeight =
    height - 48 - 24 - (effectiveProgramCollapsed() ? 32 : programHeight) - (effectiveConsoleCollapsed() ? 32 : consoleHeight) - verticalSplitters;

  if (viewportHeight < 300 && !effectiveConsoleCollapsed()) {
    responsiveCollapsed.console = true;
    consoleHeight = 32;
    viewportHeight =
      height - 48 - 24 - (effectiveProgramCollapsed() ? 32 : programHeight) - 32 - 1;
  }

  if (viewportHeight < 300 && !effectiveProgramCollapsed()) {
    responsiveCollapsed.program = true;
    programHeight = 32;
    viewportHeight =
      height - 48 - 24 - 32 - (effectiveConsoleCollapsed() ? 32 : consoleHeight) - 1;
  }

  collapsed.console = effectiveConsoleCollapsed();
  collapsed.program = effectiveProgramCollapsed();

  return {
    tooSmall,
    compact,
    shortHeight,
    leftWidth,
    rightWidth,
    programHeight,
    consoleHeight,
    presetCollapsed,
    responsiveCollapsed,
    collapsed,
    viewportWidth,
    viewportHeight
  };
}
