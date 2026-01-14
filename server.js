const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3456;

// Security middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Configure multer for file uploads with security limits
const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 1 
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Store analyzed loans in memory (would use DB in production)
const analyzedLoans = new Map();

// Simple rate limiting
const requestCounts = new Map();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }
  
  const requests = requestCounts.get(ip).filter(time => now - time < RATE_WINDOW);
  
  if (requests.length >= RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  
  requests.push(now);
  requestCounts.set(ip, requests);
  next();
}

// Clean up old rate limit data every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, requests] of requestCounts.entries()) {
    const recent = requests.filter(time => now - time < RATE_WINDOW);
    if (recent.length === 0) {
      requestCounts.delete(ip);
    } else {
      requestCounts.set(ip, recent);
    }
  }
}, 300000);

// Apply rate limiting to API routes
app.use('/api/', rateLimitMiddleware);

// AI-powered loan document analysis
function analyzeLoanDocument(text) {
  const analysis = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    summary: {},
    parties: extractParties(text),
    financialTerms: extractFinancialTerms(text),
    covenants: extractCovenants(text),
    keyDates: extractKeyDates(text),
    esgClauses: extractESGClauses(text),
    riskFlags: identifyRiskFlags(text),
    obligations: extractObligations(text)
  };
  
  analysis.summary = generateSummary(analysis);
  return analysis;
}

function extractParties(text) {
  const parties = { borrowers: [], lenders: [], agents: [], guarantors: [] };
  
  // Pattern matching for common party identifiers
  const borrowerPatterns = [
    /(?:borrower|obligor)[:\s]+([A-Z][A-Za-z\s&.,]+(?:Ltd|LLC|Inc|PLC|Limited|Corporation)?)/gi,
    /("Borrower")[:\s]+means\s+([A-Z][A-Za-z\s&.,]+)/gi
  ];
  
  const lenderPatterns = [
    /(?:lender|bank)[:\s]+([A-Z][A-Za-z\s&.,]+(?:Bank|N\.A\.|PLC)?)/gi,
    /("Lender")[:\s]+means\s+([A-Z][A-Za-z\s&.,]+)/gi
  ];

  borrowerPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const name = (match[2] || match[1]).trim();
      if (name.length > 2 && name.length < 100 && !parties.borrowers.includes(name)) {
        parties.borrowers.push(name);
      }
    }
  });

  lenderPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const name = (match[2] || match[1]).trim();
      if (name.length > 2 && name.length < 100 && !parties.lenders.includes(name)) {
        parties.lenders.push(name);
      }
    }
  });

  // Extract agent references
  const agentMatch = text.match(/(?:facility\s+)?agent[:\s]+([A-Z][A-Za-z\s&.,]+(?:Bank|N\.A\.)?)/gi);
  if (agentMatch) {
    parties.agents = [...new Set(agentMatch.map(m => m.replace(/(?:facility\s+)?agent[:\s]+/i, '').trim()))];
  }

  return parties;
}

function extractFinancialTerms(text) {
  const terms = {
    principalAmount: null,
    currency: null,
    interestRate: null,
    margin: null,
    referenceRate: null,
    commitmentFee: null,
    facilityType: null
  };

  // Extract principal/facility amount
  const amountPatterns = [
    /(?:principal|facility|commitment)\s+(?:amount|sum)[:\s]*(?:of\s+)?(?:up\s+to\s+)?([£$€]\s*[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|m|bn))?)/gi,
    /([£$€]\s*[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|m|bn))?)\s+(?:facility|loan|credit)/gi
  ];

  amountPatterns.forEach(pattern => {
    const match = text.match(pattern);
    if (match && !terms.principalAmount) {
      terms.principalAmount = match[1] || match[0];
    }
  });

  // Extract currency
  if (text.includes('$') || text.toLowerCase().includes('usd') || text.toLowerCase().includes('dollar')) {
    terms.currency = 'USD';
  } else if (text.includes('£') || text.toLowerCase().includes('gbp') || text.toLowerCase().includes('sterling')) {
    terms.currency = 'GBP';
  } else if (text.includes('€') || text.toLowerCase().includes('eur')) {
    terms.currency = 'EUR';
  }

  // Extract interest rate/margin
  const rateMatch = text.match(/(?:interest\s+rate|margin)[:\s]*(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:%|percent|basis\s+points|bps)/gi);
  if (rateMatch) {
    terms.interestRate = rateMatch[0];
  }

  const marginMatch = text.match(/margin[:\s]*(\d+(?:\.\d+)?)\s*(?:%|percent|basis\s+points|bps)/i);
  if (marginMatch) {
    terms.margin = marginMatch[1] + (marginMatch[0].toLowerCase().includes('bps') ? ' bps' : '%');
  }

  // Extract reference rate
  const refRates = ['SOFR', 'SONIA', 'EURIBOR', 'LIBOR', 'Term SOFR', 'Compounded SOFR'];
  refRates.forEach(rate => {
    if (text.toUpperCase().includes(rate)) {
      terms.referenceRate = rate;
    }
  });

  // Extract facility type
  const facilityTypes = ['revolving', 'term loan', 'bridge', 'acquisition', 'working capital', 'syndicated'];
  facilityTypes.forEach(type => {
    if (text.toLowerCase().includes(type)) {
      terms.facilityType = type.charAt(0).toUpperCase() + type.slice(1);
    }
  });

  return terms;
}

function extractCovenants(text) {
  const covenants = { financial: [], informational: [], negative: [], positive: [] };

  // Financial covenants
  const financialPatterns = [
    /leverage\s+ratio[^.]*(?:not\s+(?:to\s+)?exceed|less\s+than|greater\s+than)[^.]*[\d.:]+/gi,
    /interest\s+cover(?:age)?\s+ratio[^.]*(?:not\s+(?:to\s+)?exceed|at\s+least|minimum)[^.]*[\d.:]+/gi,
    /debt\s+(?:to\s+)?(?:equity|ebitda)[^.]*ratio[^.]*[\d.:]+/gi,
    /(?:minimum|maximum)\s+(?:net\s+worth|liquidity|cash)[^.]*[\d,£$€]+/gi
  ];

  financialPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const covenant = match[0].trim();
      if (covenant.length > 10 && !covenants.financial.some(c => c.includes(covenant.substring(0, 30)))) {
        covenants.financial.push(covenant);
      }
    }
  });

  // Information covenants
  const infoPatterns = [
    /(?:deliver|provide|furnish)[^.]*(?:financial\s+statements|accounts|reports)[^.]{0,100}/gi,
    /(?:annual|quarterly|monthly)\s+(?:financial\s+)?(?:statements|reports|accounts)[^.]{0,50}/gi
  ];

  infoPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (!covenants.informational.includes(match[0].trim())) {
        covenants.informational.push(match[0].trim());
      }
    }
  });

  // Negative covenants
  const negativeKeywords = ['shall not', 'will not', 'must not', 'prohibited from', 'restriction on'];
  negativeKeywords.forEach(keyword => {
    const regex = new RegExp(`${keyword}[^.]{10,150}`, 'gi');
    const matches = text.matchAll(regex);
    for (const match of matches) {
      if (covenants.negative.length < 10) {
        covenants.negative.push(match[0].trim());
      }
    }
  });

  return covenants;
}

function extractKeyDates(text) {
  const dates = [];
  
  // Date patterns
  const datePatterns = [
    /(?:maturity|termination|expiry)\s+date[:\s]*(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/gi,
    /(?:effective|closing|signing)\s+date[:\s]*(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/gi,
    /(?:repayment|payment)\s+date[:\s]*(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/gi
  ];

  datePatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      dates.push({
        type: match[0].split(/date/i)[0].trim(),
        date: match[1]
      });
    }
  });

  // Extract tenor/term
  const tenorMatch = text.match(/(?:tenor|term)[:\s]*(?:of\s+)?(\d+)\s*(?:year|month|day)s?/i);
  if (tenorMatch) {
    dates.push({ type: 'Tenor', date: tenorMatch[0] });
  }

  return dates;
}

function extractESGClauses(text) {
  const esg = {
    hasESGProvisions: false,
    sustainabilityLinked: false,
    greenLoan: false,
    kpis: [],
    targets: [],
    marginRatchet: false
  };

  const esgKeywords = ['esg', 'sustainability', 'environmental', 'social', 'governance', 'green', 'climate'];
  esgKeywords.forEach(keyword => {
    if (text.toLowerCase().includes(keyword)) {
      esg.hasESGProvisions = true;
    }
  });

  if (text.toLowerCase().includes('sustainability-linked') || text.toLowerCase().includes('sustainability linked')) {
    esg.sustainabilityLinked = true;
  }

  if (text.toLowerCase().includes('green loan') || text.toLowerCase().includes('green facility')) {
    esg.greenLoan = true;
  }

  // Extract KPIs
  const kpiPatterns = [
    /(?:kpi|key\s+performance\s+indicator)[:\s]*([^.]+)/gi,
    /(?:sustainability\s+)?(?:target|metric)[:\s]*([^.]+(?:emission|carbon|renewable|diversity|waste)[^.]*)/gi
  ];

  kpiPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 5) {
        esg.kpis.push(match[1].trim());
      }
    }
  });

  // Check for margin ratchet
  if (text.toLowerCase().includes('margin adjustment') || text.toLowerCase().includes('margin ratchet')) {
    esg.marginRatchet = true;
  }

  return esg;
}

function identifyRiskFlags(text) {
  const risks = [];

  // Check for cross-default provisions
  if (text.toLowerCase().includes('cross-default') || text.toLowerCase().includes('cross default')) {
    risks.push({ type: 'Cross-Default', severity: 'high', description: 'Cross-default provisions detected' });
  }

  // Check for material adverse change
  if (text.toLowerCase().includes('material adverse change') || text.toLowerCase().includes('mac clause')) {
    risks.push({ type: 'MAC Clause', severity: 'medium', description: 'Material Adverse Change clause present' });
  }

  // Check for change of control
  if (text.toLowerCase().includes('change of control')) {
    risks.push({ type: 'Change of Control', severity: 'medium', description: 'Change of control provisions detected' });
  }

  // Check for acceleration clauses
  if (text.toLowerCase().includes('acceleration') && text.toLowerCase().includes('event of default')) {
    risks.push({ type: 'Acceleration', severity: 'high', description: 'Acceleration upon default provisions' });
  }

  return risks;
}

function extractObligations(text) {
  const obligations = [];

  // Reporting obligations
  const reportingPatterns = [
    /(?:shall|must|will)\s+(?:deliver|provide|furnish)[^.]*(?:within|by|no\s+later\s+than)\s+(\d+)\s*(?:days?|business\s+days?)/gi
  ];

  reportingPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      obligations.push({
        type: 'Reporting',
        description: match[0].trim(),
        deadline: match[1] + ' days'
      });
    }
  });

  return obligations;
}

function generateSummary(analysis) {
  return {
    totalParties: analysis.parties.borrowers.length + analysis.parties.lenders.length,
    totalCovenants: analysis.covenants.financial.length + analysis.covenants.informational.length + analysis.covenants.negative.length,
    totalRisks: analysis.riskFlags.length,
    hasESG: analysis.esgClauses.hasESGProvisions,
    keyMetrics: {
      amount: analysis.financialTerms.principalAmount,
      currency: analysis.financialTerms.currency,
      rate: analysis.financialTerms.interestRate,
      type: analysis.financialTerms.facilityType
    }
  };
}

// API Routes
app.post('/api/analyze', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const data = await pdfParse(req.file.buffer);
    const analysis = analyzeLoanDocument(data.text);
    analysis.fileName = req.file.originalname;
    analysis.pageCount = data.numpages;
    analysis.textLength = data.text.length;
    
    analyzedLoans.set(analysis.id, analysis);
    
    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze document', details: error.message });
  }
});

app.post('/api/analyze-text', express.json(), (req, res) => {
  try {
    const { text, name } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Security: Limit text length
    if (text.length > 5000000) { // 5MB text limit
      return res.status(400).json({ error: 'Text too long. Maximum 5MB allowed.' });
    }

    // Sanitize name input
    const sanitizedName = name ? name.substring(0, 255).replace(/[<>]/g, '') : 'Pasted Text';

    const analysis = analyzeLoanDocument(text);
    analysis.fileName = sanitizedName;
    analysis.textLength = text.length;
    
    analyzedLoans.set(analysis.id, analysis);
    
    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze text', details: error.message });
  }
});

app.get('/api/loans', (req, res) => {
  res.json(Array.from(analyzedLoans.values()));
});

app.get('/api/loans/:id', (req, res) => {
  // Sanitize ID input
  const id = req.params.id.replace(/[^a-zA-Z0-9]/g, '');
  const loan = analyzedLoans.get(id);
  if (!loan) {
    return res.status(404).json({ error: 'Loan not found' });
  }
  res.json(loan);
});

app.get('/api/compare', (req, res) => {
  const ids = req.query.ids?.split(',').map(id => id.replace(/[^a-zA-Z0-9]/g, '')) || [];
  
  // Security: Limit number of comparisons
  if (ids.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 loans can be compared at once' });
  }
  
  const loans = ids.map(id => analyzedLoans.get(id)).filter(Boolean);
  
  if (loans.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 loans to compare' });
  }

  const comparison = {
    loans: loans.map(l => ({ id: l.id, name: l.fileName })),
    financialTerms: loans.map(l => l.financialTerms),
    covenantCounts: loans.map(l => ({
      financial: l.covenants.financial.length,
      informational: l.covenants.informational.length,
      negative: l.covenants.negative.length
    })),
    riskComparison: loans.map(l => l.riskFlags),
    esgComparison: loans.map(l => l.esgClauses),
    inconsistencies: detectInconsistencies(loans)
  };

  res.json(comparison);
});

// Detect inconsistencies across loans
function detectInconsistencies(loans) {
  const issues = [];
  
  // Check for currency mismatches
  const currencies = loans.map(l => l.financialTerms.currency).filter(Boolean);
  if (new Set(currencies).size > 1) {
    issues.push({
      type: 'Currency Mismatch',
      severity: 'high',
      description: `Multiple currencies detected: ${[...new Set(currencies)].join(', ')}`,
      affectedLoans: loans.filter(l => l.financialTerms.currency).map(l => l.fileName)
    });
  }
  
  // Check for reference rate inconsistencies
  const refRates = loans.map(l => l.financialTerms.referenceRate).filter(Boolean);
  if (new Set(refRates).size > 1) {
    issues.push({
      type: 'Reference Rate Variation',
      severity: 'medium',
      description: `Different reference rates used: ${[...new Set(refRates)].join(', ')}`,
      affectedLoans: loans.filter(l => l.financialTerms.referenceRate).map(l => l.fileName)
    });
  }
  
  // Check for ESG inconsistencies
  const esgLoans = loans.filter(l => l.esgClauses.hasESGProvisions);
  const nonEsgLoans = loans.filter(l => !l.esgClauses.hasESGProvisions);
  if (esgLoans.length > 0 && nonEsgLoans.length > 0) {
    issues.push({
      type: 'ESG Inconsistency',
      severity: 'medium',
      description: `${esgLoans.length} loan(s) have ESG provisions, ${nonEsgLoans.length} do not`,
      affectedLoans: nonEsgLoans.map(l => l.fileName)
    });
  }
  
  // Check for risk profile differences
  const highRiskLoans = loans.filter(l => l.riskFlags.some(r => r.severity === 'high'));
  if (highRiskLoans.length > 0 && highRiskLoans.length < loans.length) {
    issues.push({
      type: 'Risk Profile Variation',
      severity: 'high',
      description: `${highRiskLoans.length} loan(s) contain high-severity risk flags`,
      affectedLoans: highRiskLoans.map(l => l.fileName)
    });
  }
  
  return issues;
}

// Covenant compliance calculator
app.post('/api/calculate-compliance', express.json(), (req, res) => {
  try {
    const { loanId, actualMetrics } = req.body;
    
    // Sanitize and validate inputs
    const sanitizedId = String(loanId).replace(/[^a-zA-Z0-9]/g, '');
    const loan = analyzedLoans.get(sanitizedId);
    
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    // Validate actualMetrics
    if (!actualMetrics || typeof actualMetrics !== 'object') {
      return res.status(400).json({ error: 'Invalid metrics provided' });
    }
    
    // Validate numeric values
    const validatedMetrics = {};
    ['leverageRatio', 'interestCoverageRatio', 'netWorth'].forEach(key => {
      if (actualMetrics[key] !== undefined) {
        const value = parseFloat(actualMetrics[key]);
        if (isNaN(value) || !isFinite(value)) {
          return res.status(400).json({ error: `Invalid value for ${key}` });
        }
        validatedMetrics[key] = value;
      }
    });
    
    const compliance = calculateCovenantCompliance(loan, validatedMetrics);
    res.json(compliance);
  } catch (error) {
    console.error('Compliance calculation error:', error);
    res.status(500).json({ error: 'Compliance calculation failed', details: error.message });
  }
});

function calculateCovenantCompliance(loan, actualMetrics) {
  const results = [];
  
  // Parse financial covenants and check compliance
  loan.covenants.financial.forEach(covenant => {
    const covenantText = covenant.toLowerCase();
    
    // Leverage Ratio check
    if (covenantText.includes('leverage') && covenantText.includes('ratio')) {
      const match = covenant.match(/(\d+\.?\d*):1/);
      if (match && actualMetrics.leverageRatio !== undefined) {
        const threshold = parseFloat(match[1]);
        const actual = actualMetrics.leverageRatio;
        const compliant = actual <= threshold;
        const buffer = threshold - actual;
        
        results.push({
          covenant: 'Leverage Ratio',
          threshold: `${threshold}:1`,
          actual: `${actual}:1`,
          compliant,
          buffer: buffer.toFixed(2),
          status: compliant ? 'pass' : 'breach',
          severity: !compliant ? 'critical' : (buffer < 0.5 ? 'warning' : 'healthy')
        });
      }
    }
    
    // Interest Coverage Ratio check
    if (covenantText.includes('interest') && covenantText.includes('cover')) {
      const match = covenant.match(/(\d+\.?\d*):1/);
      if (match && actualMetrics.interestCoverageRatio !== undefined) {
        const threshold = parseFloat(match[1]);
        const actual = actualMetrics.interestCoverageRatio;
        const compliant = actual >= threshold;
        const buffer = actual - threshold;
        
        results.push({
          covenant: 'Interest Coverage Ratio',
          threshold: `${threshold}:1`,
          actual: `${actual}:1`,
          compliant,
          buffer: buffer.toFixed(2),
          status: compliant ? 'pass' : 'breach',
          severity: !compliant ? 'critical' : (buffer < 0.5 ? 'warning' : 'healthy')
        });
      }
    }
    
    // Net Worth check
    if (covenantText.includes('net worth') || covenantText.includes('minimum')) {
      const match = covenant.match(/\$?([\d,]+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m)?/i);
      if (match && actualMetrics.netWorth !== undefined) {
        let threshold = parseFloat(match[1].replace(/,/g, ''));
        if (covenant.toLowerCase().includes('million')) {
          threshold *= 1000000;
        }
        const actual = actualMetrics.netWorth;
        const compliant = actual >= threshold;
        const buffer = actual - threshold;
        
        results.push({
          covenant: 'Minimum Net Worth',
          threshold: `$${(threshold / 1000000).toFixed(1)}M`,
          actual: `$${(actual / 1000000).toFixed(1)}M`,
          compliant,
          buffer: `$${(buffer / 1000000).toFixed(1)}M`,
          status: compliant ? 'pass' : 'breach',
          severity: !compliant ? 'critical' : (buffer < threshold * 0.1 ? 'warning' : 'healthy')
        });
      }
    }
  });
  
  const breaches = results.filter(r => !r.compliant).length;
  const warnings = results.filter(r => r.severity === 'warning').length;
  
  return {
    summary: {
      totalCovenants: results.length,
      breaches,
      warnings,
      healthy: results.length - breaches - warnings,
      overallStatus: breaches > 0 ? 'breach' : (warnings > 0 ? 'warning' : 'compliant')
    },
    details: results,
    timestamp: new Date().toISOString()
  };
}

// Demo data endpoint
app.get('/api/demo', (req, res) => {
  const demoText = `
    FACILITY AGREEMENT dated January 10, 2026
    
    BORROWER: Acme Corporation Limited
    LENDER: Global Bank PLC
    FACILITY AGENT: Global Bank PLC
    
    FACILITY AMOUNT: $500,000,000 (Five Hundred Million Dollars)
    
    This Term Loan Facility Agreement sets out the terms under which the Lender agrees to make available 
    to the Borrower a revolving credit facility.
    
    INTEREST: The interest rate shall be Term SOFR plus a margin of 2.50% per annum (250 basis points).
    
    MATURITY DATE: January 10, 2031
    EFFECTIVE DATE: January 15, 2026
    
    FINANCIAL COVENANTS:
    - Leverage Ratio: The Borrower shall ensure that the Leverage Ratio does not exceed 3.5:1
    - Interest Coverage Ratio: The Borrower shall maintain an Interest Coverage Ratio of at least 4.0:1
    - Minimum Net Worth: The Borrower shall maintain minimum net worth of $100,000,000
    
    INFORMATION COVENANTS:
    The Borrower shall deliver annual financial statements within 120 days of each financial year end.
    The Borrower shall provide quarterly management accounts within 45 days of each quarter end.
    
    NEGATIVE COVENANTS:
    The Borrower shall not create any security over its assets without prior consent.
    The Borrower shall not dispose of any material assets.
    The Borrower will not make any acquisitions exceeding $50,000,000 without consent.
    
    EVENTS OF DEFAULT:
    Cross-default provisions shall apply to any indebtedness exceeding $10,000,000.
    Material Adverse Change clause: Any MAC shall constitute an Event of Default.
    Change of Control: Any change of control shall require mandatory prepayment.
    
    Upon an Event of Default, the Lender may declare all amounts immediately due and payable (acceleration).
    
    SUSTAINABILITY-LINKED PROVISIONS:
    This is a Sustainability-Linked Loan with the following KPIs:
    - KPI 1: Reduce carbon emissions by 25% by 2028
    - KPI 2: Achieve 50% renewable energy usage by 2027
    
    Margin Adjustment: The margin shall be reduced by 5 basis points upon achievement of each KPI target.
    
    ESG Reporting: The Borrower shall provide annual sustainability reports.
  `;

  const analysis = analyzeLoanDocument(demoText);
  analysis.fileName = 'Demo_Facility_Agreement.pdf';
  analysis.pageCount = 45;
  analysis.textLength = demoText.length;
  analysis.isDemo = true;
  
  analyzedLoans.set(analysis.id, analysis);
  
  res.json(analysis);
});

app.listen(PORT, () => {
  console.log(`🚀 LoanLens server running on http://localhost:${PORT}`);
  console.log('📄 Upload loan documents to analyze them');
});
