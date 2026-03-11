/**
 * GB/T 9704-2012 国家公文格式标准常量
 * 定义符合国家标准的公文排版规范
 * 
 * 参考标准：GB/T 9704-2012《党政机关公文格式》
 */

import type { ColorConfig, ContentConfig, PageConfig } from '../types/rule';

/**
 * GB/T 9704-2012 标准页面配置
 * 
 * 5.1 幅面尺寸：A4型纸，成品幅面尺寸为 210mm×297mm
 * 5.2.1 页边与版心尺寸：
 * - 天头（上白边）：37mm±1mm
 * - 订口（左白边）：28mm±1mm
 * - 版心尺寸：156mm×225mm
 */
export const GB_PAGE_CONFIG: PageConfig = {
  size: 'A4',
  orientation: 'portrait',
  margins: {
    top: '37mm',      // 天头（上白边）37mm±1mm
    right: '26mm',    // 右白边 26mm（计算得出：210-28-156=26）
    bottom: '35mm',   // 下白边 35mm（计算得出：297-37-225=35）
    left: '28mm'      // 订口（左白边）28mm±1mm
  }
};

/**
 * GB/T 9704-2012 标准字体配置
 * 
 * 5.2.2 字体和字号：
 * - 公文格式各要素一般用 3 号仿宋体字
 * - 标题一般用 2 号小标宋体字
 * 
 * 7.3.1 标题：一般用 2 号小标宋体字
 * 7.3.3 正文：一般用 3 号仿宋体字
 * - 第一层用黑体字
 * - 第二层用楷体字
 * - 第三层和第四层用仿宋体字
 * 
 * 字体说明：
 * - 小标宋：方正小标宋_GBK 或 方正小标宋简体
 * - 仿宋：仿宋_GB2312
 */
export const GB_CONTENT_CONFIG: ContentConfig = {
  body: {
    fonts: {
      family: '仿宋_GB2312, FangSong, STFangsong, serif'
    },
    style: {
      size: '16pt',
      weight: 400,
      color: '#000000'
    },
    paragraph: {
      align: 'justify',
      indent: '2em',
      spacing: {
        lineHeight: '28.95pt',
        before: '0',
        after: '0'
      }
    }
  },
  h1: {
    fonts: {
      family: '方正小标宋_GBK, 方正小标宋简体, FZXiaoBiaoSong-B05, 黑体, SimHei, STHeiti, sans-serif'
    },
    style: {
      size: '22pt',
      weight: 700,
      color: '#000000'
    },
    paragraph: {
      align: 'center',
      indent: '0',
      spacing: {
        lineHeight: '28.95pt',
        before: '1lines',
        after: '0.5lines'
      }
    },
    numberingStyle: ''
  },
  h2: {
    fonts: {
      family: '黑体, SimHei, STHeiti, Microsoft YaHei, sans-serif'
    },
    style: {
      size: '16pt',
      weight: 700,
      color: '#000000'
    },
    paragraph: {
      align: 'left',
      indent: '2em',
      spacing: {
        lineHeight: '28.95pt',
        before: '1lines',
        after: '0.5lines'
      }
    },
    numberingStyle: '{zhHansIndex}、'
  },
  h3: {
    fonts: {
      family: '楷体_GB2312, 楷体, KaiTi, KaiTi_GB2312, STKaiti, serif'
    },
    style: {
      size: '16pt',
      weight: 700,
      color: '#000000'
    },
    paragraph: {
      align: 'left',
      indent: '2em',
      spacing: {
        lineHeight: '28.95pt',
        before: '1lines',
        after: '0.5lines'
      }
    },
    numberingStyle: '（{zhHansIndex}）'
  },
  h4: {
    fonts: {
      family: '仿宋_GB2312, 仿宋, FangSong, FangSong_GB2312, STFangsong, serif'
    },
    style: {
      size: '16pt',
      weight: 400,
      color: '#000000'
    },
    paragraph: {
      align: 'left',
      indent: '2em',
      spacing: {
        lineHeight: '28.95pt',
        before: '1lines',
        after: '0.5lines'
      }
    },
    numberingStyle: '{romanIndex}．'
  }
};

/**
 * GB/T 9704-2012 标准颜色配置
 */
export const GB_COLOR_CONFIG: ColorConfig = {
  text: '#000000',        // 5.2.4 文字颜色：黑色
  background: '#ffffff',  // 白色背景
  accent: '#FF0000'       // 红色（用于发文机关标志、分隔线等）
};

/**
 * GB/T 9704-2012 标准间距配置
 * 
 * 5.2.3 行数和字数：
 * - 一般每面排 22 行，每行排 28 个字，并撑满版心
 * 
 * 3.2 行的定义：
 * - 一行指一个汉字的高度加 3 号汉字高度的 7/8 的距离
 */
/**
 * GB/T 9704-2012 版心尺寸
 * 
 * 5.2.1 版心尺寸：156mm×225mm
 * 5.2.3 每面排 22 行，每行排 28 个字
 */
export const GB_VERSION_HEART = {
  width: '156mm',
  height: '225mm',
  rows: 22,        // 每面 22 行
  columns: 28      // 每行 28 字
} as const;

/**
 * GB/T 9704-2012 完整标准配置
 */
export const GB_STANDARDS = {
  page: GB_PAGE_CONFIG,
  content: GB_CONTENT_CONFIG,
  colors: GB_COLOR_CONFIG,
  versionHeart: GB_VERSION_HEART
} as const;
 
/**
 * 字号对照表（磅值）
 * 
 * 根据国家标准和印刷行业惯例
 */
export const FONT_SIZE_MAP = {
  '初号': '42pt',
  '小初': '36pt',
  '一号': '26pt',
  '小一': '24pt',
  '二号': '22pt',    // 标题常用
  '小二': '18pt',
  '三号': '16pt',    // 正文常用
  '小三': '15pt',
  '四号': '14pt',
  '小四': '12pt',
  '五号': '10.5pt',
  '小五': '9pt'
} as const;

/**
 * 常用公文类型（GB/T 9704-2012 适用范围）
 */
export const DOCUMENT_TYPES = [
  '决议',
  '决定',
  '命令（令）',
  '公报',
  '公告',
  '通告',
  '意见',
  '通知',
  '通报',
  '报告',
  '请示',
  '批复',
  '议案',
  '函',
  '纪要'
] as const;

/**
 * 密级选项（7.2.2）
 */
export const CLASSIFICATION_LEVELS = [
  '绝密',
  '机密',
  '秘密'
] as const;

/**
 * 紧急程度选项（7.2.3）
 */
export const URGENCY_LEVELS = [
  '特急',
  '加急'
] as const;

/**
 * 公文用纸技术指标（第 4 章）
 */
export const PAPER_SPECIFICATIONS = {
  weight: '60-80g/m²',      // 纸张定量
  whiteness: '80%-90%',     // 白度
  foldingEndurance: '≥15',  // 横向耐折度
  opacity: '≥85%',          // 不透明度
  pH: '7.5-9.5'            // pH 值
} as const;

/**
 * 印制装订要求（第 6 章）
 */
export const PRINTING_REQUIREMENTS = {
  printing: '双面印刷',
  pageAlignment: '页码套正，两面误差不超过 2mm',
  blackInk: 'BL100%',
  redInk: 'Y80%、M80%',
  binding: '左侧装订',
  bindingPosition: '两钉外订眼距版面上下边缘各 70mm 处，允许误差±4mm'
} as const;

/**
 * 标准字体名称映射
 * 
 * 提供标准字体的多种名称变体，确保跨平台兼容性
 */
export const STANDARD_FONTS = {
  // 小标宋（用于标题）
  xiaoBiaoSong: [
    '方正小标宋_GBK',
    '方正小标宋简体',
    'FZXiaoBiaoSong-B05',
    'FZXiaoBiaoSong-B05S',
    '黑体',  // 备用字体
    'SimHei',
    'STHeiti',
    'sans-serif'
  ],
  
  // 仿宋（用于正文）
  fangSong: [
    '仿宋_GB2312',
    '仿宋',
    'FangSong',
    'FangSong_GB2312',
    'STFangsong',
    'serif'
  ],
  
  // 黑体（用于第一层标题）
  heiTi: [
    '黑体',
    'SimHei',
    'STHeiti',
    'Microsoft YaHei',
    'sans-serif'
  ],
  
  // 楷体（用于第二层标题）
  kaiTi: [
    '楷体_GB2312',
    '楷体',
    'KaiTi',
    'KaiTi_GB2312',
    'STKaiti',
    'serif'
  ],
  
  // 宋体（备用）
  songTi: [
    '宋体',
    'SimSun',
    'STSong',
    'serif'
  ]
} as const;

/**
 * 获取字体族字符串
 * @param fontType 字体类型
 * @returns CSS font-family 字符串
 */
export function getFontFamily(fontType: keyof typeof STANDARD_FONTS): string {
  return STANDARD_FONTS[fontType].join(', ');
}
