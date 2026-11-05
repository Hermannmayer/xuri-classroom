import { theme } from 'antd';
import type { ThemeConfig } from 'antd';

/** 蓝图风格：西文等宽优先，中文回退到系统黑体（中文等宽字体稀缺） */
export const MONO =
  "'Cascadia Mono', 'JetBrains Mono', Consolas, 'SF Mono', 'Microsoft YaHei', monospace";

export const BLUEPRINT = {
  bg: '#1e3a5f',
  bgDeep: '#152a44',
  line: 'rgba(255,255,255,0.30)',
  lineSoft: 'rgba(255,255,255,0.15)',
  grid: 'rgba(255,255,255,0.05)',
  text: '#ffffff',
  textSoft: '#a0c4e8',
  blue: '#4a90d9',
  orange: '#ff6b35',
};

const line = BLUEPRINT.line;
const lineSoft = BLUEPRINT.lineSoft;

export const blueprintTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
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
    colorTextTertiary: 'rgba(160,196,232,0.65)',
    colorTextQuaternary: 'rgba(160,196,232,0.40)',
    colorBorder: line,
    colorBorderSecondary: lineSoft,
    colorFillSecondary: 'rgba(255,255,255,0.06)',
    colorFillTertiary: 'rgba(255,255,255,0.04)',
    colorFillQuaternary: 'rgba(255,255,255,0.02)',
    borderRadius: 0,
    borderRadiusLG: 0,
    borderRadiusSM: 0,
    borderRadiusXS: 0,
    fontFamily: MONO,
    fontSize: 13,
    controlHeight: 34,
    wireframe: false,
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
      headerSplitColor: lineSoft,
      rowHoverBg: 'rgba(74,144,217,0.12)',
      borderColor: lineSoft,
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
