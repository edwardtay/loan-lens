// LoanLens - AI-Powered Loan Document Intelligence
// LMA Edge Hackathon 2026

let currentAnalysis = null;
let analyzedLoans = [];

// DOM Elements
const views = document.querySelectorAll('.view');
const navLinks = document.querySelectorAll('.nav-links a');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const pasteText = document.getElementById('pasteText');
const analyzeTextBtn = document.getElementById('analyzeTextBtn');
const loadDemoBtn = document.getElementById('loadDemoBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// Navigation
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const viewId = link.dataset.view;
    switchView(viewId);
  });
});

function switchView(viewId) {
  views.forEach(v => v.classList.remove('active'));
  navLinks.forEach(l => l.classList.remove('active'));
  
  document.getElementById(`${viewId}-view`).classList.add('active');
  document.querySelector(`[data-view="${viewId}"]`).classList.add('active');
  
  if (viewId === 'compare') {
    loadLoanSelector();
  }
}

// File Upload
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    uploadFile(file);
  } else {
    alert('Please upload a PDF file');
  }
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    uploadFile(file);
  }
});

async function uploadFile(file) {
  showLoading();
  
  const formData = new FormData();
  formData.append('document', file);
  
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Analysis failed');
    
    const analysis = await response.json();
    currentAnalysis = analysis;
    analyzedLoans.push(analysis);
    
    hideLoading();
    displayAnalysis(analysis);
    switchView('dashboard');
  } catch (error) {
    hideLoading();
    alert('Error analyzing document: ' + error.message);
  }
}

// Text Analysis
analyzeTextBtn.addEventListener('click', async () => {
  const text = pasteText.value.trim();
  if (!text) {
    alert('Please paste some text to analyze');
    return;
  }
  
  showLoading();
  
  try {
    const response = await fetch('/api/analyze-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, name: 'Pasted Document' })
    });
    
    if (!response.ok) throw new Error('Analysis failed');
    
    const analysis = await response.json();
    currentAnalysis = analysis;
    analyzedLoans.push(analysis);
    
    hideLoading();
    displayAnalysis(analysis);
    switchView('dashboard');
  } catch (error) {
    hideLoading();
    alert('Error analyzing text: ' + error.message);
  }
});

// Demo
loadDemoBtn.addEventListener('click', async () => {
  showLoading();
  
  try {
    const response = await fetch('/api/demo');
    if (!response.ok) throw new Error('Failed to load demo');
    
    const analysis = await response.json();
    currentAnalysis = analysis;
    analyzedLoans.push(analysis);
    
    hideLoading();
    displayAnalysis(analysis);
    switchView('dashboard');
  } catch (error) {
    hideLoading();
    alert('Error loading demo: ' + error.message);
  }
});

// Loading
function showLoading() {
  loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

// Display Analysis
function displayAnalysis(analysis) {
  // Document name
  document.getElementById('docName').textContent = analysis.fileName || 'Document Analysis';
  
  // Summary cards
  document.getElementById('summaryAmount').textContent = 
    analysis.financialTerms.principalAmount || 'Not found';
  document.getElementById('summaryRate').textContent = 
    analysis.financialTerms.margin || analysis.financialTerms.interestRate || 'Not found';
  document.getElementById('summaryCovenant').textContent = 
    analysis.summary.totalCovenants || '0';
  document.getElementById('summaryRisks').textContent = 
    analysis.summary.totalRisks || '0';
  
  // Parties
  displayParties(analysis.parties);
  
  // Financial Terms
  displayFinancialTerms(analysis.financialTerms);
  
  // Key Dates
  displayKeyDates(analysis.keyDates);
  
  // ESG
  displayESG(analysis.esgClauses);
  
  // Covenants
  displayCovenants(analysis.covenants);
  
  // Risks
  displayRisks(analysis.riskFlags);
}

function displayParties(parties) {
  const container = document.getElementById('partiesContent');
  let html = '';
  
  if (parties.borrowers.length) {
    html += `
      <div class="party-group">
        <div class="party-label">Borrowers</div>
        <div class="party-tags">
          ${parties.borrowers.map(b => `<span class="tag">${escapeHtml(b)}</span>`).join('')}
        </div>
      </div>
    `;
  }
  
  if (parties.lenders.length) {
    html += `
      <div class="party-group">
        <div class="party-label">Lenders</div>
        <div class="party-tags">
          ${parties.lenders.map(l => `<span class="tag">${escapeHtml(l)}</span>`).join('')}
        </div>
      </div>
    `;
  }
  
  if (parties.agents.length) {
    html += `
      <div class="party-group">
        <div class="party-label">Agents</div>
        <div class="party-tags">
          ${parties.agents.map(a => `<span class="tag">${escapeHtml(a)}</span>`).join('')}
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html || '<div class="empty-state"><i class="fas fa-users"></i><p>No parties detected</p></div>';
}

function displayFinancialTerms(terms) {
  const container = document.getElementById('financialContent');
  const rows = [
    { label: 'Principal Amount', value: terms.principalAmount },
    { label: 'Currency', value: terms.currency },
    { label: 'Reference Rate', value: terms.referenceRate },
    { label: 'Margin', value: terms.margin },
    { label: 'Facility Type', value: terms.facilityType }
  ].filter(r => r.value);
  
  if (rows.length) {
    container.innerHTML = rows.map(r => `
      <div class="data-row">
        <span class="data-label">${r.label}</span>
        <span class="data-value">${escapeHtml(r.value)}</span>
      </div>
    `).join('');
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-coins"></i><p>No financial terms detected</p></div>';
  }
}

function displayKeyDates(dates) {
  const container = document.getElementById('datesContent');
  
  if (dates.length) {
    container.innerHTML = dates.map(d => `
      <div class="data-row">
        <span class="data-label">${escapeHtml(d.type)}</span>
        <span class="data-value">${escapeHtml(d.date)}</span>
      </div>
    `).join('');
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar"></i><p>No key dates detected</p></div>';
  }
}

function displayESG(esg) {
  const container = document.getElementById('esgContent');
  
  let html = '<div class="esg-badges">';
  html += `<span class="esg-badge ${esg.hasESGProvisions ? 'active' : 'inactive'}">
    <i class="fas fa-${esg.hasESGProvisions ? 'check' : 'times'}"></i> ESG Provisions
  </span>`;
  html += `<span class="esg-badge ${esg.sustainabilityLinked ? 'active' : 'inactive'}">
    <i class="fas fa-${esg.sustainabilityLinked ? 'check' : 'times'}"></i> Sustainability-Linked
  </span>`;
  html += `<span class="esg-badge ${esg.greenLoan ? 'active' : 'inactive'}">
    <i class="fas fa-${esg.greenLoan ? 'check' : 'times'}"></i> Green Loan
  </span>`;
  html += `<span class="esg-badge ${esg.marginRatchet ? 'active' : 'inactive'}">
    <i class="fas fa-${esg.marginRatchet ? 'check' : 'times'}"></i> Margin Ratchet
  </span>`;
  html += '</div>';
  
  if (esg.kpis.length) {
    html += '<div class="kpi-list">';
    html += '<div class="party-label">KPIs & Targets</div>';
    esg.kpis.forEach(kpi => {
      html += `<div class="kpi-item"><i class="fas fa-bullseye"></i> ${escapeHtml(kpi)}</div>`;
    });
    html += '</div>';
  }
  
  container.innerHTML = html;
}

function displayCovenants(covenants) {
  const container = document.getElementById('covenantsContent');
  
  // Set up tabs
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      showCovenantTab(tab.dataset.tab, covenants);
    });
  });
  
  // Show financial by default
  showCovenantTab('financial', covenants);
}

function showCovenantTab(type, covenants) {
  const container = document.getElementById('covenantsContent');
  const items = covenants[type] || [];
  
  if (items.length) {
    container.innerHTML = `
      <ul class="covenant-list">
        ${items.map(c => `<li class="covenant-item">${escapeHtml(c)}</li>`).join('')}
      </ul>
    `;
  } else {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-gavel"></i><p>No ${type} covenants detected</p></div>`;
  }
}

function displayRisks(risks) {
  const container = document.getElementById('risksContent');
  
  if (risks.length) {
    container.innerHTML = `
      <div class="risk-grid">
        ${risks.map(r => `
          <div class="risk-item ${r.severity}">
            <div class="risk-icon">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="risk-content">
              <h4>${escapeHtml(r.type)}</h4>
              <p>${escapeHtml(r.description)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-shield-alt"></i><p>No risk flags detected</p></div>';
  }
}

// Compare View
function loadLoanSelector() {
  const container = document.getElementById('loanCheckboxes');
  const compareBtn = document.getElementById('compareBtn');
  
  if (analyzedLoans.length < 2) {
    container.innerHTML = '<p>Analyze at least 2 documents to compare them.</p>';
    compareBtn.disabled = true;
    return;
  }
  
  container.innerHTML = analyzedLoans.map(loan => `
    <label class="loan-checkbox">
      <input type="checkbox" value="${loan.id}">
      ${escapeHtml(loan.fileName)}
    </label>
  `).join('');
  
  const checkboxes = container.querySelectorAll('input');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = container.querySelectorAll('input:checked');
      compareBtn.disabled = checked.length < 2;
    });
  });
  
  compareBtn.onclick = () => {
    const selected = Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value);
    compareLoans(selected);
  };
}

async function compareLoans(ids) {
  try {
    const response = await fetch(`/api/compare?ids=${ids.join(',')}`);
    if (!response.ok) throw new Error('Comparison failed');
    
    const comparison = await response.json();
    displayComparison(comparison);
  } catch (error) {
    alert('Error comparing loans: ' + error.message);
  }
}

function displayComparison(comparison) {
  const container = document.getElementById('comparisonResults');
  container.classList.remove('hidden');
  
  const headers = comparison.loans.map(l => `<th>${escapeHtml(l.name)}</th>`).join('');
  
  let html = `
    <div class="card">
      <div class="card-header"><h3><i class="fas fa-coins"></i> Financial Terms</h3></div>
      <div class="card-body">
        <table class="comparison-table">
          <thead>
            <tr><th>Term</th>${headers}</tr>
          </thead>
          <tbody>
            <tr>
              <td>Amount</td>
              ${comparison.financialTerms.map(t => `<td>${t.principalAmount || '-'}</td>`).join('')}
            </tr>
            <tr>
              <td>Currency</td>
              ${comparison.financialTerms.map(t => `<td>${t.currency || '-'}</td>`).join('')}
            </tr>
            <tr>
              <td>Reference Rate</td>
              ${comparison.financialTerms.map(t => `<td>${t.referenceRate || '-'}</td>`).join('')}
            </tr>
            <tr>
              <td>Margin</td>
              ${comparison.financialTerms.map(t => `<td>${t.margin || '-'}</td>`).join('')}
            </tr>
            <tr>
              <td>Facility Type</td>
              ${comparison.financialTerms.map(t => `<td>${t.facilityType || '-'}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="card">
      <div class="card-header"><h3><i class="fas fa-gavel"></i> Covenant Counts</h3></div>
      <div class="card-body">
        <table class="comparison-table">
          <thead>
            <tr><th>Type</th>${headers}</tr>
          </thead>
          <tbody>
            <tr>
              <td>Financial</td>
              ${comparison.covenantCounts.map(c => `<td>${c.financial}</td>`).join('')}
            </tr>
            <tr>
              <td>Informational</td>
              ${comparison.covenantCounts.map(c => `<td>${c.informational}</td>`).join('')}
            </tr>
            <tr>
              <td>Negative</td>
              ${comparison.covenantCounts.map(c => `<td>${c.negative}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="card">
      <div class="card-header"><h3><i class="fas fa-leaf"></i> ESG Comparison</h3></div>
      <div class="card-body">
        <table class="comparison-table">
          <thead>
            <tr><th>Feature</th>${headers}</tr>
          </thead>
          <tbody>
            <tr>
              <td>ESG Provisions</td>
              ${comparison.esgComparison.map(e => `<td>${e.hasESGProvisions ? '✓' : '✗'}</td>`).join('')}
            </tr>
            <tr>
              <td>Sustainability-Linked</td>
              ${comparison.esgComparison.map(e => `<td>${e.sustainabilityLinked ? '✓' : '✗'}</td>`).join('')}
            </tr>
            <tr>
              <td>Green Loan</td>
              ${comparison.esgComparison.map(e => `<td>${e.greenLoan ? '✓' : '✗'}</td>`).join('')}
            </tr>
            <tr>
              <td>Margin Ratchet</td>
              ${comparison.esgComparison.map(e => `<td>${e.marginRatchet ? '✓' : '✗'}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// Export
function exportAnalysis() {
  if (!currentAnalysis) return;
  
  const data = JSON.stringify(currentAnalysis, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `loanlens-analysis-${currentAnalysis.id}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

// Utility
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make exportAnalysis available globally
window.exportAnalysis = exportAnalysis;
