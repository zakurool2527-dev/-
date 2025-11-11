import PptxGenJS from 'pptxgenjs';
import { ProposalContent, ProposalSlide } from '../types/bindings';
import { LOGO_BASE64 } from './logo';

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

  // ロゴを追加
  slide.addImage({
    data: LOGO_BASE64,
    x: 0.5,
    y: 0.5,
    w: 3.0,
    h: 0.6,
  });

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

  // ロゴを追加（ヘッダー右側）
  slide.addImage({
    data: LOGO_BASE64,
    x: 6.5,
    y: 0.2,
    w: 3.0,
    h: 0.6,
  });

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

  // フッター（ページ番号とロゴ）
  slide.addText(`${index + 1}`, {
    x: 9.2,
    y: 7.0,
    w: 0.5,
    h: 0.3,
    fontSize: 12,
    color: '666666',
    align: 'right',
  });

  // フッターにロゴ
  slide.addImage({
    data: LOGO_BASE64,
    x: 0.3,
    y: 6.8,
    w: 2.0,
    h: 0.4,
  });

  // ノート（あれば）
  if (data.notes) {
    slide.addNotes(data.notes);
  }
}

/**
 * ODFプレゼンテーション（.odp）を生成
 * 注意: pptxgenjsはODF形式をネイティブサポートしていないため、
 * ここではPowerPoint形式で生成し、ユーザーに変換を促すか、
 * 別のライブラリを使用する必要があります。
 * 
 * 簡易実装として、PowerPointと同じ形式を返します。
 */
export async function generateODF(
  content: ProposalContent,
  propertyTitle: string,
  targetAudience: string
): Promise<ArrayBuffer> {
  // ODF生成は複雑なため、現時点ではPowerPoint形式を返す
  // 実運用では、LibreOfficeのAPIやODF専用ライブラリを使用
  console.warn('ODF generation not fully implemented. Returning PowerPoint format.');
  return generatePowerPoint(content, propertyTitle, targetAudience);
}
