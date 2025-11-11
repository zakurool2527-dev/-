// Cloudflare Workers Bindings
export type Bindings = {
  DB: D1Database;
  AI: Ai;
};

// 提案履歴の型定義
export type Proposal = {
  id: string;
  pdf_filename: string;
  pdf_url: string;
  target_audience: string;
  property_title: string | null;
  property_location: string | null;
  property_price: string | null;
  property_summary: string | null;
  generated_content: string;
  format: 'pptx' | 'pdf';
  file_url: string;
  created_at: string;
};

// 提案先カテゴリーの型定義
export type TargetCategory = {
  id: number;
  name: string;
  usage_count: number;
  last_used_at: string;
};

// PDF解析結果の型定義
export type PDFAnalysis = {
  title: string;
  location: string;
  price: string;
  landArea: string;
  buildingArea: string;
  purpose: string;
  summary: string;
  keyFeatures: string[];
  nearbyFacilities: string[];
  currentStatus: string;
};

// 提案資料生成リクエストの型定義
export type GenerateProposalRequest = {
  pdfUrl: string;
  pdfFilename: string;
  targetAudience: string;
  format: 'pptx' | 'pdf';
  analysis: PDFAnalysis;
};

// 提案資料コンテンツの型定義
export type ProposalContent = {
  slides: ProposalSlide[];
};

export type ProposalSlide = {
  title: string;
  content: string[];
  notes?: string;
};
