import PptxGenJS from 'pptxgenjs';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { ProposalContent, ProposalSlide } from '../types/bindings';
import { LOGO_BASE64 } from './logo';

// PDFMake用のフォント設定
pdfMake.vfs = pdfFonts.pdfMake.vfs;

/**
 * PowerPointファイルを生成
 */
export async function generatePowerPoint(
  content: ProposalContent,
  propertyTitle: string,
  targetAudience: string
): Promise<ArrayBuffer> {
  const pptx = new PptxGenJS();

  // プレゼンテーションのメタデータ
  pptx.author = '株式会社おきはわアセットブリッジ';
  pptx.company = '株式会社おきはわアセットブリッジ';
  pptx.subject = `${propertyTitle} - ${targetAudience}向け提案`;
  pptx.title = `${propertyTitle} 提案資料`;

  // スライドのレイアウト定義
  pptx.defineLayout({ name: 'A4', width: 10, height: 7.5 });
  pptx.layout = 'A4';

  // 各スライドを生成
  content.slides.forEach((slideData, index) => {
    const slide = pptx.addSlide();

    if (index === 0) {
      // 表紙スライド
      addTitleSlide(slide, slideData);
    } else {
      // コンテンツスライド
      addContentSlide(slide, slideData, index);
    }
  });

  // ArrayBufferとして出力
  const buffer = await pptx.write({ outputType: 'arraybuffer' });
  return buffer as ArrayBuffer;
}

/**
 * 表紙スライドを追加
 */
function addTitleSlide(slide: any, data: ProposalSlide) {
  // 背景色
  slide.background = { color: '1F4788' };

  // ロゴを追加（エラー処理付き）
  try {
    slide.addImage({
      data: LOGO_BASE64,
      x: 0.5,
      y: 0.5,
      w: 3.0,
      h: 0.6,
    });
  } catch (error) {
    console.error('Logo addition error:', error);
    // ロゴ追加失敗時は会社名をテキストで表示
    slide.addText('株式会社おきはわアセットブリッジ', {
      x: 0.5,
      y: 0.5,
      w: 3.0,
      h: 0.6,
      fontSize: 14,
      bold: true,
      color: 'FFFFFF',
    });
  }

  // メインタイトル
  slide.addText(data.title, {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    valign: 'middle',
  });

  // サブタイトル（コンテンツ）
  const subtitle = data.content.join('\n');
  slide.addText(subtitle, {
    x: 1,
    y: 4.2,
    w: 8,
    h: 2,
    fontSize: 18,
    color: 'FFFFFF',
    align: 'center',
    valign: 'top',
  });
}

/**
 * コンテンツスライドを追加
 */
function addContentSlide(slide: any, data: ProposalSlide, index: number) {
  // 背景色
  slide.background = { color: 'FFFFFF' };

  // ヘッダー（タイトルバー）
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 10,
    h: 1,
    fill: { color: '1F4788' },
  });

  // ロゴを追加（ヘッダー右側）- エラー処理付き
  try {
    slide.addImage({
      data: LOGO_BASE64,
      x: 6.5,
      y: 0.2,
      w: 3.0,
      h: 0.6,
    });
  } catch (error) {
    console.error('Logo addition error:', error);
    // ロゴ追加失敗時は会社名をテキストで表示
    slide.addText('おきはわアセットブリッジ', {
      x: 6.5,
      y: 0.2,
      w: 3.0,
      h: 0.6,
      fontSize: 12,
      color: 'FFFFFF',
      align: 'right',
    });
  }

  // タイトル
  slide.addText(data.title, {
    x: 0.5,
    y: 0.2,
    w: 6.0,
    h: 0.6,
    fontSize: 28,
    bold: true,
    color: 'FFFFFF',
    valign: 'middle',
  });

  // コンテンツ（箇条書き）
  const bulletPoints = data.content.map((item) => ({
    text: item,
    options: {
      bullet: { type: 'number' },
      fontSize: 18,
      color: '333333',
      paraSpaceAfter: 12,
    },
  }));

  slide.addText(bulletPoints, {
    x: 0.8,
    y: 1.5,
    w: 8.4,
    h: 5.0,
    fontSize: 18,
    color: '333333',
    bullet: true,
    valign: 'top',
  });

  // フッター（ページ番号）
  slide.addText(`${index + 1}`, {
    x: 9.2,
    y: 7.0,
    w: 0.5,
    h: 0.3,
    fontSize: 12,
    color: '666666',
    align: 'right',
  });

  // フッターにロゴ - エラー処理付き
  try {
    slide.addImage({
      data: LOGO_BASE64,
      x: 0.3,
      y: 6.8,
      w: 2.0,
      h: 0.4,
    });
  } catch (error) {
    console.error('Footer logo addition error:', error);
    // フッターロゴなしでも問題なし
  }

  // ノート（あれば）
  if (data.notes) {
    slide.addNotes(data.notes);
  }
}

/**
 * PDFファイルを生成
 */
export async function generatePDF(
  content: ProposalContent,
  propertyTitle: string,
  targetAudience: string
): Promise<ArrayBuffer> {
  // PDFドキュメント定義
  const docDefinition: any = {
    info: {
      title: `${propertyTitle} 提案資料`,
      author: '株式会社おきはわアセットブリッジ',
      subject: `${propertyTitle} - ${targetAudience}向け提案`,
    },
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [],
    defaultStyle: {
      font: 'Roboto',
    },
    styles: {
      header: {
        fontSize: 28,
        bold: true,
        margin: [0, 0, 0, 20],
        color: '#1F4788',
      },
      subheader: {
        fontSize: 18,
        bold: true,
        margin: [0, 20, 0, 10],
        color: '#333333',
      },
      content: {
        fontSize: 12,
        margin: [0, 0, 0, 10],
      },
    },
  };

  // 表紙ページ
  const coverSlide = content.slides[0];
  docDefinition.content.push(
    {
      text: '株式会社おきはわアセットブリッジ',
      style: 'content',
      margin: [0, 100, 0, 50],
      alignment: 'center',
    },
    {
      text: coverSlide.title,
      style: 'header',
      alignment: 'center',
      fontSize: 32,
    },
    {
      text: coverSlide.content.join('\n'),
      style: 'content',
      alignment: 'center',
      margin: [0, 30, 0, 0],
    }
  );

  // コンテンツページ
  for (let i = 1; i < content.slides.length; i++) {
    const slide = content.slides[i];
    
    docDefinition.content.push(
      { text: '', pageBreak: 'before' },
      { text: slide.title, style: 'subheader' },
      {
        ul: slide.content.map((item, idx) => ({
          text: item,
          margin: [0, 5, 0, 5],
        })),
        style: 'content',
      }
    );
  }

  // フッター追加
  docDefinition.footer = function (currentPage: number, pageCount: number) {
    return {
      text: `株式会社おきはわアセットブリッジ - ${currentPage} / ${pageCount}`,
      alignment: 'center',
      fontSize: 10,
      margin: [0, 20, 0, 0],
    };
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      pdfDocGenerator.getBuffer((buffer: Buffer) => {
        resolve(buffer.buffer as ArrayBuffer);
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
}
