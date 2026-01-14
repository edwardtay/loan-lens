// LoanLens Enterprise - Production Application
let currentAnalysis = null;
let analyzedLoans = [];
let complianceChart = null;
let riskChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  loadDashboardData();
  setupEventListeners();
});

function initializeApp() {
  // Load saved loans from localStorage
  const saved = localStorage.getItem('loanlens_documents');
  if (saved) {
    analyzedLoans = JSON.parse(saved);
    updateDocumentCount();
  }
  
  // Initialize charts
  initializeCharts();
  
  // Load recent documents
  updateRecentDocuments();
}

// Navigation
function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  document.getElementById(`${viewName}-view`).classList.add('active');
  document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');
  
  if (viewName === 'dashboard') loadDashboardData();
  if (viewName === 'documents') loadDocumentsTable();
  if (viewName === 'compare') loadCompareView();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const view = item.dataset.view;
    if (view) switchView(view);
  });
});

// Upload Methods
document.querySelectorAll('.upload-method').forEach(method => {
  method.addEventListener('click', () => {
    document.querySelectorAll('.upload-method').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.upload-content').forEach(c => c.classList.add('hidden'));
    
    method.classList.add('active');
    const methodType = method.dataset.method;
    document.getElementById(`${methodType}Upload`).classList.remove('hidden');
  });
});

// File Upload
const dropZone = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('click', (e) => {
  if (e.target.closest('.upload-icon, h3, p, .btn-primary')) {
    fileInput.click();
  }
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = 'var(--primary)';
  dropZone.style.background = 'rgba(30, 64, 175, 0.05)';
});

dropZone.addEventListener('dragleave', () => {
  dropZone.style.borderColor = '';
  dropZone.style.background = '';
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = '';
  dropZone.style.background = '';
  
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) uploadFile(file);
});

async function uploadFile(file) {
  if (!file.type.includes('pdf')) {
    showToast('Please upload a PDF file', 'error');
    return;
  }
  
  showLoading('Uploading and analyzing document...');
  updateProgress(20);
  
  const formData = new FormData();
  formData.append('document', file);
  
  try {
    updateProgress(40);
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData
    });
    
    updateProgress(70);
    
    if (!response.ok) throw new Error('Analysis failed');
    
    const analysis = await response.json();
    updateProgress(90);
    
    currentAnalysis = analysis;
    analyzedLoans.push(analysis);
    saveToLocalStorage();
    
    updateProgress(100);
    hideLoading();
    
    displayAnalysisResults(analysis);
    showToast('Document analyzed successfully', 'success');
    updateDocumentCount();
    updateRecentDocuments();
    
  } catch (error) {
    hideLoading();
    showToast('Error: ' + error.message, 'error');
  }
}

// Text Analysis
document.getElementById('analyzeTextBtn')?.addEventListener('click', async () => {
  const text = document.getElementById('textInput').value.trim();
  if (!text) {
    showToast('Please enter text to analyze', 'error');
    return;
  }
  
  showLoading('Analyzing text...');
  updateProgress(30);
  
  try {
    const response = await fetch('/api/analyze-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    updateProgress(70);
    
    if (!response.ok) throw new Error('Analysis failed');
    
    const analysis = await response.json();
    updateProgress(90);
    
    currentAnalysis = analysis;
    analyzedLoans.push(analysis);
    saveToLocalStorage();
    
    updateProgress(100);
    hideLoading();
    
    displayAnalysisResults(analysis);
    showToast('Text analyzed successfully', 'success');
    updateDocumentCount();
    
  } catch (error) {
    hideLoading();
    showToast('Error: ' + error.message, 'error');
  }
});

// Batch Upload
document.getElementById('batchInput')?.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;
  
  showLoading(`Processing ${files.length} documents...`);
  
  let completed = 0;
  for (const file of files) {
    try {
      const formData = new FormData();
      formData.append('document', file);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const analysis = await response.json();
        analyzedLoans.push(analysis);
        completed++;
      }
      
      updateProgress((completed / files.length) * 100);
      
    } catch (error) {
      console.error('Batch upload error:', error);
    }
  }
  
  saveToLocalStorage();
  hideLoading();
  showToast(`Successfully processed ${completed} of ${files.length} documents`, 'success');
  updateDocumentCount();
  updateRecentDocuments();
});

// Display Analysis Results
function displayAnalysisResults(analysis) {
  const resultsDiv = document.getElementById('analysisResults');
  if (!resultsDiv) return;
  
  resultsDiv.classList.remove('hidden');
  
  const html = `
    <div class="card">
      <div class="card-header">
        <h3>${escapeHtml(analysis.fileName)}</h3>
        <div class="card-actions">
          <button class="btn-sm" onclick="exportAnalysis('${analysis.id}')">
            <i class="fas fa-download"></i> Export
          </button>
          <button class="btn-sm" onclick="viewFullAnalysis('${analysis.id}')">
            <i class="fas fa-eye"></i> View Details
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-dollar-sign"></i></div>
            <div class="stat-content">
              <span class="stat-label">Amount</span>
              <span class="stat-value">${analysis.financialTerms.principalAmount || 'N/A'}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-percentage"></i></div>
            <div class="stat-content">
              <span class="stat-label">Rate</span>
              <span class="stat-value">${analysis.financialTerms.interestRate || 'N/A'}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon purple"><i class="fas fa-gavel"></i></div>
            <div class="stat-content">
              <span class="stat-label">Covenants</span>
              <span class="stat-value">${getTotalCovenants(analysis)}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="stat-content">
              <span class="stat-label">Risks</span>
              <span class="stat-value">${analysis.riskFlags.length}</span>
            </div>
          </div>
        </div>
        
        <div class="dashboard-grid" style="margin-top: 2rem;">
          <div class="card">
            <div class="card-header"><h3>Financial Terms</h3></div>
            <div class="card-body">
              ${renderFinancialTerms(analysis.financialTerms)}
            </div>
          </div>
          
          <div class="card">
            <div class="card-header"><h3>Parties</h3></div>
            <div class="card-body">
              ${renderParties(analysis.parties)}
            </div>
          </div>
          
          <div class="card">
            <div class="card-header"><h3>Risk Flags</h3></div>
            <div class="card-body">
              ${renderRisks(analysis.riskFlags)}
            </div>
          </div>
          
          <div class="card">
            <div class="card-header"><h3>ESG Provisions</h3></div>
            <div class="card-body">
              ${renderESG(analysis.esgClauses)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  resultsDiv.innerHTML = html;
  resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

function renderFinancialTerms(terms) {
  const items = [
    { label: 'Amount', value: terms.principalAmount },
    { label: 'Currency', value: terms.currency },
    { label: 'Reference Rate', value: terms.referenceRate },
    { label: 'Interest Rate', value: terms.interestRate },
    { label: 'Facility Type', value: terms.facilityType }
  ].filter(i => i.value);
  
  if (items.length === 0) return '<p class="empty-state">No financial terms detected</p>';
  
  return items.map(i => `
    <div class="data-row">
      <span class="data-label">${i.label}</span>
      <span class="data-value">${escapeHtml(i.value)}</span>
    </div>
  `).join('');
}

function renderParties(parties) {
  let html = '';
  
  if (parties.borrowers.length) {
    html += '<p><strong>Borrowers:</strong></p>';
    html += parties.borrowers.map(b => `<span class="tag">${escapeHtml(b)}</span>`).join('');
  }
  
  if (parties.lenders.length) {
    html += '<p style="margin-top: 1rem;"><strong>Lenders:</strong></p>';
    html += parties.lenders.map(l => `<span class="tag">${escapeHtml(l)}</span>`).join('');
  }
  
  return html || '<p class="empty-state">No parties detected</p>';
}

function renderRisks(risks) {
  if (risks.length === 0) return '<p class="empty-state">No risk flags detected</p>';
  
  return risks.map(r => `
    <div class="alert-card ${r.severity}" style="margin-bottom: 1rem;">
      <div class="alert-header">
        <i class="fas fa-exclamation-triangle"></i>
        <span class="alert-badge">${r.severity.toUpperCase()}</span>
      </div>
      <h4>${escapeHtml(r.type)}</h4>
      <p>${escapeHtml(r.description)}</p>
    </div>
  `).join('');
}

function renderESG(esg) {
  return `
    <div class="data-row">
      <span class="data-label">ESG Provisions</span>
      <span class="data-value">${esg.hasESGProvisions ? '✓ Yes' : '✗ No'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Sustainability-Linked</span>
      <span class="data-value">${esg.sustainabilityLinked ? '✓ Yes' : '✗ No'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Green Loan</span>
      <span class="data-value">${esg.greenLoan ? '✓ Yes' : '✗ No'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Margin Ratchet</span>
      <span class="data-value">${esg.marginRatchet ? '✓ Yes' : '✗ No'}</span>
    </div>
    ${esg.kpis.length ? `<p style="margin-top: 1rem;"><strong>KPIs:</strong></p>${esg.kpis.map(k => `<div class="tag">${escapeHtml(k)}</div>`).join('')}` : ''}
  `;
}

// Dashboard
function loadDashboardData() {
  // Update stats
  document.getElementById('statDocs').textContent = analyzedLoans.length;
  
  const totalExposure = analyzedLoans.reduce((sum, loan) => {
    const amount = loan.financialTerms.principalAmount;
    if (amount) {
      const match = amount.match(/[\d,]+/);
      if (match) return sum + parseInt(match[0].replace(/,/g, ''));
    }
    return sum;
  }, 0);
  
  document.getElementById('statExposure').textContent = 
    totalExposure > 0 ? `$${(totalExposure / 1000000).toFixed(1)}M` : '$0';
  
  const totalAlerts = analyzedLoans.reduce((sum, loan) => 
    sum + loan.riskFlags.filter(r => r.severity === 'high').length, 0);
  document.getElementById('statAlerts').textContent = totalAlerts;
  
  const esgLoans = analyzedLoans.filter(l => l.esgClauses.hasESGProvisions).length;
  document.getElementById('statESG').textContent = esgLoans;
  
  // Update activity
  updateActivityList();
  updateObligationsList();
  updateCharts();
}

function updateActivityList() {
  const list = document.getElementById('activityList');
  if (!list) return;
  
  const activities = analyzedLoans.slice(-5).reverse().map(loan => `
    <div class="activity-item">
      <div class="activity-icon">
        <i class="fas fa-file-alt"></i>
      </div>
      <div class="activity-content">
        <h4>Document Analyzed</h4>
        <p>${escapeHtml(loan.fileName)}</p>
      </div>
      <span class="activity-time">${formatTime(loan.timestamp)}</span>
    </div>
  `).join('');
  
  list.innerHTML = activities || '<p class="empty-state">No recent activity</p>';
}

function updateObligationsList() {
  const list = document.getElementById('obligationsList');
  if (!list) return;
  
  const obligations = [];
  analyzedLoans.forEach(loan => {
    loan.obligations?.forEach(obl => {
      obligations.push({
        loan: loan.fileName,
        ...obl
      });
    });
  });
  
  const html = obligations.slice(0, 5).map(obl => `
    <div class="activity-item">
      <div class="activity-icon">
        <i class="fas fa-clock"></i>
      </div>
      <div class="activity-content">
        <h4>${escapeHtml(obl.type)}</h4>
        <p>${escapeHtml(obl.loan)}</p>
      </div>
      <span class="activity-time">${obl.deadline}</span>
    </div>
  `).join('');
  
  list.innerHTML = html || '<p class="empty-state">No upcoming obligations</p>';
}

// Charts
function initializeCharts() {
  const complianceCtx = document.getElementById('complianceChart');
  const riskCtx = document.getElementById('riskChart');
  
  if (complianceCtx) {
    complianceChart = new Chart(complianceCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Compliance Rate',
          data: [95, 94, 96, 95, 97, 96],
          borderColor: 'rgb(30, 64, 175)',
          backgroundColor: 'rgba(30, 64, 175, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }
  
  if (riskCtx) {
    riskChart = new Chart(riskCtx, {
      type: 'doughnut',
      data: {
        labels: ['Low', 'Medium', 'High'],
        datasets: [{
          data: [60, 30, 10],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
}

function updateCharts() {
  if (!complianceChart || !riskChart) return;
  
  // Update risk chart with real data
  const risks = { low: 0, medium: 0, high: 0 };
  analyzedLoans.forEach(loan => {
    loan.riskFlags.forEach(risk => {
      risks[risk.severity] = (risks[risk.severity] || 0) + 1;
    });
  });
  
  riskChart.data.datasets[0].data = [risks.low || 0, risks.medium || 0, risks.high || 0];
  riskChart.update();
}

// Documents Table
function loadDocumentsTable() {
  const tbody = document.getElementById('documentsTableBody');
  if (!tbody) return;
  
  const html = analyzedLoans.map(loan => `
    <tr>
      <td><input type="checkbox" value="${loan.id}"></td>
      <td>${escapeHtml(loan.fileName)}</td>
      <td>${loan.parties.borrowers[0] || 'N/A'}</td>
      <td>${loan.financialTerms.principalAmount || 'N/A'}</td>
      <td><span class="status-badge success">Analyzed</span></td>
      <td>${formatDate(loan.timestamp)}</td>
      <td>
        <button class="btn-sm" onclick="viewFullAnalysis('${loan.id}')">View</button>
        <button class="btn-sm-secondary" onclick="deleteDocument('${loan.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
  
  tbody.innerHTML = html || '<tr><td colspan="7" class="empty-state">No documents yet</td></tr>';
}

// Compare View
function loadCompareView() {
  const list = document.getElementById('compareDocList');
  if (!list) return;
  
  const html = analyzedLoans.map(loan => `
    <label class="checkbox-label" style="padding: 1rem; background: var(--surface); border-radius: var(--radius); margin-bottom: 0.5rem;">
      <input type="checkbox" value="${loan.id}" onchange="updateComparePreview()">
      <span>${escapeHtml(loan.fileName)}</span>
    </label>
  `).join('');
  
  list.innerHTML = html || '<p class="empty-state">No documents to compare</p>';
}

function updateComparePreview() {
  const selected = Array.from(document.querySelectorAll('#compareDocList input:checked')).map(cb => cb.value);
  const preview = document.getElementById('comparePreview');
  
  if (selected.length < 2) {
    preview.innerHTML = '<p class="empty-state">Select 2 or more documents to compare</p>';
    return;
  }
  
  compareDocuments(selected);
}

async function compareDocuments(ids) {
  try {
    const response = await fetch(`/api/compare?ids=${ids.join(',')}`);
    if (!response.ok) throw new Error('Comparison failed');
    
    const comparison = await response.json();
    displayComparison(comparison);
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

function displayComparison(comparison) {
  const preview = document.getElementById('comparePreview');
  
  const headers = comparison.loans.map(l => `<th>${escapeHtml(l.name)}</th>`).join('');
  
  const html = `
    <div class="card">
      <div class="card-header"><h3>Financial Terms Comparison</h3></div>
      <div class="card-body">
        <table class="data-table">
          <thead><tr><th>Term</th>${headers}</tr></thead>
          <tbody>
            <tr><td>Amount</td>${comparison.financialTerms.map(t => `<td>${t.principalAmount || '-'}</td>`).join('')}</tr>
            <tr><td>Currency</td>${comparison.financialTerms.map(t => `<td>${t.currency || '-'}</td>`).join('')}</tr>
            <tr><td>Rate</td>${comparison.financialTerms.map(t => `<td>${t.interestRate || '-'}</td>`).join('')}</tr>
            <tr><td>Type</td>${comparison.financialTerms.map(t => `<td>${t.facilityType || '-'}</td>`).join('')}</tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="card" style="margin-top: 1.5rem;">
      <div class="card-header"><h3>Covenant Counts</h3></div>
      <div class="card-body">
        <table class="data-table">
          <thead><tr><th>Type</th>${headers}</tr></thead>
          <tbody>
            <tr><td>Financial</td>${comparison.covenantCounts.map(c => `<td>${c.financial}</td>`).join('')}</tr>
            <tr><td>Informational</td>${comparison.covenantCounts.map(c => `<td>${c.informational}</td>`).join('')}</tr>
            <tr><td>Negative</td>${comparison.covenantCounts.map(c => `<td>${c.negative}</td>`).join('')}</tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  preview.innerHTML = html;
}

// Utility Functions
function setupEventListeners() {
  // Global search
  document.getElementById('globalSearch')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    // Implement search logic
  });
}

function updateDocumentCount() {
  document.querySelectorAll('.nav-item[data-view="documents"] .count').forEach(el => {
    el.textContent = analyzedLoans.length;
  });
}

function updateRecentDocuments() {
  const list = document.querySelector('.recent-list');
  if (!list) return;
  
  const html = analyzedLoans.slice(-5).reverse().map(loan => `
    <div class="recent-item" onclick="viewFullAnalysis('${loan.id}')">
      ${escapeHtml(loan.fileName.substring(0, 30))}${loan.fileName.length > 30 ? '...' : ''}
    </div>
  `).join('');
  
  list.innerHTML = html || '<p class="empty-state" style="font-size: 0.75rem;">No recent documents</p>';
}

function saveToLocalStorage() {
  localStorage.setItem('loanlens_documents', JSON.stringify(analyzedLoans));
}

function showLoading(message = 'Processing...') {
  const overlay = document.getElementById('loadingOverlay');
  const status = document.getElementById('loadingStatus');
  if (overlay) {
    overlay.classList.remove('hidden');
    if (status) status.textContent = message;
  }
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('hidden');
  updateProgress(0);
}

function updateProgress(percent) {
  const fill = document.getElementById('progressFill');
  if (fill) fill.style.width = `${percent}%`;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function exportAnalysis(id) {
  const loan = analyzedLoans.find(l => l.id === id);
  if (!loan) return;
  
  const data = JSON.stringify(loan, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `loanlens-${loan.id}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  showToast('Analysis exported successfully', 'success');
}

function viewFullAnalysis(id) {
  const loan = analyzedLoans.find(l => l.id === id);
  if (!loan) return;
  
  currentAnalysis = loan;
  switchView('analyze');
  displayAnalysisResults(loan);
}

function deleteDocument(id) {
  if (!confirm('Are you sure you want to delete this document?')) return;
  
  analyzedLoans = analyzedLoans.filter(l => l.id !== id);
  saveToLocalStorage();
  loadDocumentsTable();
  updateDocumentCount();
  updateRecentDocuments();
  showToast('Document deleted', 'success');
}

function getTotalCovenants(analysis) {
  return (analysis.covenants.financial.length + 
          analysis.covenants.informational.length + 
          analysis.covenants.negative.length);
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions globally available
window.switchView = switchView;
window.exportAnalysis = exportAnalysis;
window.viewFullAnalysis = viewFullAnalysis;
window.deleteDocument = deleteDocument;
window.updateComparePreview = updateComparePreview;
