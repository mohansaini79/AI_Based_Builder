/* ============================================================
   builder.js – Resume Builder Page Logic
   ============================================================ */

// ── State ─────────────────────────────────────────────────────
let currentTemplate = 'google';
let summaryEditor   = null;
let skills          = [];
let experience      = [];
let education       = [];
let projects        = [];
let certifications  = [];
let rewriteSection  = null;
let rewriteResult   = '';

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initQuill();
  loadResumeData();
  initSkillInput();
  updatePreview();

  // Auto-save every 60s
  setInterval(() => { if (window.RESUME_ID) saveResume(true); }, 60000);

  // Preview updates on input change
  document.querySelectorAll('.form-input').forEach(el => {
    el.addEventListener('input', debounce(updatePreview, 600));
  });
});

// ── Quill ─────────────────────────────────────────────────────
function initQuill() {
  summaryEditor = new Quill('#editor-summary', {
    theme: 'snow',
    placeholder: 'Write a compelling 3–4 sentence professional summary...',
    modules: {
      toolbar: [
        ['bold','italic','underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['clean']
      ]
    }
  });
  summaryEditor.on('text-change', debounce(updatePreview, 700));
}

// ── Load Resume Data ──────────────────────────────────────────
function loadResumeData() {
  const rd = window.RESUME_DATA || {};
  if (!rd || !Object.keys(rd).length) return;

  // Basic fields
  const basicFields = ['full_name','email','phone','location','linkedin','github','website'];
  basicFields.forEach(f => {
    const el = document.getElementById(`f-${f}`);
    if (el && rd[f]) el.value = rd[f];
  });

  // ATS domain
  const domainEl = document.getElementById('f-ats_domain');
  if (domainEl && rd.ats_domain) domainEl.value = rd.ats_domain;

  // Summary
  if (summaryEditor && rd.summary) {
    summaryEditor.root.innerHTML = rd.summary;
  }

  // Template
  if (rd.template) selectTemplate(rd.template);

  // Skills
  if (Array.isArray(rd.skills)) {
    skills = [...rd.skills];
    renderSkills();
  }

  // Experience
  if (Array.isArray(rd.experience)) {
    experience = rd.experience.map(e => ({ ...e }));
    renderExperience();
  }

  // Education
  if (Array.isArray(rd.education)) {
    education = rd.education.map(e => ({ ...e }));
    renderEducation();
  }

  // Projects
  if (Array.isArray(rd.projects)) {
    projects = rd.projects.map(p => ({ ...p }));
    renderProjects();
  }

  // Certifications
  if (Array.isArray(rd.certifications)) {
    certifications = [...rd.certifications];
    renderCertifications();
  }

  // ATS score
  if (rd.ats_score !== null && rd.ats_score !== undefined) {
    updateATSRing(rd.ats_score);
    document.getElementById('ats-label').textContent = getScoreLabel(rd.ats_score);
    document.getElementById('ats-label').className = `text-sm font-semibold ${getScoreColor(rd.ats_score)}`;
  }

  updatePreview();
}

// ── Tab Switching ─────────────────────────────────────────────
function switchTab(section) {
  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.builder-tab').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById(`tab-${section}`);
  const navBtn = document.getElementById(`nav-${section}`);
  if (panel) panel.classList.add('active');
  if (navBtn) navBtn.classList.add('active');
  updatePreview();
}

// Activate first tab
switchTab('basics');

// ── Template Selection ────────────────────────────────────────
function selectTemplate(tpl) {
  currentTemplate = tpl;
  document.querySelectorAll('[id^="tpl-"]').forEach(btn => {
    btn.classList.remove('selected');
  });
  const btn = document.getElementById(`tpl-${tpl}`);
  if (btn) btn.classList.add('selected');
  updatePreview();
}

// ── Skill Management ──────────────────────────────────────────
function initSkillInput() {
  const input = document.getElementById('skill-input');
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); addSkillTag(); }
    if (e.key === ',' )    { e.preventDefault(); addSkillTag(); }
  });
}

function addSkillTag() {
  const input = document.getElementById('skill-input');
  const raw   = input.value.trim();
  if (!raw) return;
  const newSkills = raw.split(',').map(s => s.trim()).filter(s => s && !skills.includes(s));
  skills.push(...newSkills);
  input.value = '';
  renderSkills();
  updatePreview();
}

function removeSkill(idx) {
  skills.splice(idx, 1);
  renderSkills();
  updatePreview();
}

function renderSkills() {
  const container = document.getElementById('skills-container');
  container.innerHTML = '';
  skills.forEach((s, i) => {
    const chip = document.createElement('span');
    chip.className = 'skill-chip';
    chip.innerHTML = `${s} <button onclick="removeSkill(${i})" class="ml-1 opacity-60 hover:opacity-100" aria-label="Remove ${s}">×</button>`;
    container.appendChild(chip);
  });
}

// ── Experience ────────────────────────────────────────────────
function addExperience(data = {}) {
  experience.push({
    title:       data.title       || '',
    company:     data.company     || '',
    duration:    data.duration    || '',
    location:    data.location    || '',
    description: data.description || ''
  });
  renderExperience();
}

function removeExperience(idx) {
  experience.splice(idx, 1);
  renderExperience();
}

function renderExperience() {
  const container = document.getElementById('experience-list');
  container.innerHTML = '';
  experience.forEach((exp, i) => {
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.innerHTML = `
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label class="form-label">Job Title</label>
          <input class="form-input" type="text" value="${escHtml(exp.title)}"
                 oninput="experience[${i}].title=this.value;updatePreview()" placeholder="Software Engineer" />
        </div>
        <div>
          <label class="form-label">Company</label>
          <input class="form-input" type="text" value="${escHtml(exp.company)}"
                 oninput="experience[${i}].company=this.value;updatePreview()" placeholder="Google" />
        </div>
        <div>
          <label class="form-label">Duration</label>
          <input class="form-input" type="text" value="${escHtml(exp.duration)}"
                 oninput="experience[${i}].duration=this.value;updatePreview()" placeholder="Jan 2022 – Present" />
        </div>
        <div>
          <label class="form-label">Location</label>
          <input class="form-input" type="text" value="${escHtml(exp.location)}"
                 oninput="experience[${i}].location=this.value;updatePreview()" placeholder="Remote" />
        </div>
      </div>
      <div class="mb-2">
        <div class="flex items-center justify-between mb-1">
          <label class="form-label">Description</label>
          <button onclick="rewriteSectionEntry('experience',${i})" class="text-xs text-indigo-400 hover:text-indigo-300">🤖 AI Rewrite</button>
        </div>
        <textarea class="form-input" rows="3"
                  oninput="experience[${i}].description=this.value;updatePreview()"
                  placeholder="• Describe key achievements with metrics...">${escHtml(exp.description)}</textarea>
      </div>
      <button onclick="removeExperience(${i})" class="btn-danger text-xs">🗑 Remove</button>`;
    container.appendChild(card);
  });
  if (experience.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-gray-600 text-sm">No experience entries yet. Click "+ Add Entry" to begin.</div>`;
  }
}

// ── Education ─────────────────────────────────────────────────
function addEducation(data = {}) {
  education.push({
    degree:      data.degree      || '',
    institution: data.institution || '',
    year:        data.year        || '',
    gpa:         data.gpa         || ''
  });
  renderEducation();
}

function removeEducation(idx) {
  education.splice(idx, 1);
  renderEducation();
}

function renderEducation() {
  const container = document.getElementById('education-list');
  container.innerHTML = '';
  education.forEach((edu, i) => {
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.innerHTML = `
      <div class="grid grid-cols-2 gap-3 mb-2">
        <div class="col-span-2">
          <label class="form-label">Degree / Qualification</label>
          <input class="form-input" type="text" value="${escHtml(edu.degree)}"
                 oninput="education[${i}].degree=this.value;updatePreview()" placeholder="B.S. Computer Science" />
        </div>
        <div>
          <label class="form-label">Institution</label>
          <input class="form-input" type="text" value="${escHtml(edu.institution)}"
                 oninput="education[${i}].institution=this.value;updatePreview()" placeholder="Stanford University" />
        </div>
        <div>
          <label class="form-label">Year</label>
          <input class="form-input" type="text" value="${escHtml(edu.year)}"
                 oninput="education[${i}].year=this.value;updatePreview()" placeholder="2018 – 2022" />
        </div>
        <div>
          <label class="form-label">GPA (optional)</label>
          <input class="form-input" type="text" value="${escHtml(edu.gpa)}"
                 oninput="education[${i}].gpa=this.value;updatePreview()" placeholder="3.9" />
        </div>
      </div>
      <button onclick="removeEducation(${i})" class="btn-danger text-xs">🗑 Remove</button>`;
    container.appendChild(card);
  });
  if (education.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-gray-600 text-sm">No education entries. Click "+ Add Entry".</div>`;
  }
}

// ── Projects ──────────────────────────────────────────────────
function addProject(data = {}) {
  projects.push({
    title:        data.title        || '',
    technologies: data.technologies || '',
    description:  data.description  || '',
    link:         data.link         || ''
  });
  renderProjects();
}

function removeProject(idx) {
  projects.splice(idx, 1);
  renderProjects();
}

function renderProjects() {
  const container = document.getElementById('projects-list');
  container.innerHTML = '';
  projects.forEach((proj, i) => {
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.innerHTML = `
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label class="form-label">Project Title</label>
          <input class="form-input" type="text" value="${escHtml(proj.title)}"
                 oninput="projects[${i}].title=this.value;updatePreview()" placeholder="AI Chatbot" />
        </div>
        <div>
          <label class="form-label">Technologies</label>
          <input class="form-input" type="text" value="${escHtml(proj.technologies)}"
                 oninput="projects[${i}].technologies=this.value;updatePreview()" placeholder="Python, React, OpenAI" />
        </div>
        <div class="col-span-2">
          <label class="form-label">Live / Repo Link</label>
          <input class="form-input" type="url" value="${escHtml(proj.link)}"
                 oninput="projects[${i}].link=this.value" placeholder="https://github.com/..." />
        </div>
      </div>
      <div class="mb-2">
        <div class="flex items-center justify-between mb-1">
          <label class="form-label">Description</label>
          <button onclick="rewriteSectionEntry('projects',${i})" class="text-xs text-indigo-400 hover:text-indigo-300">🤖 AI Rewrite</button>
        </div>
        <textarea class="form-input" rows="3"
                  oninput="projects[${i}].description=this.value;updatePreview()"
                  placeholder="Brief description highlighting impact and technologies...">${escHtml(proj.description)}</textarea>
      </div>
      <button onclick="removeProject(${i})" class="btn-danger text-xs">🗑 Remove</button>`;
    container.appendChild(card);
  });
  if (projects.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-gray-600 text-sm">No projects yet. Click "+ Add Project".</div>`;
  }
}

// ── Certifications ────────────────────────────────────────────
function addCertification(value = '') {
  certifications.push(value);
  renderCertifications();
}

function removeCertification(idx) {
  certifications.splice(idx, 1);
  renderCertifications();
}

function renderCertifications() {
  const container = document.getElementById('certifications-list');
  container.innerHTML = '';
  certifications.forEach((cert, i) => {
    const card = document.createElement('div');
    card.className = 'entry-card flex items-center gap-3';
    card.innerHTML = `
      <input class="form-input flex-1" type="text" value="${escHtml(cert)}"
             oninput="certifications[${i}]=this.value" placeholder="AWS Certified Solutions Architect" />
      <button onclick="removeCertification(${i})" class="btn-danger text-xs px-3 py-2">🗑</button>`;
    container.appendChild(card);
  });
  if (certifications.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-gray-600 text-sm">No certifications. Click "+ Add".</div>`;
  }
}

// ── Collect Form Data ─────────────────────────────────────────
function collectFormData() {
  return {
    title:       document.getElementById('resume-title').value.trim() || 'Untitled Resume',
    template:    currentTemplate,
    full_name:   (document.getElementById('f-full_name')  || {}).value || '',
    email:       (document.getElementById('f-email')      || {}).value || '',
    phone:       (document.getElementById('f-phone')      || {}).value || '',
    location:    (document.getElementById('f-location')   || {}).value || '',
    linkedin:    (document.getElementById('f-linkedin')   || {}).value || '',
    github:      (document.getElementById('f-github')     || {}).value || '',
    website:     (document.getElementById('f-website')    || {}).value || '',
    summary:     summaryEditor ? summaryEditor.root.innerHTML : '',
    ats_domain:  (document.getElementById('f-ats_domain') || {}).value || 'Software Engineering',
    skills:      [...skills],
    experience:  experience.map(e => ({ ...e })),
    education:   education.map(e => ({ ...e })),
    projects:    projects.map(p => ({ ...p })),
    certifications: [...certifications],
  };
}

// ── Save ──────────────────────────────────────────────────────
async function saveResume(silent = false) {
  const btn = document.getElementById('save-btn');
  if (!silent) { btn.innerHTML = '<div class="spinner"></div>'; btn.disabled = true; }

  const data = collectFormData();
  try {
    let res, rid;
    if (window.RESUME_ID) {
      res = await fetch(`/api/resume/${window.RESUME_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      res = await fetch('/api/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.resume_id) {
        window.RESUME_ID = json.resume_id;
        history.replaceState(null, '', `/resume/${json.resume_id}/edit`);
      }
    }
    if (!silent && res.ok) { btn.innerHTML = '✅ Saved'; setTimeout(() => btn.innerHTML = '💾 Save', 2000); }
  } catch(e) {
    if (!silent) { btn.innerHTML = '❌ Error'; }
  } finally {
    if (!silent) btn.disabled = false;
  }
}

// ── ATS Score ─────────────────────────────────────────────────
async function runATSScore() {
  const btn = document.getElementById('ai-score-btn');
  btn.innerHTML = '<div class="spinner"></div>';
  btn.disabled  = true;

  const data    = collectFormData();
  data.resume_id = window.RESUME_ID;

  try {
    const res  = await fetch('/api/ats-score', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    });
    const json = await res.json();

    // Score ring
    updateATSRing(json.score);
    const label   = document.getElementById('ats-label');
    label.textContent = getScoreLabel(json.score);
    label.className   = `text-sm font-semibold ${getScoreColor(json.score)}`;
    document.getElementById('ats-domain-label').textContent = json.domain || '';

    // Template scores
    const tplPanel = document.getElementById('template-scores');
    tplPanel.classList.remove('hidden');
    const tscores = json.template_scores || {};
    ['google','microsoft','meta','oracle'].forEach(t => {
      const sc = tscores[t.charAt(0).toUpperCase() + t.slice(1)] || 0;
      const bar = document.getElementById(`tpl-score-${t}`);
      const num = document.getElementById(`tpl-score-${t}-num`);
      if (bar) bar.style.width = `${sc}%`;
      if (num) num.textContent  = sc;
    });

    // Missing keywords
    const mkPanel = document.getElementById('missing-kw-panel');
    const mkChips = document.getElementById('missing-kw-chips');
    if (json.missing_keywords && json.missing_keywords.length) {
      mkPanel.classList.remove('hidden');
      mkChips.innerHTML = '';
      json.missing_keywords.forEach(kw => {
        const chip = document.createElement('span');
        chip.className = 'skill-chip cursor-pointer';
        chip.textContent = `+ ${kw}`;
        chip.title = 'Click to add to skills';
        chip.onclick = () => { skills.push(kw); renderSkills(); updatePreview(); chip.classList.add('added'); chip.textContent = `✓ ${kw}`; };
        mkChips.appendChild(chip);
      });
    }

    // AI Suggestions
    await fetchAISuggestions(data);

  } catch(e) {
    console.error('ATS score error', e);
  } finally {
    btn.innerHTML = '📊 ATS Score';
    btn.disabled  = false;
  }
}

async function fetchAISuggestions(data) {
  try {
    const res  = await fetch('/api/ai/suggestions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    });
    const json = await res.json();
    const panel = document.getElementById('ai-suggestions-panel');
    const list  = document.getElementById('ai-suggestions-list');
    if (json.suggestions && json.suggestions.length) {
      panel.classList.remove('hidden');
      list.innerHTML = json.suggestions.map(s =>
        `<div class="flex items-start gap-2 text-xs text-gray-300">
          <span class="text-indigo-400 flex-shrink-0 mt-0.5">💡</span>
          <span>${escHtml(s)}</span>
        </div>`
      ).join('');
    }
    // Show suggested skills
    if (json.skills_to_add && json.skills_to_add.length) {
      const sp     = document.getElementById('skill-suggestions-panel');
      const slist  = document.getElementById('suggested-skills');
      sp.classList.remove('hidden');
      slist.innerHTML = '';
      json.skills_to_add.forEach(sk => {
        if (skills.includes(sk)) return;
        const chip = document.createElement('span');
        chip.className = 'skill-chip cursor-pointer';
        chip.textContent = `+ ${sk}`;
        chip.onclick = () => {
          skills.push(sk);
          renderSkills();
          updatePreview();
          chip.classList.add('added');
          chip.textContent = `✓ ${sk}`;
          chip.onclick = null;
        };
        slist.appendChild(chip);
      });
    }
  } catch(e) {}
}

// ── ATS Ring ──────────────────────────────────────────────────
function updateATSRing(score) {
  const ring = document.getElementById('ats-ring-fill');
  const num  = document.getElementById('ats-score-num');
  if (!ring || !num) return;
  const pct  = Math.min(Math.max(score || 0, 0), 100);
  const circumference = 2 * Math.PI * 40; // ≈ 251.2
  ring.style.strokeDashoffset = circumference * (1 - pct / 100);
  num.textContent = pct;
}

function getScoreLabel(s) {
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Good';
  if (s >= 40) return 'Fair';
  return 'Needs Work';
}
function getScoreColor(s) {
  if (s >= 80) return 'text-emerald-400';
  if (s >= 60) return 'text-yellow-400';
  if (s >= 40) return 'text-orange-400';
  return 'text-red-400';
}

// ── AI Rewrite (summary/skills) ────────────────────────────────
async function rewriteSection(sectionName) {
  rewriteSection = sectionName;
  const overlay = document.getElementById('rewrite-overlay');
  const title   = document.getElementById('rewrite-title');
  const result  = document.getElementById('rewrite-result');
  title.textContent = `🤖 AI Rewrite – ${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`;
  result.innerHTML  = '<div class="flex items-center gap-2 text-gray-400"><div class="spinner"></div> Generating...</div>';
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');

  const data = collectFormData();
  let content = '', context = '';
  if (sectionName === 'summary')  { content = data.summary; context = data.full_name + ' at ' + (data.experience[0]?.company || ''); }
  if (sectionName === 'skills')   { content = data.skills.join(', '); context = data.ats_domain; }

  try {
    const res  = await fetch('/api/ai/rewrite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ section: sectionName, content, context })
    });
    const json = await res.json();
    rewriteResult = json.rewritten || '';
    result.textContent = rewriteResult;
  } catch(e) {
    result.textContent = 'Failed to generate. Please try again.';
  }
}

async function rewriteSectionEntry(type, idx) {
  rewriteSection = type;
  const overlay = document.getElementById('rewrite-overlay');
  const title   = document.getElementById('rewrite-title');
  const result  = document.getElementById('rewrite-result');
  title.textContent = `🤖 AI Rewrite – ${type === 'experience' ? 'Experience' : 'Project'}`;
  result.innerHTML  = '<div class="flex items-center gap-2 text-gray-400"><div class="spinner"></div> Generating...</div>';
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');

  let content = '', context = '';
  if (type === 'experience') {
    const exp = experience[idx];
    content = exp.description;
    context = `${exp.title} at ${exp.company}`;
  } else if (type === 'projects') {
    const proj = projects[idx];
    content = proj.description;
    context = proj.technologies;
  }

  try {
    const res  = await fetch('/api/ai/rewrite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ section: type === 'experience' ? 'experience' : 'projects', content, context })
    });
    const json    = await res.json();
    rewriteResult = json.rewritten || '';
    // Store index for apply
    overlay.dataset.entryType  = type;
    overlay.dataset.entryIndex = idx;
    result.textContent = rewriteResult;
  } catch(e) {
    result.textContent = 'Failed to generate. Please try again.';
  }
}

function applyRewrite() {
  const overlay = document.getElementById('rewrite-overlay');
  const type    = overlay.dataset.entryType;
  const idx     = parseInt(overlay.dataset.entryIndex, 10);

  if (type === 'experience' && !isNaN(idx)) {
    experience[idx].description = rewriteResult;
    renderExperience();
  } else if (type === 'projects' && !isNaN(idx)) {
    projects[idx].description = rewriteResult;
    renderProjects();
  } else if (rewriteSection === 'summary') {
    if (summaryEditor) summaryEditor.root.innerHTML = rewriteResult;
  } else if (rewriteSection === 'skills') {
    const newSkills = rewriteResult.split(',').map(s => s.trim()).filter(Boolean);
    skills = [...new Set([...skills, ...newSkills])];
    renderSkills();
  }
  updatePreview();
  closeRewriteModal();
}

function closeRewriteModal() {
  const overlay = document.getElementById('rewrite-overlay');
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
  rewriteSection = null;
  rewriteResult  = '';
}

// ── Live Preview ──────────────────────────────────────────────
function updatePreview() {
  const d = collectFormData();
  const inner = document.getElementById('resume-preview-inner');
  if (!inner) return;
  inner.className = `resume-${d.template}`;
  inner.innerHTML = generatePreviewHTML(d);
}

function generatePreviewHTML(d) {
  const t = d.template || 'google';
  const safeName    = escHtml(d.full_name || 'Your Name');
  const safeEmail   = escHtml(d.email   || '');
  const safePhone   = escHtml(d.phone   || '');
  const safeLoc     = escHtml(d.location || '');
  const safeSummary = d.summary ? d.summary.replace(/<[^>]*>/g,'').substring(0,300) : '';

  if (t === 'google') {
    return `
      <div style="background:#1a73e8;color:white;padding:16px 20px;margin:-24px -24px 16px;">
        <div style="font-size:18px;font-weight:800;">${safeName}</div>
        <div style="font-size:9px;opacity:0.85;margin-top:4px;">${safeEmail}${safePhone?' · '+safePhone:''}${safeLoc?' · '+safeLoc:''}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 120px;gap:8px;">
        <div>
          ${safeSummary ? `<div style="font-size:9px;font-weight:700;color:#1a73e8;border-bottom:1px solid #1a73e8;margin-bottom:6px;padding-bottom:2px;">SUMMARY</div><p style="font-size:9px;color:#374151;line-height:1.5;">${safeSummary}</p>` : ''}
          ${d.experience.length ? `<div style="font-size:9px;font-weight:700;color:#1a73e8;border-bottom:1px solid #1a73e8;margin:8px 0 6px;padding-bottom:2px;">EXPERIENCE</div>
          ${d.experience.slice(0,2).map(e=>`<div style="margin-bottom:6px;"><strong style="font-size:9px;">${escHtml(e.title||'')}</strong> <span style="color:#6b7280;font-size:8px;">${escHtml(e.company||'')} · ${escHtml(e.duration||'')}</span></div>`).join('')}` : ''}
        </div>
        <div>
          ${d.skills.length ? `<div style="font-size:9px;font-weight:700;color:#1a73e8;border-bottom:1px solid #1a73e8;margin-bottom:6px;padding-bottom:2px;">SKILLS</div><div>${d.skills.slice(0,8).map(s=>`<span style="display:inline-block;background:#eff6ff;color:#1d4ed8;border-radius:2px;padding:1px 4px;font-size:7px;margin:1px 1px 1px 0;">${escHtml(s)}</span>`).join('')}</div>` : ''}
        </div>
      </div>`;
  }

  if (t === 'microsoft') {
    return `
      <div style="display:grid;grid-template-columns:90px 1fr;min-height:200px;">
        <div style="background:#00365a;color:white;padding:12px 10px;">
          <div style="font-size:11px;font-weight:800;line-height:1.2;word-break:break-word;">${safeName}</div>
          <div style="margin-top:12px;font-size:7px;opacity:0.6;font-weight:700;letter-spacing:1px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:3px;margin-bottom:6px;">CONTACT</div>
          <div style="font-size:7.5px;opacity:0.85;">${safeEmail}</div>
          <div style="font-size:7.5px;opacity:0.75;">${safePhone}</div>
          ${d.skills.length ? `<div style="margin-top:10px;font-size:7px;opacity:0.6;font-weight:700;letter-spacing:1px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:3px;margin-bottom:6px;">SKILLS</div><div>${d.skills.slice(0,6).map(s=>`<span style="display:inline-block;background:rgba(255,255,255,0.1);color:white;border-radius:2px;padding:1px 4px;font-size:7px;margin:1px 1px 0 0;">${escHtml(s)}</span>`).join('')}</div>` : ''}
        </div>
        <div style="padding:12px 14px;">
          ${safeSummary ? `<div style="font-size:9px;font-weight:700;color:#00365a;border-left:2px solid #0078d4;padding-left:5px;margin-bottom:6px;">About Me</div><p style="font-size:8.5px;color:#374151;line-height:1.5;margin-bottom:10px;">${safeSummary}</p>` : ''}
          ${d.experience.length ? `<div style="font-size:9px;font-weight:700;color:#00365a;border-left:2px solid #0078d4;padding-left:5px;margin-bottom:6px;">Experience</div>
          ${d.experience.slice(0,2).map(e=>`<div style="margin-bottom:6px;"><strong style="font-size:9px;">${escHtml(e.title||'')}</strong><div style="font-size:8px;color:#0078d4;">${escHtml(e.company||'')}</div><div style="font-size:7.5px;color:#6b7280;">${escHtml(e.duration||'')}</div></div>`).join('')}` : ''}
        </div>
      </div>`;
  }

  if (t === 'meta') {
    return `
      <div style="background:linear-gradient(135deg,#0866ff,#1976d2);color:white;padding:14px 18px;margin:-24px -24px 14px;">
        <div style="font-size:18px;font-weight:900;letter-spacing:-0.5px;">${safeName}</div>
        <div style="font-size:8.5px;opacity:0.85;margin-top:4px;">${safeEmail}${safePhone?' · '+safePhone:''}${safeLoc?' · '+safeLoc:''}</div>
      </div>
      ${safeSummary ? `<p style="font-size:9px;color:#374151;line-height:1.5;margin-bottom:10px;">${safeSummary}</p>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          ${d.experience.length ? `<div style="font-size:8.5px;font-weight:800;color:#0866ff;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Experience</div>${d.experience.slice(0,2).map(e=>`<div style="margin-bottom:6px;border-left:2px solid #e8f0fe;padding-left:6px;"><strong style="font-size:9px;">${escHtml(e.title||'')}</strong><div style="font-size:8px;color:#0866ff;">${escHtml(e.company||'')}</div></div>`).join('')}` : ''}
        </div>
        <div>
          ${d.skills.length ? `<div style="font-size:8.5px;font-weight:800;color:#0866ff;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Skills</div><div>${d.skills.slice(0,8).map(s=>`<span style="display:inline-block;background:#e8f0fe;color:#0866ff;border-radius:99px;padding:1px 6px;font-size:7.5px;font-weight:600;margin:1px 2px 1px 0;">${escHtml(s)}</span>`).join('')}</div>` : ''}
        </div>
      </div>`;
  }

  if (t === 'oracle') {
    return `
      <div style="border-bottom:3px solid #c74634;padding-bottom:10px;margin:-24px -24px 14px;padding:16px 20px 10px;">
        <div style="font-size:18px;font-weight:900;color:#c74634;letter-spacing:-0.5px;">${safeName}</div>
        <div style="font-size:8.5px;color:#6b7280;margin-top:4px;">${safeEmail}${safePhone?' · '+safePhone:''}${safeLoc?' · '+safeLoc:''}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 110px;gap:10px;">
        <div>
          ${safeSummary ? `<div style="font-size:8.5px;font-weight:800;color:#c74634;border-bottom:1px solid #fee2e2;padding-bottom:3px;margin-bottom:6px;text-transform:uppercase;">Summary</div><p style="font-size:9px;color:#374151;line-height:1.5;margin-bottom:10px;">${safeSummary}</p>` : ''}
          ${d.experience.length ? `<div style="font-size:8.5px;font-weight:800;color:#c74634;border-bottom:1px solid #fee2e2;padding-bottom:3px;margin-bottom:6px;text-transform:uppercase;">Experience</div>${d.experience.slice(0,2).map(e=>`<div style="margin-bottom:6px;"><strong style="font-size:9px;">${escHtml(e.title||'')}</strong><div style="font-size:8px;color:#c74634;">${escHtml(e.company||'')}</div></div>`).join('')}` : ''}
        </div>
        <div>
          ${d.skills.length ? `<div style="font-size:8.5px;font-weight:800;color:#c74634;text-transform:uppercase;margin-bottom:6px;">Skills</div><div>${d.skills.slice(0,6).map(s=>`<span style="display:inline-block;background:#fee2e2;color:#c74634;border-radius:2px;padding:1px 4px;font-size:7px;margin:1px 1px 0 0;">${escHtml(s)}</span>`).join('')}</div>` : ''}
        </div>
      </div>`;
  }
  return '';
}

// ── PDF Export ────────────────────────────────────────────────
async function exportPDF() {
  // Save first
  await saveResume(true);
  if (window.RESUME_ID) {
    window.open(`/resume/${window.RESUME_ID}/preview`, '_blank');
  }
}

// ── Utilities ─────────────────────────────────────────────────
function escHtml(str) {
  return String(str||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function debounce(fn, ms) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
