// グローバル変数
let currentPdfFile = null;
let currentPdfUrl = null;
let analysisResult = null;

// DOM要素
const uploadArea = document.getElementById('uploadArea');
const pdfFileInput = document.getElementById('pdfFile');
const pdfInfo = document.getElementById('pdfInfo');
const pdfName = document.getElementById('pdfName');
const pdfSize = document.getElementById('pdfSize');
const removePdfBtn = document.getElementById('removePdf');
const targetAudienceInput = document.getElementById('targetAudience');
const suggestionsDiv = document.getElementById('suggestions');
const generateBtn = document.getElementById('generateBtn');
const loading = document.getElementById('loading');
const preview = document.getElementById('preview');
const previewContent = document.getElementById('previewContent');
const downloadBtn = document.getElementById('downloadBtn');
const newProposalBtn = document.getElementById('newProposal');
const historyList = document.getElementById('historyList');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadHistory();
  loadTargetCategories();
});

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
  // ファイルアップロード
  uploadArea.addEventListener('click', () => pdfFileInput.click());
  pdfFileInput.addEventListener('change', handleFileSelect);

  // ドラッグ&ドロップ
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // PDF削除
  removePdfBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetPdfUpload();
  });

  // 提案先入力
  targetAudienceInput.addEventListener('input', validateForm);

  // 生成ボタン
  generateBtn.addEventListener('click', generateProposal);

  // 新規作成
  newProposalBtn.addEventListener('click', resetForm);
}

/**
 * ファイル選択処理
 */
function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

/**
 * ファイル処理
 */
function handleFile(file) {
  if (file.type !== 'application/pdf') {
    alert('PDFファイルを選択してください');
    return;
  }

  currentPdfFile = file;
  
  // ファイル情報表示
  pdfName.textContent = file.name;
  pdfSize.textContent = formatFileSize(file.size);
  uploadArea.classList.add('hidden');
  pdfInfo.classList.remove('hidden');

  // ユーザーが提供したPDFのURLを使用
  // 実際のアプリではファイルをアップロードしてURLを取得
  currentPdfUrl = 'https://page.gensparksite.com/get_upload_url/fc2322519c93344df4a23fcc4efe505af9200b27a51e12b94464c52411def613/default/7d4e9e8e-3f9c-4618-9ba7-bd90cb5e1d44';

  validateForm();
}

/**
 * PDFアップロードリセット
 */
function resetPdfUpload() {
  currentPdfFile = null;
  currentPdfUrl = null;
  pdfFileInput.value = '';
  uploadArea.classList.remove('hidden');
  pdfInfo.classList.add('hidden');
  validateForm();
}

/**
 * フォーム検証
 */
function validateForm() {
  const hasFile = currentPdfFile !== null;
  const hasTarget = targetAudienceInput.value.trim().length > 0;
  generateBtn.disabled = !(hasFile && hasTarget);
}

/**
 * 提案資料生成
 */
async function generateProposal() {
  try {
    generateBtn.disabled = true;
    loading.classList.remove('hidden');
    preview.classList.add('hidden');

    // 1. PDF解析
    const analysisResponse = await axios.post('/api/analyze-pdf', {
      pdfUrl: currentPdfUrl,
    });

    if (!analysisResponse.data.success) {
      throw new Error('PDF解析に失敗しました');
    }

    analysisResult = analysisResponse.data.analysis;

    // 2. 提案資料生成
    const format = document.querySelector('input[name="format"]:checked').value;
    const targetAudience = targetAudienceInput.value.trim();

    const generateResponse = await axios.post('/api/generate-proposal', {
      pdfUrl: currentPdfUrl,
      pdfFilename: currentPdfFile.name,
      targetAudience,
      format,
      analysis: analysisResult,
    });

    if (!generateResponse.data.success) {
      throw new Error('提案資料の生成に失敗しました');
    }

    // プレビュー表示
    displayPreview(generateResponse.data.previewData);
    downloadBtn.href = generateResponse.data.downloadUrl;

    loading.classList.add('hidden');
    preview.classList.remove('hidden');

    // 履歴を更新
    loadHistory();
  } catch (error) {
    console.error('Generation error:', error);
    alert('エラーが発生しました: ' + (error.response?.data?.error || error.message));
    loading.classList.add('hidden');
    generateBtn.disabled = false;
  }
}

/**
 * プレビュー表示
 */
function displayPreview(content) {
  previewContent.innerHTML = '';

  content.slides.forEach((slide, index) => {
    const slideDiv = document.createElement('div');
    slideDiv.className = 'p-4 bg-white rounded border border-gray-200';
    
    const title = document.createElement('h4');
    title.className = 'font-semibold text-gray-800 mb-2';
    title.textContent = `${index + 1}. ${slide.title}`;
    
    const ul = document.createElement('ul');
    ul.className = 'list-disc list-inside text-sm text-gray-600 space-y-1';
    
    slide.content.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    
    slideDiv.appendChild(title);
    slideDiv.appendChild(ul);
    previewContent.appendChild(slideDiv);
  });
}

/**
 * フォームリセット
 */
function resetForm() {
  resetPdfUpload();
  targetAudienceInput.value = '';
  document.querySelector('input[name="format"][value="pptx"]').checked = true;
  preview.classList.add('hidden');
  generateBtn.disabled = true;
}

/**
 * 履歴読み込み
 */
async function loadHistory() {
  try {
    const response = await axios.get('/api/history?limit=20');
    
    if (response.data.success && response.data.proposals.length > 0) {
      historyList.innerHTML = '';
      
      response.data.proposals.forEach(proposal => {
        const item = document.createElement('div');
        item.className = 'p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition';
        item.innerHTML = `
          <div class="flex justify-between items-start mb-1">
            <p class="font-semibold text-sm text-gray-800 truncate">${proposal.property_title || proposal.pdf_filename}</p>
            <span class="text-xs text-gray-500">${formatDate(proposal.created_at)}</span>
          </div>
          <p class="text-xs text-gray-600 mb-1">提案先: ${proposal.target_audience}</p>
          <div class="flex gap-2 text-xs">
            <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded">${proposal.format.toUpperCase()}</span>
            <span class="text-gray-500">${proposal.property_price || '-'}</span>
          </div>
        `;
        
        item.addEventListener('click', () => {
          window.location.href = `/api/download/${proposal.id}`;
        });
        
        historyList.appendChild(item);
      });
    }
  } catch (error) {
    console.error('History load error:', error);
  }
}

/**
 * よく使う提案先読み込み
 */
async function loadTargetCategories() {
  try {
    const response = await axios.get('/api/target-categories');
    
    if (response.data.success && response.data.categories.length > 0) {
      suggestionsDiv.innerHTML = '<p class="text-xs text-gray-500 mb-1">よく使う提案先:</p>';
      
      const tags = document.createElement('div');
      tags.className = 'flex flex-wrap gap-2';
      
      response.data.categories.forEach(category => {
        const tag = document.createElement('button');
        tag.className = 'px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full hover:bg-blue-100 transition';
        tag.textContent = category.name;
        tag.addEventListener('click', () => {
          targetAudienceInput.value = category.name;
          validateForm();
        });
        tags.appendChild(tag);
      });
      
      suggestionsDiv.appendChild(tags);
    }
  } catch (error) {
    console.error('Categories load error:', error);
  }
}

/**
 * ファイルサイズフォーマット
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 日付フォーマット
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return '今日';
  if (days === 1) return '昨日';
  if (days < 7) return `${days}日前`;
  
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}
