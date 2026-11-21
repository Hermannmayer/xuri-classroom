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
    colorPrimary: BLUEPRINT.blue,
    colorInfo: BLUEPRINT.blue,
    colorLink: BLUEPRINT.textSoft,
    colorSuccess: BLUEPRINT.blue,
    colorWarning: BLUEPRINT.orange,
    colorError: BLUEPRINT.orange,
    colorBgBase: BLUEPRINT.bg,
    colorBgLayout: BLUEPRINT.bgDeep,
    colorBgContainer: 'rgba(30,58,95,0.60)',
    colorBgElevated: '#1b3352',
    colorBgSpotlight: BLUEPRINT.bgDeep,
    colorText: BLUEPRINT.text,
    colorTextSecondary: BLUEPRINT.textSoft,
    colorTextTertiary: 'rgba(207,226,246,0.82)',
    colorTextQuaternary: 'rgba(207,226,246,0.60)',
    colorBorder: BLUEPRINT.line,
    colorBorderSecondary: BLUEPRINT.lineSoft,
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
      itemSelectedBg: 'rgba(74,144,217,0.22)',
      itemSelectedColor: BLUEPRINT.text,
      itemActiveBg: 'rgba(74,144,217,0.16)',
      itemHeight: 40,
      itemBorderRadius: 0,
      subMenuItemBorderRadius: 0,
      horizontalItemSelectedColor: BLUEPRINT.text,
    },
    Card: {
      colorBgContainer: 'rgba(30,58,95,0.60)',
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
      defaultBorderColor: 'rgba(255,255,255,0.40)',
      contentFontSize: 13,
    },
    Input: {
      colorBgContainer: 'rgba(30,58,95,0.60)',
      activeBorderColor: BLUEPRINT.blue,
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
      optionSelectedBg: 'rgba(74,144,217,0.22)',
      optionSelectedColor: BLUEPRINT.text,
      selectorBg: 'rgba(30,58,95,0.60)',
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
    Pagination: { itemActiveBg: 'rgba(74,144,217,0.22)' },
    Drawer: { colorBgElevated: '#1b3352' },
    Segmented: {
      itemSelectedBg: 'rgba(74,144,217,0.22)',
      itemSelectedColor: BLUEPRINT.text,
      trackBg: 'rgba(0,0,0,0.18)',
    },
  },
};

const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    ...SHARED_TOKEN,

    colorPrimary: PAPER.orange,
    colorInfo: PAPER.blue,
    colorLink: PAPER.text,
    colorSuccess: PAPER.blue,
    colorWarning: '#b7791f',
    colorError: '#c0392b',
    colorBgBase: PAPER.bg,
    colorBgLayout: PAPER.bgDeep,
    colorBgContainer: PAPER.panel,
    colorBgElevated: PAPER.panel,
    colorBgSpotlight: PAPER.text,
    colorText: PAPER.text,
    colorTextSecondary: PAPER.textSoft,
    colorTextTertiary: 'rgba(91,107,125,0.75)',
    colorTextQuaternary: 'rgba(91,107,125,0.50)',
    colorBorder: PAPER.line,
    colorBorderSecondary: PAPER.lineSoft,
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
      itemSelectedBg: 'rgba(232,89,12,0.10)',
      itemSelectedColor: PAPER.orange,
      itemActiveBg: 'rgba(232,89,12,0.08)',
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
      defaultBorderColor: PAPER.line,
      contentFontSize: 13,
    },
    Input: {
      colorBgContainer: PAPER.panel,
      activeBorderColor: PAPER.orange,
      hoverBorderColor: '#b8b1a2',
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
      optionSelectedBg: 'rgba(232,89,12,0.12)',
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
      inkBarColor: PAPER.orange,
    },
    Dropdown: {
      colorBgElevated: PAPER.panel,
      controlItemBgHover: 'rgba(232,89,12,0.10)',
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
    Spin: { colorPrimary: PAPER.orange },
    Message: { contentBg: PAPER.panel },
    Notification: { colorBgElevated: PAPER.panel },
    Pagination: { itemActiveBg: 'rgba(232,89,12,0.12)' },
    Drawer: { colorBgElevated: PAPER.panel },
    Segmented: {
      itemSelectedBg: 'rgba(232,89,12,0.14)',
      itemSelectedColor: PAPER.text,
      trackBg: 'rgba(30,58,95,0.06)',
    },
  },
};

export function buildTheme(mode: ThemeMode): ThemeConfig {
  return mode === 'light' ? lightTheme : darkTheme;
}


export const blueprintTheme: ThemeConfig = buildTheme('dark');
