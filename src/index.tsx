import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import { Bindings } from './types/bindings';
import api from './routes/api';

const app = new Hono<{ Bindings: Bindings }>();

// CORS設定
app.use('/api/*', cors());

// 静的ファイル配信
app.use('/static/*', serveStatic({ root: './public' }));

// APIルート
app.route('/api', api);

// メインページ
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>不動産提案資料自動生成システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .upload-area {
                border: 2px dashed #cbd5e0;
                transition: all 0.3s ease;
            }
            .upload-area:hover {
                border-color: #4299e1;
                background-color: #ebf8ff;
            }
            .upload-area.dragover {
                border-color: #3182ce;
                background-color: #bee3f8;
            }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen">
            <!-- ヘッダー -->
            <header class="bg-blue-900 text-white shadow-lg">
                <div class="container mx-auto px-6 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <img src="/static/logo.png" alt="おきはわアセットブリッジ" class="h-12 bg-white px-3 py-1 rounded">
                            <div>
                                <h1 class="text-2xl font-bold">
                                    <i class="fas fa-file-powerpoint mr-2"></i>
                                    不動産提案資料自動生成システム
                                </h1>
                                <p class="text-blue-200 text-sm mt-1">PDF概要書から提案先に最適化された資料を自動生成</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <!-- メインコンテンツ -->
            <main class="container mx-auto px-6 py-8">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- 左側: アップロード＆設定 -->
                    <div class="lg:col-span-2">
                        <div class="bg-white rounded-lg shadow-md p-6">
                            <h2 class="text-xl font-semibold mb-4 text-gray-800">
                                <i class="fas fa-upload mr-2 text-blue-600"></i>
                                新規提案資料作成
                            </h2>

                            <!-- PDFアップロードエリア -->
                            <div id="uploadArea" class="upload-area rounded-lg p-8 text-center mb-6 cursor-pointer">
                                <i class="fas fa-cloud-upload-alt text-5xl text-gray-400 mb-4"></i>
                                <p class="text-lg text-gray-600 mb-2">PDFファイルをドラッグ＆ドロップ</p>
                                <p class="text-sm text-gray-500 mb-4">または</p>
                                <button class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                                    ファイルを選択
                                </button>
                                <input type="file" id="pdfFile" accept=".pdf" class="hidden">
                            </div>

                            <!-- アップロード済みPDF情報 -->
                            <div id="pdfInfo" class="hidden mb-6 p-4 bg-blue-50 rounded-lg">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center">
                                        <i class="fas fa-file-pdf text-red-500 text-2xl mr-3"></i>
                                        <div>
                                            <p id="pdfName" class="font-semibold text-gray-800"></p>
                                            <p id="pdfSize" class="text-sm text-gray-600"></p>
                                        </div>
                                    </div>
                                    <button id="removePdf" class="text-red-500 hover:text-red-700">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- 提案先入力 -->
                            <div class="mb-6">
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    <i class="fas fa-users mr-2"></i>
                                    提案先
                                </label>
                                <input 
                                    type="text" 
                                    id="targetAudience" 
                                    placeholder="例: 個人投資家、マンションデベロッパー、事業法人"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                <div id="suggestions" class="mt-2 space-y-1"></div>
                            </div>

                            <!-- フォーマット選択 -->
                            <div class="mb-6">
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    <i class="fas fa-file-export mr-2"></i>
                                    出力フォーマット
                                </label>
                                <div class="flex gap-4">
                                    <label class="flex items-center cursor-pointer">
                                        <input type="radio" name="format" value="pptx" checked class="mr-2">
                                        <i class="fas fa-file-powerpoint text-orange-500 mr-2"></i>
                                        <span>PowerPoint (.pptx)</span>
                                    </label>
                                    <label class="flex items-center cursor-pointer">
                                        <input type="radio" name="format" value="pdf" class="mr-2">
                                        <i class="fas fa-file-pdf text-red-500 mr-2"></i>
                                        <span>PDF (.pdf)</span>
                                    </label>
                                </div>
                            </div>

                            <!-- 生成ボタン -->
                            <button 
                                id="generateBtn" 
                                class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                disabled
                            >
                                <i class="fas fa-magic mr-2"></i>
                                提案資料を生成
                            </button>

                            <!-- ローディング表示 -->
                            <div id="loading" class="hidden mt-4 text-center">
                                <i class="fas fa-spinner fa-spin text-3xl text-blue-600 mb-2"></i>
                                <p class="text-gray-600">AI解析中...しばらくお待ちください</p>
                            </div>

                            <!-- プレビューエリア -->
                            <div id="preview" class="hidden mt-6 p-4 bg-gray-50 rounded-lg">
                                <h3 class="font-semibold text-lg mb-3">生成プレビュー</h3>
                                <div id="previewContent" class="space-y-4"></div>
                                <div class="mt-4 flex gap-3">
                                    <a id="downloadBtn" class="flex-1 bg-green-600 text-white py-2 rounded-lg text-center hover:bg-green-700">
                                        <i class="fas fa-download mr-2"></i>
                                        ダウンロード
                                    </a>
                                    <button id="newProposal" class="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700">
                                        <i class="fas fa-plus mr-2"></i>
                                        新規作成
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 右側: 履歴 -->
                    <div class="lg:col-span-1">
                        <div class="bg-white rounded-lg shadow-md p-6">
                            <h2 class="text-xl font-semibold mb-4 text-gray-800">
                                <i class="fas fa-history mr-2 text-green-600"></i>
                                生成履歴
                            </h2>
                            <div id="historyList" class="space-y-3">
                                <p class="text-gray-500 text-sm text-center py-8">履歴がありません</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `);
});

export default app;
