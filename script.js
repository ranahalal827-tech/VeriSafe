// ═══════════════════════════════════════════════════════════════════════════
// VeriSafe AI — script.js
// ═══════════════════════════════════════════════════════════════════════════

// ── PDF.js Worker ──────────────────────────────────────────────────────────
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ── Tools Data ─────────────────────────────────────────────────────────────
const toolsData = {
    'from-pdf': {
        'pdf-to-word':  { name: 'PDF إلى Word',  icon: 'fa-file-word',       color: 'blue',        accept: '.pdf' },
        'pdf-to-excel': { name: 'PDF إلى Excel', icon: 'fa-file-excel',      color: 'green',       accept: '.pdf' },
        'pdf-to-ppt':   { name: 'PDF إلى PPT',   icon: 'fa-file-powerpoint', color: 'orange',      accept: '.pdf' },
        'pdf-to-txt':   { name: 'PDF إلى TXT',   icon: 'fa-file-alt',        color: 'yellow',      accept: '.pdf' },
        'pdf-to-png':   { name: 'PDF إلى PNG',   icon: 'fa-file-image',      color: 'purple',      accept: '.pdf' },
        'pdf-to-jpeg':  { name: 'PDF إلى JPEG',  icon: 'fa-file-image',      color: 'purple-dark', accept: '.pdf' },
        'pdf-to-html':  { name: 'PDF إلى HTML',  icon: 'fa-globe',           color: 'blue-light',  accept: '.pdf' },
        'pdf-to-xml':   { name: 'PDF إلى XML',   icon: 'fa-file-code',       color: 'green-dark',  accept: '.pdf' },
        'pdf-to-rtf':   { name: 'PDF إلى RTF',   icon: 'fa-file-alt',        color: 'purple-light',accept: '.pdf' },
    },
    'to-pdf': {
        'word-to-pdf':  { name: 'Word إلى PDF',        icon: 'fa-file-word',       color: 'blue-dark',   accept: '.doc,.docx' },
        'excel-to-pdf': { name: 'Excel إلى PDF',       icon: 'fa-file-excel',      color: 'green-light', accept: '.xls,.xlsx' },
        'ppt-to-pdf':   { name: 'PPT إلى PDF',         icon: 'fa-file-powerpoint', color: 'orange-light',accept: '.ppt,.pptx' },
        'image-to-pdf': { name: 'صورة إلى PDF',        icon: 'fa-image',           color: 'pink',        accept: 'image/*' },
        'txt-to-pdf':   { name: 'TXT إلى PDF',         icon: 'fa-file-alt',        color: 'yellow-dark', accept: '.txt' },
        'rtf-to-pdf':   { name: 'RTF إلى PDF',         icon: 'fa-file-alt',        color: 'blue-dark',   accept: '.rtf' },
        'ocr-to-word':  { name: 'صورة OCR إلى Word',   icon: 'fa-eye',             color: 'cyan',        accept: 'image/*' },
        'ocr-to-txt':   { name: 'صورة OCR إلى نص',    icon: 'fa-font',            color: 'yellow',      accept: 'image/*' },
        'docx-preview': { name: 'عرض ملف Word',        icon: 'fa-file-lines',      color: 'blue',        accept: '.doc,.docx' },
    },
    'merge': {
        'merge-pdf':    { name: 'دمج PDF',    icon: 'fa-object-group', color: 'blue',  accept: '.pdf' },
        'split-pdf':    { name: 'تقسيم PDF', icon: 'fa-scissors',     color: 'green', accept: '.pdf' },
        'compress-pdf': { name: 'ضغط PDF',   icon: 'fa-compress',     color: 'red',   accept: '.pdf' },
    }
};

// ── Global State ───────────────────────────────────────────────────────────
let currentCategory  = 'from-pdf';
let currentTool      = '';
let currentFile      = null;
let convertedData    = null;
let fileQueue        = [];
let docPreviewHtml   = '';

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadTools(currentCategory);
    setupSideNav();
    loadRecentFiles();
});

// ── Side Nav ───────────────────────────────────────────────────────────────
function setupSideNav() {
    const labels = {
        'from-pdf': 'التحويل من PDF',
        'to-pdf':   'التحويل إلى PDF',
        'merge':    'دمج وتقسيم',
        'all':      'جميع الأدوات'
    };
    document.querySelectorAll('.side-nav-item').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.side-nav-item').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
            document.getElementById('currentCategoryLabel').textContent = labels[currentCategory] || '';
            loadTools(currentCategory);
        });
    });
}

// ── Tools Grid ─────────────────────────────────────────────────────────────
function loadTools(category) {
    const grid = document.getElementById('toolsGrid');
    grid.innerHTML = '';
    const tools = category === 'all'
        ? { ...toolsData['from-pdf'], ...toolsData['to-pdf'], ...toolsData['merge'] }
        : (toolsData[category] || {});
    Object.keys(tools).forEach(id => {
        const t = tools[id];
        const card = document.createElement('div');
        card.className = `tool-card ${t.color}`;
        card.innerHTML = `<i class="fas ${t.icon}"></i><span>${t.name}</span>`;
        card.onclick = () => openConversionModal(id, t);
        grid.appendChild(card);
    });
}

// ── Smart AI Suggestion ────────────────────────────────────────────────────
function smartCategorize(file) {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    if (type.startsWith('image/')) {
        const isScreen = name.includes('screenshot') || name.includes('screen') || name.includes('capture');
        return isScreen
            ? 'تم اكتشاف Screenshot — اقتراح: استخراج النص بـ OCR أو تحويل إلى PDF'
            : 'تم اكتشاف صورة — اقتراح: تحويل إلى PDF أو استخراج النص بـ OCR';
    }
    if (type === 'application/pdf' || name.endsWith('.pdf'))
        return 'تم اكتشاف PDF — سيتم تطبيق OCR تلقائياً إذا كان الملف مسحوباً';
    if (name.match(/\.docx?$/))
        return 'تم اكتشاف ملف Word — يمكن عرضه مباشرة أو تحويله إلى PDF';
    return null;
}

function showAISuggestion(file) {
    const msg = smartCategorize(file);
    const el  = document.getElementById('aiSuggestion');
    if (!msg) { el.style.display = 'none'; return; }
    document.getElementById('aiSuggestionText').textContent = msg;
    el.style.display = 'flex';
}

// ── Image Upscaling ────────────────────────────────────────────────────────
function upscaleImage(file, scale = 2) {
    return new Promise(resolve => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width  = img.width  * scale;
            c.height = img.height * scale;
            const ctx = c.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            c.toBlob(b => resolve(b), file.type || 'image/png', 0.95);
        };
        img.src = url;
    });
}

// ── Conversion Modal ───────────────────────────────────────────────────────
function openConversionModal(toolId, tool) {
    currentTool = toolId;
    let info = tool;
    if (!info) {
        for (const cat in toolsData) {
            if (toolsData[cat][toolId]) { info = toolsData[cat][toolId]; break; }
        }
    }
    if (!info) return;

    document.getElementById('modalTitle').textContent = info.name;

    const ua = document.getElementById('uploadArea');
    ua.style.display = 'flex';
    ua.innerHTML = `
        <i class="fas fa-cloud-arrow-up"></i>
        <h3>اسحب الملفات هنا أو انقر للاختيار</h3>
        <p>يدعم رفع أكثر من ملف في وقت واحد</p>
        <input type="file" id="fileInput" style="display:none;" multiple accept="${info.accept}">`;

    document.getElementById('conversionProgress').style.display = 'none';
    document.getElementById('conversionResult').style.display  = 'none';
    document.getElementById('fileQueue').style.display         = 'none';
    document.getElementById('aiSuggestion').style.display      = 'none';
    document.getElementById('previewDocBtn').style.display     = 'none';
    document.getElementById('conversionModal').style.display   = 'flex';

    fileQueue = [];
    docPreviewHtml = '';
    convertedData  = null;
    currentFile    = null;

    setupUploadListeners();
}

function closeModal() {
    document.getElementById('conversionModal').style.display = 'none';
    fileQueue = [];
    docPreviewHtml = '';
}

// ── Upload Listeners ───────────────────────────────────────────────────────
function setupUploadListeners() {
    const ua = document.getElementById('uploadArea');
    const fi = document.getElementById('fileInput');
    if (!ua || !fi) return;

    ua.onclick      = e => { if (e.target !== fi) fi.click(); };
    ua.ondragenter  = e => { e.preventDefault(); ua.classList.add('drag-over'); };
    ua.ondragover   = e => { e.preventDefault(); ua.classList.add('drag-over'); };
    ua.ondragleave  = e => { if (!ua.contains(e.relatedTarget)) ua.classList.remove('drag-over'); };
    ua.ondrop = e => {
        e.preventDefault();
        ua.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        if (files.length) handleFilesSelected(files);
    };
    fi.onchange = e => {
        const files = Array.from(e.target.files);
        if (files.length) handleFilesSelected(files);
    };
}

function handleFilesSelected(files) {
    if (files.length === 1) {
        currentFile = files[0];
        showAISuggestion(files[0]);
        showThumbnailPreview(files[0]);
        showProgress();
        setTimeout(() => convertFile(files[0]), 300);
    } else {
        fileQueue = files;
        showFileQueue(files);
    }
}

function showThumbnailPreview(file) {
    const ua = document.getElementById('uploadArea');
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => {
            ua.innerHTML = `
                <img src="${e.target.result}" class="thumb-preview">
                <p style="color:var(--cyan);margin-top:6px;font-weight:600;">${file.name}</p>
                <p style="color:var(--text-2);font-size:0.8rem;">${(file.size/1024).toFixed(1)} KB</p>`;
        };
        reader.readAsDataURL(file);
    } else {
        const icon = file.name.endsWith('.pdf')        ? 'fa-file-pdf'
                   : file.name.match(/\.docx?$/)       ? 'fa-file-word'
                   : file.name.match(/\.xlsx?$/)       ? 'fa-file-excel'
                   : 'fa-file';
        ua.innerHTML = `
            <i class="fas ${icon}" style="font-size:3.5rem;color:var(--cyan);"></i>
            <p style="color:var(--text-1);margin-top:8px;font-weight:700;">${file.name}</p>
            <p style="color:var(--text-2);font-size:0.8rem;">${(file.size/1024).toFixed(1)} KB</p>`;
    }
}

// ── File Queue ─────────────────────────────────────────────────────────────
function showFileQueue(files) {
    document.getElementById('uploadArea').style.display       = 'none';
    document.getElementById('conversionProgress').style.display = 'none';
    document.getElementById('conversionResult').style.display  = 'none';
    const qEl = document.getElementById('fileQueue');
    qEl.style.display = 'block';
    document.getElementById('queueCount').textContent = `${files.length} ملفات في الانتظار`;
    document.getElementById('fileList').innerHTML = files.map((f, i) => `
        <div class="queue-item" id="qitem-${i}">
            <i class="fas fa-file"></i>
            <span class="queue-name">${f.name}</span>
            <span class="queue-size">${(f.size/1024).toFixed(1)} KB</span>
            <span class="queue-status" id="qstatus-${i}">انتظار</span>
        </div>`).join('');
}

async function convertAllFiles() {
    document.getElementById('btnConvertAll').disabled = true;
    const results = [];
    for (let i = 0; i < fileQueue.length; i++) {
        const statusEl = document.getElementById(`qstatus-${i}`);
        statusEl.textContent = 'جاري...';
        statusEl.style.color = 'var(--cyan)';
        try {
            currentFile = fileQueue[i];
            await convertFile(fileQueue[i]);
            results.push({ ...convertedData });
            statusEl.textContent = '✓ تم';
            statusEl.style.color = 'var(--success)';
        } catch {
            statusEl.textContent = '✗ خطأ';
            statusEl.style.color = 'var(--error)';
        }
    }
    results.forEach(r => {
        const blob = r.content instanceof Blob ? r.content : new Blob([r.content], { type: r.type });
        const a = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(blob),
            download: r.filename
        });
        a.click();
        URL.revokeObjectURL(a.href);
    });
    showNotification(`تم تحويل ${results.length} ملف`, 'success');
    document.getElementById('btnConvertAll').disabled = false;
}

// ── Progress ───────────────────────────────────────────────────────────────
function setProgress(pct, label = 'جاري التحويل...', detail = '') {
    document.getElementById('progressFill').style.width    = pct + '%';
    document.getElementById('progressPercent').textContent = pct + '%';
    document.getElementById('progressLabel').textContent   = label;
    document.getElementById('progressText').textContent    = detail;
}

function showProgress() {
    document.getElementById('uploadArea').style.display          = 'none';
    document.getElementById('fileQueue').style.display           = 'none';
    document.getElementById('conversionProgress').style.display  = 'block';
    setProgress(0);
}

function showSuccess(previewSrc) {
    setProgress(100, 'اكتمل التحويل!');
    setTimeout(() => {
        document.getElementById('conversionProgress').style.display = 'none';
        const res = document.getElementById('conversionResult');
        res.style.display = 'flex';
        document.getElementById('previewContainer').innerHTML = previewSrc
            ? `<img src="${previewSrc}" class="result-preview" alt="معاينة">`
            : '';
        document.getElementById('downloadBtn').onclick = downloadFile;
        const canPreview = convertedData && [
            'msword','html','text','csv','xml','pdf','image'
        ].some(t => convertedData.type.includes(t));
        document.getElementById('previewDocBtn').style.display = canPreview ? 'flex' : 'none';
    }, 400);
}

// ── Main Converter Dispatcher ──────────────────────────────────────────────
async function convertFile(file) {
    try {
        switch (currentTool) {
            case 'pdf-to-txt':   await convertPDFToText(file);  break;
            case 'pdf-to-png':
            case 'pdf-to-jpeg':  await convertPDFToImage(file, currentTool === 'pdf-to-jpeg' ? 'jpeg' : 'png'); break;
            case 'pdf-to-html':  await convertPDFToHTML(file);  break;
            case 'pdf-to-xml':   await convertPDFToXML(file);   break;
            case 'pdf-to-rtf':   await convertPDFToRTF(file);   break;
            case 'pdf-to-word':  await convertPDFToWord(file);  break;
            case 'pdf-to-excel': await convertPDFToExcel(file); break;
            case 'pdf-to-ppt':   await convertPDFToPPT(file);   break;
            case 'image-to-pdf': await convertImageToPDF(file); break;
            case 'txt-to-pdf':   await convertTextToPDF(file);  break;
            case 'ocr-to-word':  await ocrToWord(file);         break;
            case 'ocr-to-txt':   await ocrToText(file);         break;
            case 'docx-preview': await previewDocx(file);       break;
            case 'word-to-pdf':
            case 'excel-to-pdf':
            case 'ppt-to-pdf':
            case 'rtf-to-pdf':   await convertOfficeToPDF(file); break;
            case 'compress-pdf': await compressPDF(file);        break;
            case 'merge-pdf':    await mergePDF(file);           break;
            case 'split-pdf':    await splitPDF(file);           break;
            default:
                showNotification('هذه الأداة قيد التطوير', 'warning');
                closeModal();
                return;
        }
        if (fileQueue.length === 0) showSuccess(convertedData?._preview || null);
    } catch (err) {
        console.error(err);
        showNotification('خطأ: ' + err.message, 'error');
        if (fileQueue.length === 0) closeModal();
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function extractBodyContent(html) {
    const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return m ? m[1] : html;
}

// ab يمكن أن يكون ArrayBuffer أو pdf object جاهز
async function renderPDFPage(abOrPdf, pageNum = 1, scale = 1.2) {
    const pdf  = (abOrPdf && typeof abOrPdf.getPage === 'function')
        ? abOrPdf
        : await pdfjsLib.getDocument({ data: abOrPdf.slice(0) }).promise;
    const page = await pdf.getPage(pageNum);
    const vp   = page.getViewport({ scale });
    const c    = document.createElement('canvas');
    c.width = vp.width; c.height = vp.height;
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    return { canvas: c, numPages: pdf.numPages, pdf };
}

// ── DOCX Preview ───────────────────────────────────────────────────────────
async function previewDocx(file) {
    setProgress(20, 'قراءة ملف Word...');
    const arrayBuffer = await file.arrayBuffer();
    setProgress(60, 'تحويل المحتوى للمعاينة...');
    const result = await mammoth.convertToHtml({ arrayBuffer });
    docPreviewHtml = result.value;
    setProgress(90, 'جاهز للعرض...');
    convertedData = { content: file, filename: file.name, type: file.type };
    showDocPreview();
}

function showDocPreview() {
    document.getElementById('docPreviewTitle').textContent   = currentFile?.name || 'معاينة';
    document.getElementById('docPreviewContent').innerHTML   = docPreviewHtml || '<p>لا يوجد محتوى</p>';
    document.getElementById('docPreviewModal').style.display = 'flex';
}

function closeDocPreview() {
    document.getElementById('docPreviewModal').style.display = 'none';
}

// ── Split Screen Preview ───────────────────────────────────────────────────
async function openSplitPreview() {
    document.getElementById('splitPreviewTitle').textContent    = currentFile?.name || 'معاينة الملف';
    document.getElementById('splitDownloadBtn').onclick         = downloadFile;
    document.getElementById('splitPreviewModal').style.display  = 'flex';

    ['skeletonOriginal','skeletonResult'].forEach(id =>
        document.getElementById(id).style.display = 'flex');
    ['originalContent','resultContent'].forEach(id =>
        document.getElementById(id).style.display = 'none');

    await Promise.all([populateOriginalPane(), populateResultPane()]);
}

function closeSplitPreview() {
    document.getElementById('splitPreviewModal').style.display = 'none';
}

async function populateOriginalPane() {
    const el   = document.getElementById('originalContent');
    const skel = document.getElementById('skeletonOriginal');
    const file = currentFile;

    try {
        if (!file) {
            el.innerHTML = '<p style="color:var(--text-2)">لا يوجد ملف</p>';
        } else if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            el.innerHTML = `<img src="${url}" style="max-width:100%;border-radius:8px;border:1px solid var(--cyan-border);"
                onload="URL.revokeObjectURL(this.src)">
                <p style="color:var(--text-2);font-size:0.8rem;margin-top:8px;">${file.name} — ${(file.size/1024).toFixed(1)} KB</p>`;
        } else if (file.name.toLowerCase().endsWith('.pdf')) {
            const ab = await file.arrayBuffer();
            const { canvas, numPages } = await renderPDFPage(ab, 1, 1.2);
            canvas.style.cssText = 'width:100%;border-radius:6px;border:1px solid var(--cyan-border);display:block;';
            el.innerHTML = '';
            el.appendChild(canvas);
            if (numPages > 1)
                el.innerHTML += `<p style="color:var(--text-2);font-size:0.8rem;margin-top:8px;text-align:center;">الصفحة 1 من ${numPages}</p>`;
        } else if (file.name.match(/\.docx?$/i)) {
            const ab = await file.arrayBuffer();
            const { value } = await mammoth.convertToHtml({ arrayBuffer: ab });
            el.style.cssText = 'background:#fff;color:#111;font-family:Arial,Tahoma,sans-serif;';
            el.innerHTML = value || '<p>لا يوجد محتوى</p>';
        } else if (file.type.includes('text') || file.name.endsWith('.txt')) {
            const text = await file.text();
            el.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-word;color:var(--text-1);font-family:monospace;font-size:0.85rem;line-height:1.7;">${escapeHtml(text)}</pre>`;
        } else {
            el.innerHTML = `<div style="text-align:center;padding:40px;">
                <i class="fas fa-file" style="font-size:4rem;color:var(--cyan);"></i>
                <p style="color:var(--text-1);margin-top:12px;font-weight:700;">${file.name}</p>
                <p style="color:var(--text-2);font-size:0.85rem;">${(file.size/1024).toFixed(1)} KB</p></div>`;
        }
    } catch (e) {
        el.innerHTML = `<p style="color:var(--error);">خطأ في تحميل الملف: ${e.message}</p>`;
    }
    skel.style.display = 'none';
    el.style.display   = 'block';
}

async function populateResultPane() {
    const el   = document.getElementById('resultContent');
    const skel = document.getElementById('skeletonResult');
    await new Promise(r => setTimeout(r, 200));

    try {
        if (docPreviewHtml) {
            el.innerHTML = docPreviewHtml;
        } else if (convertedData?._preview) {
            el.innerHTML = `<img src="${convertedData._preview}" style="max-width:100%;border-radius:8px;">`;
        } else if (convertedData?.content instanceof Blob) {
            const type = convertedData.type || '';
            if (type.includes('msword') || type.includes('html')) {
                const text = await convertedData.content.text();
                el.innerHTML = `<div style="background:#fff;padding:20px;border-radius:8px;color:#111;font-family:Arial,sans-serif;font-size:13px;line-height:1.8;">${extractBodyContent(text)}</div>`;
            } else if (type.includes('text/plain') || type.includes('csv') || type.includes('xml')) {
                const text = await convertedData.content.text();
                el.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-word;font-size:0.85rem;color:var(--text-1);">${escapeHtml(text.substring(0, 5000))}${text.length > 5000 ? '\n...' : ''}</pre>`;
            } else if (type.includes('image/')) {
                const url = URL.createObjectURL(convertedData.content);
                el.innerHTML = `<img src="${url}" style="max-width:100%;border-radius:6px;" onload="URL.revokeObjectURL(this.src)">`;
            } else if (type.includes('pdf')) {
                const ab = await convertedData.content.arrayBuffer();
                const { canvas } = await renderPDFPage(ab, 1, 1.2);
                canvas.style.cssText = 'width:100%;border-radius:6px;';
                el.innerHTML = '';
                el.appendChild(canvas);
            } else {
                el.innerHTML = `<div style="text-align:center;padding:40px;">
                    <i class="fas fa-check-circle" style="font-size:3rem;color:var(--success);display:block;margin-bottom:12px;"></i>
                    <p style="color:var(--text-1);font-weight:700;">تم التحويل بنجاح</p>
                    <p style="color:var(--text-2);font-size:0.85rem;margin-top:6px;">${convertedData.filename}</p></div>`;
            }
        } else {
            el.innerHTML = '<p style="color:var(--text-2);text-align:center;padding:40px;">لا توجد نتيجة بعد</p>';
        }
    } catch (e) {
        el.innerHTML = `<p style="color:var(--error);">خطأ في عرض النتيجة: ${e.message}</p>`;
    }
    skel.style.display = 'none';
    el.style.display   = 'block';
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERTERS
// ═══════════════════════════════════════════════════════════════════════════

// ── PDF → Text (+ OCR fallback) ────────────────────────────────────────────
async function convertPDFToText(file) {
    setProgress(5, 'قراءة الملف...');
    const ab  = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    let fullText = '', isScanned = false;

    for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(Math.round(5 + (i / pdf.numPages) * 60), `استخراج نص صفحة ${i}...`);
        const page = await pdf.getPage(i);
        const tc   = await page.getTextContent();
        const raw  = tc.items.map(it => it.str).join(' ').trim();
        if (raw.length < 10) { isScanned = true; break; }
        let out = '', lastY = null;
        tc.items.forEach(it => {
            if (lastY !== null && Math.abs(it.transform[5] - lastY) > 5) out += '\n';
            out += it.str + ' ';
            lastY = it.transform[5];
        });
        fullText += `========== صفحة ${i} ==========\n\n${out.trim()}\n\n`;
    }

    if (isScanned) {
        setProgress(65, 'PDF مسحوب — تشغيل OCR...', 'قد يستغرق بعض الوقت');
        fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            setProgress(Math.round(65 + (i / pdf.numPages) * 28), `OCR صفحة ${i} من ${pdf.numPages}...`);
            const page = await pdf.getPage(i);
            const vp   = page.getViewport({ scale: 2 });
            const c    = document.createElement('canvas');
            c.width = vp.width; c.height = vp.height;
            await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
            const { data: { text } } = await Tesseract.recognize(c, 'ara+eng');
            fullText += `========== صفحة ${i} ==========\n\n${text.trim()}\n\n`;
        }
    }

    setProgress(97, 'إنشاء الملف...');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), fullText], { type: 'text/plain;charset=utf-8' });
    convertedData = { content: blob, filename: file.name.replace(/\.pdf$/i, '.txt'), type: 'text/plain' };
}

// ── PDF → Word (+ OCR fallback) ────────────────────────────────────────────
async function convertPDFToWord(file) {
    setProgress(5, 'قراءة الملف...');
    const ab  = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    let bodyContent = '', isScanned = false;

    const firstTC   = await (await pdf.getPage(1)).getTextContent();
    const firstText = firstTC.items.map(it => it.str).join(' ').trim();
    if (firstText.length < 10) isScanned = true;

    if (!isScanned) {
        for (let i = 1; i <= pdf.numPages; i++) {
            setProgress(Math.round(5 + (i / pdf.numPages) * 80), `استخراج نص صفحة ${i}...`);
            const page = await pdf.getPage(i);
            const tc   = await page.getTextContent();
            let pageText = '', lastY = null;
            tc.items.forEach(it => {
                if (lastY !== null && Math.abs(it.transform[5] - lastY) > 5) pageText += '</p><p>';
                pageText += it.str + ' ';
                lastY = it.transform[5];
            });
            bodyContent += `<h2>صفحة ${i}</h2><p>${pageText.trim()}</p>\n`;
        }
    } else {
        setProgress(20, 'PDF مسحوب — تشغيل OCR...', 'يرجى الانتظار');
        for (let i = 1; i <= pdf.numPages; i++) {
            setProgress(Math.round(20 + (i / pdf.numPages) * 65), `OCR صفحة ${i} من ${pdf.numPages}...`);
            const page = await pdf.getPage(i);
            const vp   = page.getViewport({ scale: 2 });
            const c    = document.createElement('canvas');
            c.width = vp.width; c.height = vp.height;
            await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
            const { data: { text } } = await Tesseract.recognize(c, 'ara+eng');
            bodyContent += `<h2>صفحة ${i}</h2><p>${text.replace(/\n/g, '<br>')}</p>\n`;
        }
    }

    setProgress(92, 'إنشاء ملف Word...');
    const docHtml = `<!DOCTYPE html><html><head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<style>
@page { size:A4; margin:2cm; }
body  { font-family:Arial,Tahoma,sans-serif; direction:rtl; padding:40px; font-size:12pt; line-height:1.8; color:#111; }
h2    { font-size:14pt; color:#1e88e5; border-bottom:2px solid #1e88e5; padding-bottom:6px; margin:24px 0 8px; }
p     { margin:0 0 12px; text-align:justify; }
</style></head><body>${bodyContent}</body></html>`;

    docPreviewHtml = bodyContent;
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), docHtml], { type: 'application/msword;charset=utf-8' });
    convertedData = { content: blob, filename: file.name.replace(/\.pdf$/i, '.doc'), type: 'application/msword' };
}

// ── Word / Office → PDF (Mammoth for .docx) ────────────────────────────────
async function convertOfficeToPDF(file) {
    setProgress(20, 'قراءة الملف...');
    const name = file.name.toLowerCase();
    let bodyHtml = '';

    if (name.match(/\.docx?$/) && typeof mammoth !== 'undefined') {
        setProgress(40, 'استخراج النص من ملف Word...');
        const ab     = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: ab });
        bodyHtml = result.value;
    } else if (file.type.includes('text') || name.endsWith('.rtf') || name.endsWith('.txt')) {
        const text = await file.text();
        bodyHtml = `<p>${text.replace(/\n/g, '</p><p>')}</p>`;
    } else {
        bodyHtml = `<p>تم تحويل الملف: ${file.name}</p><p>الحجم: ${(file.size/1024).toFixed(2)} KB</p>`;
    }

    setProgress(65, 'إنشاء الملف...');
    const fullHtml = `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
<meta charset="UTF-8">
<style>
body { font-family:Arial,Tahoma,sans-serif; direction:rtl; padding:40px; font-size:12pt; line-height:1.8; color:#111; }
p    { margin:0 0 10px; text-align:justify; }
</style></head><body>${bodyHtml}</body></html>`;

    docPreviewHtml = bodyHtml;
    setProgress(92, 'حفظ الملف...');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), fullHtml], { type: 'application/msword;charset=utf-8' });
    convertedData = { content: blob, filename: file.name.replace(/\.[^/.]+$/, '.doc'), type: 'application/msword' };
}

// ── OCR Tools ──────────────────────────────────────────────────────────────
async function ocrToText(file) {
    setProgress(10, 'تحميل محرك OCR...');
    const { data: { text } } = await Tesseract.recognize(file, 'ara+eng', {
        logger: m => {
            if (m.status === 'recognizing text')
                setProgress(Math.round(10 + m.progress * 80), 'جاري التعرف على النص...', `${Math.round(m.progress * 100)}%`);
        }
    });
    setProgress(95, 'إنشاء الملف...');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), text], { type: 'text/plain;charset=utf-8' });
    convertedData = { content: blob, filename: file.name.replace(/\.[^/.]+$/, '_ocr.txt'), type: 'text/plain' };
}

async function ocrToWord(file) {
    setProgress(10, 'تحميل محرك OCR...');
    const { data: { text } } = await Tesseract.recognize(file, 'ara+eng', {
        logger: m => {
            if (m.status === 'recognizing text')
                setProgress(Math.round(10 + m.progress * 75), 'جاري التعرف على النص...', `${Math.round(m.progress * 100)}%`);
        }
    });
    setProgress(90, 'إنشاء ملف Word...');
    const paragraphs = `<p>${text.replace(/\n/g, '</p><p>')}</p>`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,Tahoma,sans-serif;direction:rtl;padding:40px;font-size:14pt;line-height:1.8;}</style>
</head><body>${paragraphs}</body></html>`;
    docPreviewHtml = paragraphs;
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), html], { type: 'application/msword;charset=utf-8' });
    convertedData = { content: blob, filename: file.name.replace(/\.[^/.]+$/, '_ocr.doc'), type: 'application/msword' };
}

// ── PDF → Image ────────────────────────────────────────────────────────────
async function convertPDFToImage(file, fmt) {
    setProgress(10, 'قراءة الملف...');
    const ab = await file.arrayBuffer();
    setProgress(40, 'تحويل الصفحة الأولى...');
    const { canvas } = await renderPDFPage(ab, 1, 2);
    setProgress(85, 'ضغط الصورة...');
    const blob = await new Promise(r => canvas.toBlob(r, `image/${fmt}`, 0.95));
    convertedData = {
        content: blob,
        filename: file.name.replace(/\.pdf$/i, `.${fmt}`),
        type: `image/${fmt}`,
        _preview: URL.createObjectURL(blob)
    };
}

// ── PDF → HTML ─────────────────────────────────────────────────────────────
async function convertPDFToHTML(file) {
    setProgress(5, 'قراءة الملف...');
    const ab  = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    let html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>
body  { font-family:Arial,Tahoma,sans-serif; padding:20px; background:#f5f5f5; max-width:1000px; margin:0 auto; }
.page { background:#fff; padding:20px; margin:20px 0; box-shadow:0 2px 10px rgba(0,0,0,.1); border-radius:8px; text-align:center; }
h2    { color:#1e88e5; border-bottom:2px solid #1e88e5; padding-bottom:8px; margin-bottom:16px; }
img   { width:100%; height:auto; }
</style></head><body>\n`;
    for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(Math.round(5 + (i / pdf.numPages) * 85), `تحويل صفحة ${i}...`);
        const { canvas } = await renderPDFPage(pdf, i, 2);
        html += `<div class="page"><h2>صفحة ${i}</h2><img src="${canvas.toDataURL('image/png')}"></div>\n`;
    }
    html += '</body></html>';
    setProgress(97, 'إنشاء الملف...');
    convertedData = {
        content: new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), html], { type: 'text/html;charset=utf-8' }),
        filename: file.name.replace(/\.pdf$/i, '.html'),
        type: 'text/html'
    };
}

// ── PDF → XML ──────────────────────────────────────────────────────────────
async function convertPDFToXML(file) {
    setProgress(10, 'قراءة الملف...');
    const ab  = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<document>\n';
    for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(Math.round(10 + (i / pdf.numPages) * 80), `معالجة صفحة ${i}...`);
        const page = await pdf.getPage(i);
        const tc   = await page.getTextContent();
        const t    = tc.items.map(it => it.str).join(' ')
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        xml += `  <page number="${i}">\n    <content>${t}</content>\n  </page>\n`;
    }
    xml += '</document>';
    setProgress(97, 'إنشاء الملف...');
    convertedData = {
        content: new Blob(['\ufeff' + xml], { type: 'text/xml;charset=utf-8' }),
        filename: file.name.replace(/\.pdf$/i, '.xml'),
        type: 'text/xml'
    };
}

// ── PDF → RTF ──────────────────────────────────────────────────────────────
async function convertPDFToRTF(file) {
    setProgress(10, 'قراءة الملف...');
    const ab  = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    let rtf = '{\\rtf1\\ansi\\ansicpg1256\\deff0\n{\\fonttbl{\\f0\\fnil\\fcharset178 Arial;}}\n\\pard\\rtlpar\\f0\\fs24\n';
    for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(Math.round(10 + (i / pdf.numPages) * 80), `معالجة صفحة ${i}...`);
        const page = await pdf.getPage(i);
        const tc   = await page.getTextContent();
        const t    = tc.items.map(it => it.str).join(' ')
            .replace(/\\/g,'\\\\').replace(/{/g,'\\{').replace(/}/g,'\\}');
        rtf += `\\b Page ${i}\\b0\\par\n${t}\\par\\par\n`;
    }
    rtf += '}';
    setProgress(97, 'إنشاء الملف...');
    convertedData = {
        content: new Blob([rtf], { type: 'application/rtf' }),
        filename: file.name.replace(/\.pdf$/i, '.rtf'),
        type: 'application/rtf'
    };
}

// ── PDF → Excel (CSV) ──────────────────────────────────────────────────────
async function convertPDFToExcel(file) {
    setProgress(10, 'قراءة الملف...');
    const ab  = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    let csv = '\ufeffالصفحة,المحتوى\n';
    for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(Math.round(10 + (i / pdf.numPages) * 80), `معالجة صفحة ${i}...`);
        const page = await pdf.getPage(i);
        const tc   = await page.getTextContent();
        const t    = tc.items.map(it => it.str).join(' ').replace(/"/g, '""');
        csv += `${i},"${t}"\n`;
    }
    setProgress(97, 'إنشاء الملف...');
    convertedData = {
        content: new Blob([csv], { type: 'text/csv;charset=utf-8' }),
        filename: file.name.replace(/\.pdf$/i, '.csv'),
        type: 'text/csv'
    };
}

// ── PDF → PPT (HTML slides) ────────────────────────────────────────────────
async function convertPDFToPPT(file) {
    setProgress(5, 'قراءة الملف...');
    const ab  = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    let html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
<style>
body   { margin:0; background:#111; font-family:Arial,sans-serif; }
.slide { page-break-after:always; padding:40px; min-height:600px; background:#fff; margin:20px auto; max-width:960px; text-align:center; }
h1     { color:#1e88e5; font-size:2em; border-bottom:3px solid #1e88e5; padding-bottom:12px; }
img    { width:100%; height:auto; }
</style></head><body>\n`;
    for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(Math.round(5 + (i / pdf.numPages) * 85), `تحويل شريحة ${i}...`);
        const { canvas } = await renderPDFPage(pdf, i, 1.5);
        html += `<div class="slide"><h1>شريحة ${i}</h1><img src="${canvas.toDataURL('image/png')}"></div>\n`;
    }
    html += '</body></html>';
    setProgress(97, 'إنشاء الملف...');
    convertedData = {
        content: new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), html], { type: 'text/html;charset=utf-8' }),
        filename: file.name.replace(/\.pdf$/i, '_slides.html'),
        type: 'text/html'
    };
}

// ── Image → PDF ────────────────────────────────────────────────────────────
async function convertImageToPDF(file) {
    setProgress(10, 'تحسين جودة الصورة (AI Upscaling)...', 'تكبير ×2');
    const upscaled = await upscaleImage(file, 2);
    setProgress(55, 'إنشاء PDF...');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const img = await createImageBitmap(upscaled);
    const c   = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    const w = pdf.internal.pageSize.getWidth();
    pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, w, (img.height * w) / img.width);
    setProgress(92, 'حفظ الملف...');
    convertedData = {
        content: pdf.output('blob'),
        filename: file.name.replace(/\.[^/.]+$/, '.pdf'),
        type: 'application/pdf',
        _preview: URL.createObjectURL(upscaled)
    };
}

// ── Text → PDF ─────────────────────────────────────────────────────────────
async function convertTextToPDF(file) {
    setProgress(20, 'قراءة الملف...');
    const { jsPDF } = window.jspdf;
    const text = await file.text();
    setProgress(60, 'إنشاء PDF...');
    const pdf = new jsPDF();
    pdf.text(pdf.splitTextToSize(text, 180), 15, 15);
    setProgress(92, 'حفظ الملف...');
    convertedData = {
        content: pdf.output('blob'),
        filename: file.name.replace(/\.txt$/i, '.pdf'),
        type: 'application/pdf'
    };
}

// ── Compress PDF ───────────────────────────────────────────────────────────
async function compressPDF(file) {
    setProgress(10, 'قراءة الملف...');
    const ab  = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    const { jsPDF } = window.jspdf;
    const out   = new jsPDF();
    const pages = Math.min(pdf.numPages, 10);
    for (let i = 1; i <= pages; i++) {
        setProgress(Math.round(10 + (i / pages) * 80), `ضغط صفحة ${i}...`);
        const { canvas } = await renderPDFPage(pdf, i, 1);
        if (i > 1) out.addPage();
        out.addImage(canvas.toDataURL('image/jpeg', 0.5), 'JPEG', 0, 0, 210, 297);
    }
    setProgress(97, 'حفظ الملف...');
    convertedData = {
        content: out.output('blob'),
        filename: file.name.replace(/\.pdf$/i, '_compressed.pdf'),
        type: 'application/pdf'
    };
}

// ── Merge PDF (single file stub) ───────────────────────────────────────────
async function mergePDF(file) {
    setProgress(50, 'معالجة الملف...');
    convertedData = {
        content: file,
        filename: file.name.replace(/\.pdf$/i, '_merged.pdf'),
        type: 'application/pdf'
    };
}

// ── Split PDF (first page) ─────────────────────────────────────────────────
async function splitPDF(file) {
    setProgress(10, 'قراءة الملف...');
    const ab = await file.arrayBuffer();
    setProgress(50, 'استخراج الصفحة الأولى...');
    const { canvas } = await renderPDFPage(ab, 1, 1.5);
    const { jsPDF } = window.jspdf;
    const out = new jsPDF();
    out.addImage(canvas.toDataURL('image/jpeg'), 'JPEG', 0, 0, 210, 297);
    setProgress(92, 'حفظ الملف...');
    convertedData = {
        content: out.output('blob'),
        filename: file.name.replace(/\.pdf$/i, '_page1.pdf'),
        type: 'application/pdf'
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// DOWNLOAD / RECENT FILES / VIEWER / NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

function downloadFile() {
    if (!convertedData) return;
    const blob = convertedData.content instanceof Blob
        ? convertedData.content
        : new Blob([convertedData.content], { type: convertedData.type });
    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: convertedData.filename
    });
    a.click();
    URL.revokeObjectURL(a.href);
    showNotification('تم تحميل الملف بنجاح', 'success');
    addToRecentFiles(convertedData.filename, blob.size);
    closeModal();
}

function loadRecentFiles() {
    displayRecentFiles(JSON.parse(localStorage.getItem('recentFiles') || '[]'));
}

function addToRecentFiles(name, size) {
    let files = JSON.parse(localStorage.getItem('recentFiles') || '[]');
    files.unshift({ name, date: new Date().toLocaleString('ar-EG'), size: (size / 1024).toFixed(1) + ' KB' });
    localStorage.setItem('recentFiles', JSON.stringify(files.slice(0, 10)));
    displayRecentFiles(files.slice(0, 10));
}

function displayRecentFiles(files) {
    const tbody = document.getElementById('recentFilesBody');
    if (!files.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">لا توجد ملفات حديثة</td></tr>';
        return;
    }
    tbody.innerHTML = files.map((f, i) => `
        <tr>
            <td><input type="checkbox"></td>
            <td class="file-name"><i class="fas fa-file-pdf"></i>${f.name}</td>
            <td>${f.date}</td>
            <td>${f.size}</td>
            <td><button class="action-btn" onclick="openFileFromRecent(${i})"><i class="fas fa-eye"></i></button></td>
        </tr>`).join('');
}

function clearRecentFiles() {
    localStorage.removeItem('recentFiles');
    loadRecentFiles();
    showNotification('تم مسح السجل', 'success');
}

function openFileFromRecent(i) {
    const files = JSON.parse(localStorage.getItem('recentFiles') || '[]');
    if (files[i]) openViewer(files[i]);
}

function openViewer(info) {
    document.getElementById('viewerTitle').textContent = info.name;
    document.getElementById('fileViewer').innerHTML = `
        <div style="text-align:center;padding:40px;">
            <i class="fas fa-file-pdf" style="font-size:4rem;color:var(--cyan);"></i>
            <p style="color:var(--text-1);margin-top:12px;font-weight:700;">${info.name}</p>
            <p style="color:var(--text-2);font-size:0.85rem;">${info.size} — ${info.date}</p>
        </div>`;
    document.getElementById('viewerModal').style.display = 'flex';
}

function closeViewer() {
    document.getElementById('viewerModal').style.display = 'none';
}

function openFileExplorer() {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.pdf' });
    inp.onchange = e => {
        const f = e.target.files[0];
        if (!f) return;
        showNotification(`تم فتح: ${f.name}`, 'success');
        addToRecentFiles(f.name, f.size);
        viewPDFFile(f);
    };
    inp.click();
}

async function viewPDFFile(file) {
    const ab  = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    document.getElementById('viewerTitle').textContent = file.name;
    const viewer = document.getElementById('fileViewer');
    viewer.innerHTML = '<p style="color:var(--cyan);text-align:center;padding:20px;">جاري التحميل...</p>';
    document.getElementById('viewerModal').style.display = 'flex';
    viewer.innerHTML = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
        const { canvas } = await renderPDFPage(pdf, i, 1.5);
        canvas.style.cssText = 'width:100%;margin-bottom:16px;border:1px solid var(--cyan-border);border-radius:8px;';
        viewer.appendChild(canvas);
    }
    if (pdf.numPages > 5)
        viewer.innerHTML += `<p style="text-align:center;color:var(--text-2);">عرض أول 5 صفحات من ${pdf.numPages}</p>`;
}

function createNewPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.text('مستند PDF جديد', 20, 20);
    pdf.text('تم إنشاؤه بواسطة VeriSafe AI', 20, 40);
    pdf.save('new-document.pdf');
    showNotification('تم إنشاء ملف PDF جديد', 'success');
}

function showNotification(msg, type = 'success') {
    const icons = { success: 'circle-check', error: 'circle-xmark', warning: 'triangle-exclamation' };
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.innerHTML = `<i class="fas fa-${icons[type] || 'circle-info'}"></i><span>${msg}</span>`;
    document.body.appendChild(n);
    setTimeout(() => n.classList.add('show'), 50);
    setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 350); }, 3200);
}
