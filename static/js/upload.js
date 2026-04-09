/* ============================================================
   upload.js – Resume Upload & Parse Page Logic
   ============================================================ */

let selectedFile   = null;
let parsedData     = null;
let uploadTemplate = 'google';

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initDropZone();

  const fileInput = document.getElementById('file-input');
  fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) handleFileSelect(this.files[0]);
  });
});

// ── Drop Zone ─────────────────────────────────────────────────
function initDropZone() {
  const dz = document.getElementById('drop-zone');

  dz.addEventListener('dragover', function(e) {
    e.preventDefault();
    dz.classList.add('drag-over');
  });
  dz.addEventListener('dragleave', function() {
    dz.classList.remove('drag-over');
  });
  dz.addEventListener('drop', function(e) {
    e.preventDefault();
    dz.classList.remove('drag-over');
    const dt    = e.dataTransfer;
    const files = dt.files;
    if (files && files[0]) handleFileSelect(files[0]);
  });
}

function handleFileSelect(file) {
  const validTypes = ['application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const validExts  = ['.pdf', '.docx'];
  const ext        = '.' + file.name.split('.').pop().toLowerCase();

  if (!validExts.includes(ext)) {
    showUploadError('Only PDF and DOCX files are supported.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showUploadError('File size must be under 10 MB.');
    return;
  }

  selectedFile = file;
  hideAllPanels();

  // Show selected state in dropzone
  document.getElementById('dz-idle').classList.add('hidden');
  const dzSel = document.getElementById('dz-selected');
  dzSel.classList.remove('hidden');

  // Update FA icon based on file type
  const icon = document.getElementById('dz-file-icon');
  if (icon) {
    icon.className = ext === '.pdf'
      ? 'fa-solid fa-file-pdf text-2xl text-emerald-400'
      : 'fa-solid fa-file-word text-2xl text-blue-400';
  }

  document.getElementById('dz-file-name').textContent = file.name;
  document.getElementById('dz-file-size').textContent = formatBytes(file.size);

  // Enable parse button
  const btn = document.getElementById('parse-btn');
  btn.disabled = false;
  btn.classList.remove('opacity-50', 'cursor-not-allowed');
}

function clearFile(e) {
  e.stopPropagation();
  selectedFile = null;
  document.getElementById('file-input').value = '';
  document.getElementById('dz-idle').classList.remove('hidden');
  document.getElementById('dz-selected').classList.add('hidden');
  const btn = document.getElementById('parse-btn');
  btn.disabled = true;
  btn.classList.add('opacity-50', 'cursor-not-allowed');
  hideAllPanels();
}

// ── Upload & Parse ────────────────────────────────────────────
async function uploadAndParse() {
  if (!selectedFile) return;

  hideAllPanels();
  showProgress();

  const formData = new FormData();
  formData.append('file', selectedFile);

  // Animate progress bar
  let progress = 0;
  const fill   = document.getElementById('progress-fill');
  const msg    = document.getElementById('progress-msg');
  const steps  = [
    { pct: 15, text: 'Uploading file...' },
    { pct: 35, text: 'Extracting text...' },
    { pct: 65, text: 'Parsing with AI...' },
    { pct: 85, text: 'Structuring data...' },
  ];
  let stepIdx = 0;
  const timer = setInterval(() => {
    if (stepIdx < steps.length) {
      fill.style.width = steps[stepIdx].pct + '%';
      msg.textContent  = steps[stepIdx].text;
      stepIdx++;
    }
  }, 1800);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    clearInterval(timer);
    fill.style.width = '100%';
    msg.textContent  = 'Done!';

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      showUploadError(err.error || 'Upload failed. Please try again.');
      return;
    }
    const json = await res.json();
    if (!json.success || !json.data) {
      showUploadError('Could not parse resume data.');
      return;
    }
    parsedData = json.data;
    setTimeout(() => {
      hideAllPanels();
      showParsedPreview(parsedData);
    }, 600);

  } catch(e) {
    clearInterval(timer);
    showUploadError('Network error. Please check your connection and try again.');
  }
}

// ── Show parsed preview ───────────────────────────────────────
function showParsedPreview(data) {
  document.getElementById('parsed-preview').classList.remove('hidden');

  document.getElementById('pr-name').textContent     = data.full_name  || '–';
  document.getElementById('pr-email').textContent    = data.email      || '–';
  document.getElementById('pr-phone').textContent    = data.phone      || '–';
  document.getElementById('pr-location').textContent = data.location   || '–';
  document.getElementById('pr-summary').textContent  = (data.summary  || '').substring(0, 200);
  document.getElementById('pr-exp-count').textContent = `${(data.experience||[]).length} entr${(data.experience||[]).length === 1 ? 'y' : 'ies'} found`;
  document.getElementById('pr-edu-count').textContent = `${(data.education||[]).length} entr${(data.education||[]).length === 1 ? 'y' : 'ies'} found`;

  // Skills chips
  const sp = document.getElementById('pr-skills');
  sp.innerHTML = '';
  (data.skills || []).slice(0, 15).forEach(s => {
    const chip = document.createElement('span');
    chip.className = 'px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/25 rounded-full text-xs text-indigo-300';
    chip.textContent = s;
    sp.appendChild(chip);
  });
  if ((data.skills || []).length === 0) {
    sp.innerHTML = '<span class="text-gray-500 text-xs">No skills detected</span>';
  }
}

// ── Template selection ────────────────────────────────────────
function selectUploadTemplate(tpl) {
  uploadTemplate = tpl;
  document.querySelectorAll('[id^="tpl-pick-"]').forEach(b => b.classList.remove('selected'));
  const btn = document.getElementById(`tpl-pick-${tpl}`);
  if (btn) btn.classList.add('selected');
}

// ── Import to Builder ─────────────────────────────────────────
async function importToBuilder() {
  if (!parsedData) return;
  const btn = document.getElementById('import-btn');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating resume…';
  btn.disabled  = true;

  const payload = {
    title:           (parsedData.full_name || 'Imported') + ' – Resume',
    template:         uploadTemplate,
    full_name:        parsedData.full_name         || '',
    email:            parsedData.email             || '',
    phone:            parsedData.phone             || '',
    location:         parsedData.location          || '',
    linkedin:         parsedData.linkedin          || '',
    github:           parsedData.github            || '',
    website:          parsedData.website           || '',
    summary:          parsedData.summary           || '',
    skills:           parsedData.skills            || [],
    experience:       parsedData.experience        || [],
    education:        parsedData.education         || [],
    projects:         parsedData.projects          || [],
    certifications:   parsedData.certifications    || [],
  };

  try {
    const res  = await fetch('/api/resume', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.resume_id) {
      window.location.href = `/resume/${json.resume_id}/edit`;
    } else {
      btn.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Failed';
      btn.disabled  = false;
    }
  } catch(e) {
    btn.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Error';
    btn.disabled  = false;
  }
}

// ── Reset ─────────────────────────────────────────────────────
function resetUpload() {
  parsedData   = null;
  selectedFile = null;
  document.getElementById('file-input').value = '';
  document.getElementById('dz-idle').classList.remove('hidden');
  document.getElementById('dz-selected').classList.add('hidden');
  const btn = document.getElementById('parse-btn');
  btn.disabled = true;
  btn.classList.add('opacity-50', 'cursor-not-allowed');
  hideAllPanels();
}

// ── Helpers ───────────────────────────────────────────────────
function showProgress() {
  document.getElementById('upload-progress').classList.remove('hidden');
  document.getElementById('progress-fill').style.width = '0%';
}

function hideAllPanels() {
  document.getElementById('upload-progress').classList.add('hidden');
  document.getElementById('parsed-preview').classList.add('hidden');
  document.getElementById('upload-error').classList.add('hidden');
}

function showUploadError(msg) {
  hideAllPanels();
  document.getElementById('upload-error').classList.remove('hidden');
  document.getElementById('upload-error-msg').textContent = msg;
}

function formatBytes(bytes) {
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1024*1024)  return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(1) + ' MB';
}
