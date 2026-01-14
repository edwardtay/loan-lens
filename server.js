require('dotenv').config();
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3456;

// Security middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  }
});

// In-memory storage
const analyzedLoans = new Map();

// Rate limiting
const requestCounts = new Map();
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_REQUESTS) || 100;
const RATE_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) requestCounts.set(ip, []);
  
  const requests = requestCounts.get(ip).filter(time => now - time < RATE_WINDOW);
  
  if (requests.length >= RATE_LIMIT) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  requests.push(now);
  requestCounts.set(ip, requests);
  next();
}

app.use('/api/', rateLimitMiddleware);

// AI Enhancement (optional)
async function enhanceWithAI(text, analysis) {
  if (process.env.USE_AI_ENHANCEMENT !== 'true') return analysis;
  
  try {
    const provider = process.env.AI_PROVIDER || 'local';
    
    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const prompt = `Analyze this loan document excerpt and extract key financial terms, covenants, and risks. Return JSON only:\n\n${text.substring(0, 4000)}`;
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1000
      });
      
      const aiData = JSON.parse(response.choices[0].message.content);
      return { ...analysis, aiEnhanced: true, aiInsights: aiData };
    }
    
    if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      const Anthropic = require('@anthropic-ai/sdk');
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      
      const message = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Analyze this loan document and extract key terms as JSON:\n\n${text.substring(0, 4000)}`
        }]
      });
      
      const aiData = JSON.parse(message.content[0].text);
      return { ...analysis, aiEnhanced: true, aiInsights: aiData };
    }
  } catch (error) {
    console.error('AI enhancement failed:', error.message);
  }
  
  return analysis;
}

// Core analysis engine
function analyzeLoanDocument(text) {
  return {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    parties: extractParties(text),
    financialTerms: extractFinancialTerms(text),
    covenants: extractCovenants(text),
    keyDates: extractKeyDates(text),
    esgClauses: extractESG(text),
    riskFlags: extractRisks(text),
    obligations: extractObligations(text)
  };
}

function extractParties(text) {
  const parties = { borrowers: [], lenders: [], agents: [] };
  
  const borrowerPatterns = [
    /(?:borrower|obligor)[:\s]+([A-Z][A-Za-z\s&.,]+(?:Ltd|LLC|Inc|PLC|Limited|Corporation)?)/gi,
    /("Borrower")[:\s]+means\s+([A-Z][A-Za-z\s&.,]+)/gi
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
  
  const lenderPatterns = [
    /(?:lender|bank)[:\s]+([A-Z][A-Za-z\s&.,]+(?:Bank|N\.A\.|PLC)?)/gi
  ];
  
  lenderPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const name = match[1].trim();
      if (name.length > 2 && name.length < 100 && !parties.lenders.includes(name)) {
        parties.lenders.push(name);
      }
    }
  });
  
  return parties;
}

function extractFinancialTerms(text) {
  const terms = {};
  
  // Amount
  const amountMatch = text.match(/(?:principal|facility|commitment)\s+(?:amount|sum)[:\s]*(?:of\s+)?(?:up\s+to\s+)?([£$€]\s*[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|m|bn))?)/i);
  if (amountMatch) terms.principalAmount = amountMatch[1];
  
  // Currency
  if (text.includes('$') || /usd|dollar/i.test(text)) terms.currency = 'USD';
  else if (text.includes('£') || /gbp|sterling/i.test(text)) terms.currency = 'GBP';
  else if (text.includes('€') || /eur/i.test(text)) terms.currency = 'EUR';
  
  // Rate
  const rateMatch = text.match(/(?:interest\s+rate|margin)[:\s]*(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:%|percent|basis\s+points|bps)/i);
  if (rateMatch) terms.interestRate = rateMatch[0];
  
  // Reference rate
  const refRates = ['SOFR', 'SONIA', 'EURIBOR', 'LIBOR'];
  for (const rate of refRates) {
    if (text.toUpperCase().includes(rate)) {
      terms.referenceRate = rate;
      break;
    }
  }
  
  // Facility type
  const types = ['revolving', 'term loan', 'bridge', 'acquisition'];
  for (const type of types) {
    if (text.toLowerCase().includes(type)) {
      terms.facilityType = type.charAt(0).toUpperCase() + type.slice(1);
      break;
    }
  }
  
  return terms;
}

function extractCovenants(text) {
  const covenants = { financial: [], informational: [], negative: [] };
  
  // Financial covenants
  const financialPatterns = [
    /leverage\s+ratio[^.]*(?:not\s+(?:to\s+)?exceed|less\s+than)[^.]*[\d.:]+/gi,
    /interest\s+cover(?:age)?\s+ratio[^.]*(?:at\s+least|minimum)[^.]*[\d.:]+/gi,
    /(?:minimum|maximum)\s+(?:net\s+worth|liquidity)[^.]*[\d,£$€]+/gi
  ];
  
  financialPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (covenants.financial.length < 10) {
        covenants.financial.push(match[0].trim());
      }
    }
  });
  
  // Informational
  const infoPatterns = [
    /(?:deliver|provide|furnish)[^.]*(?:financial\s+statements|accounts|reports)[^.]{0,100}/gi
  ];
  
  infoPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (covenants.informational.length < 10) {
        covenants.informational.push(match[0].trim());
      }
    }
  });
  
  // Negative
  const negativeKeywords = ['shall not', 'will not', 'must not', 'prohibited from'];
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
  
  const datePatterns = [
    /(?:maturity|termination|expiry)\s+date[:\s]*(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/gi,
    /(?:effective|closing)\s+date[:\s]*(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/gi
  ];
  
  datePatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      dates.push({ type: match[0].split(/date/i)[0].trim(), date: match[1] });
    }
  });
  
  return dates;
}

function extractESG(text) {
  const esg = {
    hasESGProvisions: /esg|sustainability|environmental|green/i.test(text),
    sustainabilityLinked: /sustainability-linked|sustainability linked/i.test(text),
    greenLoan: /green loan|green facility/i.test(text),
    kpis: [],
    marginRatchet: /margin adjustment|margin ratchet/i.test(text)
  };
  
  const kpiPattern = /(?:kpi|key\s+performance\s+indicator)[:\s]*([^.]+)/gi;
  const matches = text.matchAll(kpiPattern);
  for (const match of matches) {
    if (match[1] && match[1].length > 5 && esg.kpis.length < 5) {
      esg.kpis.push(match[1].trim());
    }
  }
  
  return esg;
}

function extractRisks(text) {
  const risks = [];
  
  if (/cross-default|cross default/i.test(text)) {
    risks.push({ type: 'Cross-Default', severity: 'high', description: 'Cross-default provisions detected' });
  }
  
  if (/material adverse change|mac clause/i.test(text)) {
    risks.push({ type: 'MAC Clause', severity: 'medium', description: 'Material Adverse Change clause present' });
  }
  
  if (/change of control/i.test(text)) {
    risks.push({ type: 'Change of Control', severity: 'medium', description: 'Change of control provisions detected' });
  }
  
  if (/acceleration/i.test(text) && /event of default/i.test(text)) {
    risks.push({ type: 'Acceleration', severity: 'high', description: 'Acceleration upon default provisions' });
  }
  
  return risks;
}

function extractObligations(text) {
  const obligations = [];
  
  const pattern = /(?:shall|must|will)\s+(?:deliver|provide|furnish)[^.]*(?:within|by|no\s+later\s+than)\s+(\d+)\s*(?:days?|business\s+days?)/gi;
  const matches = text.matchAll(pattern);
  
  for (const match of matches) {
    if (obligations.length < 10) {
      obligations.push({
        type: 'Reporting',
        description: match[0].trim(),
        deadline: match[1] + ' days'
      });
    }
  }
  
  return obligations;
}

// API Routes
app.post('/api/analyze', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const data = await pdfParse(req.file.buffer);
    let analysis = analyzeLoanDocument(data.text);
    
    analysis.fileName = req.file.originalname;
    analysis.pageCount = data.numpages;
    
    // AI enhancement (optional)
    analysis = await enhanceWithAI(data.text, analysis);
    
    analyzedLoans.set(analysis.id, analysis);
    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

app.post('/api/analyze-text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });
    
    const maxLength = (process.env.MAX_TEXT_LENGTH_MB || 5) * 1024 * 1024;
    if (text.length > maxLength) {
      return res.status(400).json({ error: 'Text too long' });
    }
    
    let analysis = analyzeLoanDocument(text);
    analysis.fileName = 'Text Input';
    
    // AI enhancement (optional)
    analysis = await enhanceWithAI(text, analysis);
    
    analyzedLoans.set(analysis.id, analysis);
    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

app.get('/api/loans', (req, res) => {
  res.json(Array.from(analyzedLoans.values()));
});

app.get('/api/loans/:id', (req, res) => {
  const id = req.params.id.replace(/[^a-zA-Z0-9]/g, '');
  const loan = analyzedLoans.get(id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  res.json(loan);
});

app.get('/api/compare', (req, res) => {
  const ids = req.query.ids?.split(',').map(id => id.replace(/[^a-zA-Z0-9]/g, '')) || [];
  
  if (ids.length > 10) return res.status(400).json({ error: 'Maximum 10 loans' });
  if (ids.length < 2) return res.status(400).json({ error: 'Need at least 2 loans' });
  
  const loans = ids.map(id => analyzedLoans.get(id)).filter(Boolean);
  
  res.json({
    loans: loans.map(l => ({ id: l.id, name: l.fileName })),
    financialTerms: loans.map(l => l.financialTerms),
    covenantCounts: loans.map(l => ({
      financial: l.covenants.financial.length,
      informational: l.covenants.informational.length,
      negative: l.covenants.negative.length
    })),
    riskComparison: loans.map(l => l.riskFlags),
    esgComparison: loans.map(l => l.esgClauses)
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 LoanLens running on http://localhost:${PORT}`);
  console.log(`📊 AI Enhancement: ${process.env.USE_AI_ENHANCEMENT === 'true' ? 'Enabled' : 'Disabled'}`);
});
