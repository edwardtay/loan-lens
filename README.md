# LoanLens 🔍

**AI-Powered Loan Document Intelligence Platform**

*Built for the LMA Edge Hackathon 2026*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Security](https://img.shields.io/badge/Security-Hardened-brightgreen.svg)](SECURITY.md)

[Live Demo](#-demo) • [Features](#-features) • [Installation](#-installation) • [Security](#-security)

## 🎯 Problem Statement

Loan agreements are complex, multi-hundred-page legal documents that exist as unstructured text rather than actionable data. This creates significant challenges:

- **Time-consuming analysis**: Manual review of loan documents takes hours or days
- **Inconsistent data extraction**: Different analysts may interpret terms differently
- **Difficult comparison**: Comparing terms across multiple loans is nearly impossible
- **Hidden risks**: Critical clauses like cross-defaults or MAC provisions can be missed
- **ESG tracking gaps**: Sustainability-linked provisions are hard to monitor

## 💡 Solution

LoanLens transforms loan documents into structured, actionable intelligence using AI-powered analysis. Upload a loan agreement and instantly extract:

- **Parties**: Borrowers, lenders, agents, guarantors
- **Financial Terms**: Principal amount, interest rates, margins, reference rates
- **Covenants**: Financial, informational, and negative covenants
- **Key Dates**: Maturity, effective dates, payment schedules
- **ESG Provisions**: Sustainability-linked features, KPIs, margin ratchets
- **Risk Flags**: Cross-defaults, MAC clauses, change of control provisions

## 🚀 Features

### 📄 Document Analysis
- Upload PDF loan documents or paste text directly
- AI extracts and structures key information automatically
- Visual dashboard displays all extracted data
- **No mocks or placeholders - real document processing**

### ⚖️ Covenant Compliance Calculator
- Input actual financial metrics (leverage ratio, interest coverage, net worth)
- Real-time breach detection with severity indicators
- Buffer calculations show how close you are to covenant breach
- Critical/Warning/Healthy status for each covenant

### 🔍 Loan Comparison
- Compare multiple loans side-by-side
- Identify differences in terms, covenants, and risk profiles
- **Automatic inconsistency detection**:
  - Currency mismatches
  - Reference rate variations
  - ESG provision differences
  - Risk profile analysis

### 🌱 ESG Intelligence
- Detect sustainability-linked loan provisions
- Track green loan features
- Monitor ESG KPIs and margin ratchets
- Compare ESG features across loan portfolio

### 🛡️ Risk Detection
- Automatic flagging of high-risk clauses
- Cross-default provision detection
- Material Adverse Change (MAC) clause identification
- Change of control triggers
- Acceleration clause detection

## 🛠️ Technology Stack

- **Backend**: Node.js, Express
- **PDF Processing**: pdf-parse
- **Frontend**: Vanilla JavaScript, CSS3
- **Analysis**: Pattern-based NLP extraction

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/edwardtay/loan-lens.git
cd loan-lens

# Install dependencies
npm install

# Start the server
npm start
```

Visit `http://localhost:3456` in your browser.

### Requirements
- Node.js 18+ 
- npm or yarn
- Modern web browser

## 🛡️ Security

LoanLens is built with security as a priority:

- ✅ **Zero vulnerabilities** (npm audit clean)
- ✅ Input validation and sanitization
- ✅ Rate limiting (100 requests/minute)
- ✅ Security headers (XSS, clickjacking protection)
- ✅ File type validation (PDF only)
- ✅ Size limits (50MB files, 5MB text)
- ✅ No data persistence (privacy-first)

See [SECURITY.md](SECURITY.md) for full details.

## 🎮 Demo

### Quick Start
1. Click **"Load Demo Document"** to analyze a sample $500M facility agreement
2. Explore the dashboard showing:
   - Financial terms (Term SOFR + 250bps)
   - 3 financial covenants (leverage, interest coverage, net worth)
   - 4 risk flags (cross-default, MAC, change of control, acceleration)
   - Sustainability-linked provisions with carbon reduction KPIs

### Try Covenant Compliance
1. After loading demo, navigate to the compliance calculator
2. Input sample metrics:
   - Leverage Ratio: 3.2:1
   - Interest Coverage: 4.5:1
   - Net Worth: $120M
3. See real-time compliance status with breach detection

### Compare Multiple Loans
1. Analyze 2+ documents (demo + upload your own)
2. Navigate to Compare view
3. Select loans to compare
4. View inconsistency alerts and side-by-side comparison

## 📊 Categories Addressed

This project addresses multiple LMA Edge Hackathon categories:

1. **Digital Loans**: Transforms unstructured loan documents into structured data
2. **Loan Documents**: Speeds up document analysis and term extraction
3. **Keeping Loans on Track**: Extracts covenants and obligations for monitoring
4. **Greener Lending**: Identifies and tracks ESG provisions and KPIs

## 🔮 Future Roadmap

- [ ] Integration with LMA standard templates
- [ ] Machine learning model training on real loan documents
- [ ] REST API for loan management system integration
- [ ] Real-time covenant monitoring and alerts
- [ ] Automated compliance reporting
- [ ] Multi-language support
- [ ] Blockchain integration for loan trading transparency
- [ ] Mobile application

## 🏆 LMA Edge Hackathon 2026

This project addresses multiple hackathon categories:

1. **Digital Loans** ⭐ - Transforms documents into structured data
2. **Loan Documents** - Speeds up analysis and term extraction
3. **Keeping Loans on Track** - Covenant monitoring and compliance
4. **Greener Lending** - ESG provision tracking and analysis

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

Built for the LMA Edge Hackathon 2026 - Reimagining the multi-trillion dollar loan market

---

**Made with ❤️ for the loan markets community**
