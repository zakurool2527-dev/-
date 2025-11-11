import { PDFAnalysis, ProposalContent, ProposalSlide } from '../types/bindings';

/**
 * 提案先に応じた提案資料のコンテンツを生成
 */
export async function generateProposalContent(
  analysis: PDFAnalysis,
  targetAudience: string,
  ai: Ai
): Promise<ProposalContent> {
  const prompt = `あなたは不動産の提案資料を作成するプロフェッショナルです。

以下の不動産情報をもとに、「${targetAudience}」向けの提案資料（3-5枚のスライド）を作成してください。

【不動産情報】
- タイトル: ${analysis.title}
- 所在地: ${analysis.location}
- 価格: ${analysis.price}
- 土地面積: ${analysis.landArea}
- 建物面積: ${analysis.buildingArea}
- 用途地域: ${analysis.purpose}
- 要約: ${analysis.summary}
- 特徴: ${analysis.keyFeatures.join(', ')}
- 近隣施設: ${analysis.nearbyFacilities.join(', ')}
- 現状: ${analysis.currentStatus}

【提案先の特性】
${getAudienceCharacteristics(targetAudience)}

以下のJSON形式で、3-5枚のスライドを作成してください：
{
  "slides": [
    {
      "title": "スライドタイトル",
      "content": ["ポイント1", "ポイント2", "ポイント3"],
      "notes": "スライドの補足説明（オプション）"
    }
  ]
}

重要：
- 1枚目は表紙（タイトル、物件名、提案先）
- 2-4枚目は提案内容（提案先のニーズに合わせた内容）
- 最終枚目はまとめ・次のステップ
- 各スライドのcontentは3-5個の箇条書き
- 提案先の関心事項を最優先に`;

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 3072,
    });

    // @ts-ignore
    const content = response.response || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }

    throw new Error('Failed to parse AI response');
  } catch (error) {
    console.error('Content generation error:', error);
    // フォールバック：基本的なスライド構成
    return generateFallbackContent(analysis, targetAudience);
  }
}

/**
 * 提案先の特性を取得
 */
function getAudienceCharacteristics(targetAudience: string): string {
  const audienceLower = targetAudience.toLowerCase();
  
  if (audienceLower.includes('個人') || audienceLower.includes('投資家')) {
    return `
- 投資収益性（利回り、キャッシュフロー）を重視
- 資産価値の維持・向上に関心
- 税制メリットや節税効果を求める
- リスクとリターンのバランスを考慮`;
  }
  
  if (audienceLower.includes('デベロッパー') || audienceLower.includes('開発')) {
    return `
- 開発ポテンシャル（容積率、建ぺい率）を重視
- 周辺環境と需要分析に関心
- 法規制とインフラ整備状況を確認
- プロジェクト収益性と実現可能性を評価`;
  }
  
  if (audienceLower.includes('事業') || audienceLower.includes('法人')) {
    return `
- 事業用途への適合性を重視
- アクセス性と利便性を評価
- コスト効率と拡張性を考慮
- ブランドイメージとの整合性を確認`;
  }
  
  if (audienceLower.includes('飲食') || audienceLower.includes('小売')) {
    return `
- 立地と人流を最重視
- 視認性と駐車場の有無を確認
- 周辺の競合状況を分析
- 客層とターゲット市場を評価`;
  }
  
  return `
- 物件の基本情報と特徴を重視
- コストパフォーマンスを評価
- 立地と利便性を確認
- 将来的な価値と可能性を考慮`;
}

/**
 * フォールバック用の基本コンテンツ生成
 */
function generateFallbackContent(
  analysis: PDFAnalysis,
  targetAudience: string
): ProposalContent {
  const slides: ProposalSlide[] = [
    {
      title: '不動産投資提案書',
      content: [
        `物件名: ${analysis.title}`,
        `所在地: ${analysis.location}`,
        `提案先: ${targetAudience}`,
        `提案日: ${new Date().toLocaleDateString('ja-JP')}`,
      ],
    },
    {
      title: '物件概要',
      content: [
        `価格: ${analysis.price}`,
        `土地面積: ${analysis.landArea}`,
        `用途地域: ${analysis.purpose}`,
        `現状: ${analysis.currentStatus}`,
      ],
      notes: analysis.summary,
    },
    {
      title: '物件の特徴',
      content: analysis.keyFeatures.length > 0 
        ? analysis.keyFeatures 
        : ['詳細情報は資料をご参照ください'],
    },
    {
      title: '立地環境',
      content: analysis.nearbyFacilities.length > 0
        ? analysis.nearbyFacilities
        : ['アクセス良好な立地', '周辺環境充実'],
    },
    {
      title: 'まとめ・次のステップ',
      content: [
        '現地視察のご案内',
        '詳細資料のご提供',
        '資金計画のご相談',
        'ご質問・ご相談はお気軽に',
      ],
    },
  ];

  return { slides };
}
