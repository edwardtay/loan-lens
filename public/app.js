// LoanLens - Client Application
let currentAnalysis = null;
let analyzedLoans = [];

// DOM Elements
const tabs = document.querySelectorAll('.tab');
const views = document.querySelectorAll('.view');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const textInput = document.getElementById('textInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const loading = document.getElementById('loading');
const results = document.getElementById('results');

// Navigation
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const viewId = tab.dataset.view;
    tabs.forEach(t => t.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${viewId}-view`).classList.add('active');
    
    if (viewId === 'compare') loadCompareView();
  });
});

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
  if (file?.type === 'application/pdf') uploadFile(file);
  else showToast('Please upload a PDF file');
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) uploadFile(file);
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
    displayResults(analysis);
    showToast('Analysis complete');
  } catch (error) {
    hideLoading();
    showToast('Error: ' + error.message);
  }
}

// Text Analysis
analyzeBtn.addEventListener('click', async () => {
  const text = textInput.value.trim();
  if (!text) {
    showToast('Please enter text to analyze');
    return;
  }
  
  showLoading();
  
  try {
    const response = await fetch('/api/analyze-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) throw new Error('Analysis failed');
    
    const analysis = await response.json();
    currentAnalysis = analysis;
    analyzedLoans.push(analysis);
    
    hideLoading();
    displayResults(analysis);
    showToast('Analysis complete');
  } catch (error) {
    hideLoading();
    showToast('Error: ' + error.message);
  }
});

// Display Results
function displayResults(analysis) {
  results.classList.remove('hidden');
  
  // Title
  document.getElementById('docTitle').textContent = analysis.fileName || 'Analysis Results';
  
  // Metrics
  document.getElementById('metricAmount').textContent = 
    analysis.financialTerms.principalAmount || '-';
  document.getElementById('metricRate').textContent = 
    analysis.financialTerms.interestRate || analysis.financialTerms.margin || '-';
  document.getElementById('metricCovenants').textContent = 
    (analysis.covenants.financial.length + analysis.covenants.informational.length + analysis.covenants.negative.length) || '0';
  document.getElementById('metricRisks').textContent = 
    analysis.riskFlags.length || '0';
  
  // Financial Terms
  const financialTerms = document.getElementById('financialTerms');
  const terms = [
    { label: 'Amount', value: analysis.financialTerms.principalAmount },
    { label: 'Currency', value: analysis.financialTerms.currency },
    { label: 'Reference Rate', value: analysis.financialTerms.referenceRate },
    { label: 'Interest Rate', value: analysis.financialTerms.interestRate },
    { label: 'Facility Type', value: analysis.financialTerms.facilityType }
  ].filter(t => t.value);
  
  financialTerms.innerHTML = terms.length ? 
    terms.map(t => `
      <div class="data-row">
        <span class="data-label">${t.label}</span>
        <span class="data-value">${escapeHtml(t.value)}</span>
      </div>
    `).join('') : '<p>No financial terms detected</p>';
  
  // Parties
  const parties = document.getElementById('parties');
  let partiesHTML = '';
  
  if (analysis.parties.borrowers.length) {
    partiesHTML += '<p><strong>Borrowers:</strong></p>';
    partiesHTML += analysis.parties.borrowers.map(b => `<span class="tag">${escapeHtml(b)}</span>`).join('');
  }
  
  if (analysis.parties.lenders.length) {
    partiesHTML += '<p><strong>Lenders:</strong></p>';
    partiesHTML += analysis.parties.lenders.map(l => `<span class="tag">${escapeHtml(l)}</span>`).join('');
  }
  
  parties.innerHTML = partiesHTML || '<p>No parties detected</p>';
  
  // Covenants
  const covenants = document.getElementById('covenants');
  let covenantsHTML = '';
  
  if (analysis.covenants.financial.length) {
    covenantsHTML += '<p><strong>Financial:</strong></p>';
    covenantsHTML += analysis.covenants.financial.map(c => 
      `<div class="risk-item low">${escapeHtml(c)}</div>`
    ).join('');
  }
  
  if (analysis.covenants.informational.length) {
    covenantsHTML += '<p><strong>Informational:</strong></p>';
    covenantsHTML += analysis.covenants.informational.map(c => 
      `<div class="risk-item low">${escapeHtml(c)}</div>`
    ).join('');
  }
  
  if (analysis.covenants.negative.length) {
    covenantsHTML += '<p><strong>Negative:</strong></p>';
    covenantsHTML += analysis.covenants.negative.map(c => 
      `<div class="risk-item low">${escapeHtml(c)}</div>`
    ).join('');
  }
  
  covenants.innerHTML = covenantsHTML || '<p>No covenants detected</p>';
  
  // Risks
  const risks = document.getElementById('risks');
  risks.innerHTML = analysis.riskFlags.length ?
    analysis.riskFlags.map(r => `
      <div class="risk-item ${r.severity}">
        <h4>${escapeHtml(r.type)}</h4>
        <p>${escapeHtml(r.description)}</p>
      </div>
    `).join('') : '<p>No risk flags detected</p>';
  
  // ESG
  const esg = document.getElementById('esg');
  let esgHTML = '<div>';
  esgHTML += `<p>ESG Provisions: ${analysis.esgClauses.hasESGProvisions ? '✓' : '✗'}</p>`;
  esgHTML += `<p>Sustainability-Linked: ${analysis.esgClauses.sustainabilityLinked ? '✓' : '✗'}</p>`;
  esgHTML += `<p>Green Loan: ${analysis.esgClauses.greenLoan ? '✓' : '✗'}</p>`;
  esgHTML += `<p>Margin Ratchet: ${analysis.esgClauses.marginRatchet ? '✓' : '✗'}</p>`;
  
  if (analysis.esgClauses.kpis.length) {
    esgHTML += '<p><strong>KPIs:</strong></p>';
    esgHTML += analysis.esgClauses.kpis.map(k => `<div class="risk-item low">${escapeHtml(k)}</div>`).join('');
  }
  
  esgHTML += '</div>';
  esg.innerHTML = esgHTML;
  
  // Scroll to results
  results.scrollIntoView({ behavior: 'smooth' });
}

// Compare View
function loadCompareView() {
  const compareList = document.getElementById('compareList');
  
  if (analyzedLoans.length < 2) {
    compareList.innerHTML = '<p>Analyze at least 2 documents to compare them.</p>';
    return;
  }
  
  compareList.innerHTML = analyzedLoans.map(loan => `
    <label class="compare-item">
      <input type="checkbox" value="${loan.id}">
      <span>${escapeHtml(loan.fileName)}</span>
    </label>
  `).join('');
  
  const checkboxes = compareList.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const selected = Array.from(checkboxes).filter(c => c.checked);
      if (selected.length >= 2) {
        compareLoans(selected.map(c => c.value));
      }
    });
  });
}

async function compareLoans(ids) {
  try {
    const response = await fetch(`/api/compare?ids=${ids.join(',')}`);
    if (!response.ok) throw new Error('Comparison failed');
    
    const comparison = await response.json();
    displayComparison(comparison);
  } catch (error) {
    showToast('Error: ' + error.message);
  }
}

function displayComparison(comparison) {
  const compareResults = document.getElementById('compareResults');
  compareResults.classList.remove('hidden');
  
  const headers = comparison.loans.map(l => `<th>${escapeHtml(l.name)}</th>`).join('');
  
  let html = `
    <h3>Financial Terms</h3>
    <table>
      <tr><th>Term</th>${headers}</tr>
      <tr><td>Amount</td>${comparison.financialTerms.map(t => `<td>${t.principalAmount || '-'}</td>`).join('')}</tr>
      <tr><td>Currency</td>${comparison.financialTerms.map(t => `<td>${t.currency || '-'}</td>`).join('')}</tr>
      <tr><td>Rate</td>${comparison.financialTerms.map(t => `<td>${t.interestRate || '-'}</td>`).join('')}</tr>
    </table>
    
    <h3>Covenants</h3>
    <table>
      <tr><th>Type</th>${headers}</tr>
      <tr><td>Financial</td>${comparison.covenantCounts.map(c => `<td>${c.financial}</td>`).join('')}</tr>
      <tr><td>Informational</td>${comparison.covenantCounts.map(c => `<td>${c.informational}</td>`).join('')}</tr>
      <tr><td>Negative</td>${comparison.covenantCounts.map(c => `<td>${c.negative}</td>`).join('')}</tr>
    </table>
    
    <h3>ESG</h3>
    <table>
      <tr><th>Feature</th>${headers}</tr>
      <tr><td>ESG Provisions</td>${comparison.esgComparison.map(e => `<td>${e.hasESGProvisions ? '✓' : '✗'}</td>`).join('')}</tr>
      <tr><td>Sustainability-Linked</td>${comparison.esgComparison.map(e => `<td>${e.sustainabilityLinked ? '✓' : '✗'}</td>`).join('')}</tr>
    </table>
  `;
  
  compareResults.innerHTML = html;
}

// Export
function exportJSON() {
  if (!currentAnalysis) return;
  
  const data = JSON.stringify(currentAnalysis, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `loanlens-${currentAnalysis.id}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  showToast('Exported successfully');
}

// UI Helpers
function showLoading() {
  loading.classList.remove('hidden');
}

function hideLoading() {
  loading.classList.add('hidden');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make exportJSON available globally
window.exportJSON = exportJSON;
