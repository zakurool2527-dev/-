import { PDFAnalysis } from '../types/bindings';

/**
 * PDFのテキストからCloudflare AIを使用して不動産情報を抽出
 */
export async function analyzePDFWithAI(
  pdfText: string,
  ai: Ai | undefined
): Promise<PDFAnalysis> {
  // AIバインディングがない場合はフォールバック
  if (!ai) {
    console.warn('AI binding not available, using fallback analysis');
    return fallbackAnalysis(pdfText);
  }

  const prompt = `以下は不動産概要書のテキストです。この内容から重要な情報を抽出し、JSON形式で返してください。

不動産概要書のテキスト:
${pdfText.substring(0, 3000)}

以下のJSON形式で情報を抽出してください：
{
  "title": "物件の簡潔なタイトル（例：浦添牧港440坪土地）",
  "location": "所在地（市区町村レベル）",
  "price": "価格",
  "landArea": "土地面積",
  "buildingArea": "建物面積（あれば）",
  "purpose": "用途地域",
  "summary": "物件の要約（2-3文）",
  "keyFeatures": ["特徴1", "特徴2", "特徴3"],
  "nearbyFacilities": ["近隣施設1", "近隣施設2"],
  "currentStatus": "現状（空き、賃貸中など）"
}`;

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2048,
    });

    // @ts-ignore - Cloudflare AI response type
    const content = response.response || '';
    
    // JSONを抽出（```json ``` で囲まれている場合に対応）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Failed to parse AI response');
  } catch (error) {
    console.error('AI analysis error:', error);
    // フォールバック：基本的なテキスト解析
    return fallbackAnalysis(pdfText);
  }
}

/**
 * AI失敗時のフォールバック解析
 */
function fallbackAnalysis(text: string): PDFAnalysis {
  const lines = text.split('\n').filter(line => line.trim());
  
  // 簡易的なパターンマッチング
  const priceMatch = text.match(/価格[：:]\s*([0-9,]+万円)/);
  const locationMatch = text.match(/所在地[：:]\s*([^\n]+)/);
  const landAreaMatch = text.match(/土地[：:]\s*([0-9.]+坪)/);
  
  return {
    title: '不動産物件',
    location: locationMatch ? locationMatch[1].trim() : '情報なし',
    price: priceMatch ? priceMatch[1] : '情報なし',
    landArea: landAreaMatch ? landAreaMatch[1] : '情報なし',
    buildingArea: '情報なし',
    purpose: '情報なし',
    summary: text.substring(0, 200) + '...',
    keyFeatures: ['詳細はPDFをご確認ください'],
    nearbyFacilities: [],
    currentStatus: '情報なし',
  };
}

/**
 * PDFからテキストを抽出（簡易版 - 実際のPDF解析はCrawlerで行う）
 */
export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  // Cloudflare WorkersではPDF.jsなどが使えないため、
  // 外部サービスやCrawler APIを利用することを想定
  // ここでは簡易的な実装
  
  try {
    const response = await fetch(pdfUrl);
    const text = await response.text();
    return text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
}
