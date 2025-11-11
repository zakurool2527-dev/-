import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { Bindings, GenerateProposalRequest, Proposal } from '../types/bindings';
import { analyzePDFWithAI } from '../utils/pdfAnalyzer';
import { generateProposalContent } from '../utils/proposalGenerator';
import { generatePowerPoint, generateODF } from '../utils/pptxGenerator';

const api = new Hono<{ Bindings: Bindings }>();

/**
 * PDF解析エンドポイント
 * POST /api/analyze-pdf
 */
api.post('/analyze-pdf', async (c) => {
  try {
    const { pdfUrl } = await c.req.json();

    if (!pdfUrl) {
      return c.json({ error: 'PDF URL is required' }, 400);
    }

    // PDFのテキストを取得（実際にはCrawler APIなどを使用）
    const response = await fetch(pdfUrl);
    const pdfText = await response.text();

    // AI解析
    const analysis = await analyzePDFWithAI(pdfText, c.env.AI);

    return c.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('PDF analysis error:', error);
    return c.json(
      {
        error: 'Failed to analyze PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * 提案資料生成エンドポイント
 * POST /api/generate-proposal
 */
api.post('/generate-proposal', async (c) => {
  try {
    const req: GenerateProposalRequest = await c.req.json();

    const { pdfUrl, pdfFilename, targetAudience, format, analysis } = req;

    // バリデーション
    if (!pdfUrl || !pdfFilename || !targetAudience || !format || !analysis) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // 提案コンテンツ生成
    const content = await generateProposalContent(
      analysis,
      targetAudience,
      c.env.AI
    );

    // ファイル生成
    let fileBuffer: ArrayBuffer;
    let fileExtension: string;

    if (format === 'pptx') {
      fileBuffer = await generatePowerPoint(
        content,
        analysis.title,
        targetAudience
      );
      fileExtension = 'pptx';
    } else {
      fileBuffer = await generateODF(content, analysis.title, targetAudience);
      fileExtension = 'odp';
    }

    // ファイルをBase64エンコード（一時的な保存方法）
    const base64File = arrayBufferToBase64(fileBuffer);

    // データベースに保存
    const proposalId = uuidv4();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO proposals (
        id, pdf_filename, pdf_url, target_audience,
        property_title, property_location, property_price, property_summary,
        generated_content, format, file_url, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        proposalId,
        pdfFilename,
        pdfUrl,
        targetAudience,
        analysis.title,
        analysis.location,
        analysis.price,
        analysis.summary,
        JSON.stringify(content),
        format,
        `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${base64File}`,
        now
      )
      .run();

    // 提案先カテゴリーを記録
    await c.env.DB.prepare(
      `INSERT INTO target_categories (name, usage_count, last_used_at)
       VALUES (?, 1, ?)
       ON CONFLICT(name) DO UPDATE SET
         usage_count = usage_count + 1,
         last_used_at = ?`
    )
      .bind(targetAudience, now, now)
      .run();

    return c.json({
      success: true,
      proposalId,
      downloadUrl: `/api/download/${proposalId}`,
      previewData: content,
    });
  } catch (error) {
    console.error('Proposal generation error:', error);
    return c.json(
      {
        error: 'Failed to generate proposal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * 提案資料ダウンロードエンドポイント
 * GET /api/download/:id
 */
api.get('/download/:id', async (c) => {
  try {
    const proposalId = c.req.param('id');

    const result = await c.env.DB.prepare(
      'SELECT * FROM proposals WHERE id = ?'
    )
      .bind(proposalId)
      .first<Proposal>();

    if (!result) {
      return c.json({ error: 'Proposal not found' }, 404);
    }

    // Base64からバイナリに変換
    const base64Data = result.file_url.split(',')[1];
    const binaryData = base64ToArrayBuffer(base64Data);

    const filename =
      result.format === 'pptx'
        ? `${result.property_title}_提案資料.pptx`
        : `${result.property_title}_提案資料.odp`;

    return new Response(binaryData, {
      headers: {
        'Content-Type':
          result.format === 'pptx'
            ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            : 'application/vnd.oasis.opendocument.presentation',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          filename
        )}"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return c.json({ error: 'Failed to download file' }, 500);
  }
});

/**
 * 履歴一覧取得エンドポイント
 * GET /api/history
 */
api.get('/history', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const result = await c.env.DB.prepare(
      `SELECT id, pdf_filename, target_audience, property_title,
              property_location, property_price, format, created_at
       FROM proposals
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(limit, offset)
      .all();

    return c.json({
      success: true,
      proposals: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error) {
    console.error('History fetch error:', error);
    return c.json({ error: 'Failed to fetch history' }, 500);
  }
});

/**
 * よく使う提案先一覧取得
 * GET /api/target-categories
 */
api.get('/target-categories', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM target_categories ORDER BY usage_count DESC LIMIT 10'
    ).all();

    return c.json({
      success: true,
      categories: result.results || [],
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

// ユーティリティ関数
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export default api;
