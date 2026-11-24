import { theme } from 'antd';
import type { ThemeConfig } from 'antd';


export const MONO =
  "'Cascadia Mono', 'JetBrains Mono', Consolas, 'SF Mono', 'Microsoft YaHei', monospace";

export type ThemeMode = 'dark' | 'light';


export const BLUEPRINT = {
  bg: '#1e3a5f',
  bgDeep: '#152a44',
  line: 'rgba(255,255,255,0.30)',
  lineSoft: 'rgba(255,255,255,0.15)',
  grid: 'rgba(255,255,255,0.05)',
  text: '#ffffff',

  textSoft: '#cfe2f6',
  blue: '#4a90d9',
  orange: '#ff6b35',
};


export const PAPER = {
  bg: '#f7f5f0',
  bgDeep: '#efece4',
  panel: '#fffdf8',
  line: '#d8d3c8',
  lineSoft: '#e6e1d6',
  grid: 'rgba(30,58,95,0.06)',
  text: '#1e3a5f',

  textSoft: '#3f4c5c',
  blue: '#2f5d8c',
  orange: '#e8590c',
};


const SHARED_TOKEN: ThemeConfig['token'] = {
  borderRadius: 0,
  borderRadiusLG: 0,
  borderRadiusSM: 0,
  borderRadiusXS: 0,
  fontFamily: MONO,





  fontSize: 15,
  fontSizeSM: 13,
  fontSizeLG: 17,
  fontSizeXL: 19,

  fontWeightStrong: 700,
  controlHeight: 36,
  wireframe: false,
};

const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    ...SHARED_TOKEN,
    colorPrimary: '#2f6fb5',
    colorInfo: '#6ba6e3',
    colorLink: '#8cbdf0',
    colorSuccess: '#5fbf9a',
    colorWarning: '#ffb066',
    colorError: '#ff8f7a',
    colorBgBase: BLUEPRINT.bg,
    colorBgLayout: BLUEPRINT.bgDeep,
    colorBgContainer: 'rgba(255,255,255,0.06)',
    colorBgElevated: '#25436b',
    colorBgSpotlight: BLUEPRINT.bgDeep,
    colorText: BLUEPRINT.text,
    colorTextSecondary: BLUEPRINT.textSoft,
    colorTextTertiary: 'rgba(207,226,246,0.82)',
    colorTextQuaternary: 'rgba(207,226,246,0.78)',
    colorBorder: 'rgba(255,255,255,0.45)',
    colorBorderSecondary: 'rgba(255,255,255,0.22)',
    colorFillSecondary: 'rgba(255,255,255,0.06)',
    colorFillTertiary: 'rgba(255,255,255,0.04)',
    colorFillQuaternary: 'rgba(255,255,255,0.02)',
  },
  components: {
    Layout: {
      headerBg: 'rgba(21,42,68,0.92)',
      siderBg: 'rgba(21,42,68,0.92)',
      bodyBg: 'transparent',
      headerHeight: 56,
      headerPadding: '0 20px',
    },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemColor: BLUEPRINT.textSoft,
      itemHoverBg: 'rgba(255,255,255,0.06)',
      itemHoverColor: BLUEPRINT.text,
      itemSelectedBg: 'rgba(107,166,227,0.28)',
      itemSelectedColor: BLUEPRINT.text,
      itemActiveBg: 'rgba(107,166,227,0.18)',
      itemHeight: 40,
      itemBorderRadius: 0,
      subMenuItemBorderRadius: 0,
      horizontalItemSelectedColor: BLUEPRINT.text,
    },
    Card: {
      colorBgContainer: 'rgba(255,255,255,0.06)',
      headerBg: 'transparent',
      headerFontSize: 13,
      paddingLG: 20,
    },
    Button: {
      borderRadius: 0,
      fontWeight: 500,
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      defaultBg: 'transparent',
      defaultColor: BLUEPRINT.text,
      defaultBorderColor: 'rgba(255,255,255,0.48)',
      contentFontSize: 13,
    },
    Input: {
      colorBgContainer: 'rgba(255,255,255,0.06)',
      activeBorderColor: '#6ba6e3',
      hoverBorderColor: 'rgba(255,255,255,0.60)',
      activeShadow: 'none',
      addonBg: 'rgba(255,255,255,0.04)',
    },
    InputNumber: {
      colorBgContainer: 'rgba(30,58,95,0.60)',
      activeBorderColor: BLUEPRINT.blue,
      hoverBorderColor: 'rgba(255,255,255,0.60)',
      activeShadow: 'none',
    },
    Select: {
      colorBgContainer: 'rgba(30,58,95,0.60)',
      optionSelectedBg: '#3669a2',
      optionSelectedColor: '#ffffff',
      selectorBg: 'rgba(255,255,255,0.06)',
    },
    Table: {
      headerBg: 'rgba(255,255,255,0.05)',
      headerColor: BLUEPRINT.textSoft,
      headerSplitColor: BLUEPRINT.lineSoft,
      rowHoverBg: 'rgba(74,144,217,0.12)',
      borderColor: BLUEPRINT.lineSoft,
      colorBgContainer: 'transparent',
      headerBorderRadius: 0,
    },
    Modal: {
      contentBg: '#1b3352',
      headerBg: 'transparent',
      titleColor: BLUEPRINT.text,
    },
    Tabs: {
      itemColor: BLUEPRINT.textSoft,
      itemSelectedColor: BLUEPRINT.text,
      itemHoverColor: BLUEPRINT.text,
      inkBarColor: BLUEPRINT.blue,
    },
    Dropdown: {
      colorBgElevated: '#1b3352',
      controlItemBgHover: 'rgba(74,144,217,0.18)',
    },
    Tooltip: {
      colorBgSpotlight: '#12233a',
      colorTextLightSolid: BLUEPRINT.text,
    },
    Form: {
      labelColor: BLUEPRINT.textSoft,
      itemMarginBottom: 18,
    },
    Typography: {
      titleMarginBottom: 0.35,
      titleMarginTop: 0,
    },
    Spin: { colorPrimary: BLUEPRINT.blue },
    Message: { contentBg: '#1b3352' },
    Notification: { colorBgElevated: '#1b3352' },
    Pagination: { itemActiveBg: '#3669a2' },
    Drawer: { colorBgElevated: '#1b3352' },
    Segmented: {
      itemSelectedBg: '#3669a2',
      itemSelectedColor: '#ffffff',
      trackBg: 'rgba(0,0,0,0.28)',
    },
  },
};

const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    ...SHARED_TOKEN,

    colorPrimary: '#c2410c',
    colorInfo: PAPER.blue,
    colorLink: PAPER.blue,
    colorSuccess: '#2f7d5c',
    colorWarning: '#a06a12',
    colorError: '#c0392b',
    colorBgBase: PAPER.bg,
    colorBgLayout: PAPER.bgDeep,
    colorBgContainer: PAPER.panel,
    colorBgElevated: PAPER.panel,
    colorBgSpotlight: PAPER.text,
    colorText: PAPER.text,
    colorTextSecondary: PAPER.textSoft,
    colorTextTertiary: '#66717f',
    colorTextQuaternary: '#6b7787',
    colorBorder: '#b8b1a2',
    colorBorderSecondary: '#d8d3c8',
    colorFillSecondary: 'rgba(30,58,95,0.06)',
    colorFillTertiary: 'rgba(30,58,95,0.04)',
    colorFillQuaternary: 'rgba(30,58,95,0.02)',
  },
  components: {
    Layout: {
      headerBg: PAPER.panel,
      siderBg: PAPER.panel,
      bodyBg: 'transparent',
      headerHeight: 56,
      headerPadding: '0 20px',
    },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemColor: PAPER.textSoft,
      itemHoverBg: 'rgba(30,58,95,0.06)',
      itemHoverColor: PAPER.text,
      itemSelectedBg: 'rgba(194,65,12,0.12)',
      itemSelectedColor: '#c2410c',
      itemActiveBg: 'rgba(194,65,12,0.08)',
      itemHeight: 40,
      itemBorderRadius: 0,
      subMenuItemBorderRadius: 0,
      horizontalItemSelectedColor: PAPER.orange,
    },
    Card: {
      colorBgContainer: PAPER.panel,
      headerBg: 'transparent',
      headerFontSize: 13,
      paddingLG: 20,
    },
    Button: {
      borderRadius: 0,
      fontWeight: 500,
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      defaultBg: 'transparent',
      defaultColor: PAPER.text,
      defaultBorderColor: '#b8b1a2',
      contentFontSize: 13,
    },
    Input: {
      colorBgContainer: PAPER.panel,
      activeBorderColor: '#c2410c',
      hoverBorderColor: '#8f8775',
      activeShadow: 'none',
      addonBg: 'rgba(30,58,95,0.04)',
    },
    InputNumber: {
      colorBgContainer: PAPER.panel,
      activeBorderColor: PAPER.orange,
      hoverBorderColor: '#b8b1a2',
      activeShadow: 'none',
    },
    Select: {
      colorBgContainer: PAPER.panel,
      optionSelectedBg: '#f2c3a4',
      optionSelectedColor: PAPER.text,
      selectorBg: PAPER.panel,
    },
    Table: {
      headerBg: 'rgba(30,58,95,0.05)',
      headerColor: PAPER.textSoft,
      headerSplitColor: PAPER.lineSoft,
      rowHoverBg: 'rgba(30,58,95,0.04)',
      borderColor: PAPER.lineSoft,
      colorBgContainer: 'transparent',
      headerBorderRadius: 0,
    },
    Modal: {
      contentBg: PAPER.panel,
      headerBg: 'transparent',
      titleColor: PAPER.text,
    },
    Tabs: {
      itemColor: PAPER.textSoft,
      itemSelectedColor: PAPER.orange,
      itemHoverColor: PAPER.text,
      inkBarColor: '#c2410c',
    },
    Dropdown: {
      colorBgElevated: PAPER.panel,
      controlItemBgHover: 'rgba(194,65,12,0.10)',
    },
    Tooltip: {
      colorBgSpotlight: PAPER.text,
      colorTextLightSolid: PAPER.panel,
    },
    Form: {
      labelColor: PAPER.textSoft,
      itemMarginBottom: 18,
    },
    Typography: {
      titleMarginBottom: 0.35,
      titleMarginTop: 0,
    },
    Spin: { colorPrimary: '#c2410c' },
    Message: { contentBg: PAPER.panel },
    Notification: { colorBgElevated: PAPER.panel },
    Pagination: { itemActiveBg: '#f2c3a4' },
    Drawer: { colorBgElevated: PAPER.panel },
    Segmented: {
      itemSelectedBg: '#f2c3a4',
      itemSelectedColor: PAPER.text,
      trackBg: '#ece8dd',
    },
  },
};

export function buildTheme(mode: ThemeMode): ThemeConfig {
  return mode === 'light' ? lightTheme : darkTheme;
}


export const blueprintTheme: ThemeConfig = buildTheme('dark');
