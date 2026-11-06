export type StudioPreset = 'build' | 'program' | 'simulate';

export interface LayoutInput {
  width: number;
  height: number;
  preset: StudioPreset;
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
  collapsed: CollapsedPanels;
  viewportWidth: number;
  viewportHeight: number;
}

export function computeLayout(input: LayoutInput): LayoutResult {
  const { width, height, preset } = input;
  const tooSmall = width < 1024 || height < 640;
  const compact = width >= 1024 && width < 1200;
  const shortHeight = height < 760;

  const leftWidth = compact ? 220 : 260;
  const rightWidth = compact ? 280 : 320;
  const expandedProgramHeight = shortHeight ? 200 : 320;
  const expandedConsoleHeight = shortHeight ? 160 : 200;

  const baseCollapsed: CollapsedPanels = {
    assets: preset !== 'build',
    monitor: true,
    program: preset !== 'program',
    console: preset !== 'simulate'
  };

  const collapsed = { ...baseCollapsed };
  let programHeight = collapsed.program ? 32 : expandedProgramHeight;
  let consoleHeight = collapsed.console ? 32 : expandedConsoleHeight;

  const horizontalSplitters = 2;
  const verticalSplitters = collapsed.program || collapsed.console ? 1 : 2;
  const viewportWidth = width - leftWidth - rightWidth - horizontalSplitters;
  let viewportHeight =
    height - 48 - 24 - (collapsed.program ? 32 : programHeight) - (collapsed.console ? 32 : consoleHeight) - verticalSplitters;

  if (viewportHeight < 300 && !collapsed.console) {
    collapsed.console = true;
    consoleHeight = 32;
    viewportHeight = height - 48 - 24 - (collapsed.program ? 32 : programHeight) - 32 - 1;
  }

  if (viewportHeight < 300 && !collapsed.program) {
    collapsed.program = true;
    programHeight = 32;
    viewportHeight = height - 48 - 24 - 32 - (collapsed.console ? 32 : consoleHeight) - 1;
  }

  return {
    tooSmall,
    compact,
    shortHeight,
    leftWidth,
    rightWidth,
    programHeight,
    consoleHeight,
    collapsed,
    viewportWidth,
    viewportHeight
  };
}
