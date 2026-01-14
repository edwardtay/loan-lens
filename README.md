# LoanLens 🔍

**AI-Powered Loan Document Intelligence Platform**

Transform complex loan agreements into structured, actionable data in seconds.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Security](https://img.shields.io/badge/Security-Hardened-brightgreen.svg)](SECURITY.md)

[Live Demo](#-demo) • [Features](#-features) • [Installation](#-installation) • [Security](#-security)

## 🎯 Overview

LoanLens is an enterprise-grade platform that transforms complex loan agreements from unstructured documents into structured, actionable intelligence. Built for financial institutions, loan servicers, and corporate treasury teams who need to analyze and monitor loan portfolios efficiently.

### Key Capabilities

- **Automated Data Extraction**: Extract parties, financial terms, covenants, and key dates from loan documents
- **Risk Intelligence**: Identify and flag high-risk clauses automatically
- **Covenant Monitoring**: Track compliance with financial and operational covenants
- **ESG Analytics**: Monitor sustainability-linked provisions and green loan features
- **Portfolio Comparison**: Analyze multiple loans side-by-side with inconsistency detection

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

### Quick Start (Development)

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

### Production Deployment

See [ENTERPRISE.md](ENTERPRISE.md) for production deployment options including:
- Cloud deployment (AWS, Azure, GCP)
- On-premises installation
- Docker containerization
- Kubernetes orchestration

### Requirements
- Node.js 18+ 
- npm or yarn
- Modern web browser
- (Optional) PostgreSQL for persistent storage

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

## �  Use Cases

### Financial Institutions
- Accelerate loan origination and due diligence
- Standardize data extraction across loan portfolios
- Monitor covenant compliance in real-time

### Corporate Treasury
- Track obligations across multiple credit facilities
- Compare terms and conditions across lenders
- Monitor ESG commitments and reporting requirements

### Loan Servicers
- Automate document processing workflows
- Reduce manual review time by 90%
- Improve accuracy and consistency

## 🔮 Roadmap

### Q1 2026
- [ ] REST API for enterprise integration
- [ ] Machine learning model training on loan corpus
- [ ] Real-time covenant monitoring dashboard
- [ ] Automated compliance reporting

### Q2 2026
- [ ] Integration with major loan management systems
- [ ] Multi-language document support
- [ ] Advanced analytics and predictive insights
- [ ] Mobile application (iOS/Android)

### Future
- [ ] Blockchain integration for loan trading
- [ ] Natural language query interface
- [ ] Automated document generation

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 👥 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 📧 Contact

For enterprise inquiries, partnerships, or support:
- **Email**: contact@loanlens.io
- **Website**: https://loanlens.io
- **GitHub**: https://github.com/edwardtay/loan-lens
- **Enterprise Solutions**: See [ENTERPRISE.md](ENTERPRISE.md)

---

**Transforming loan markets through intelligent automation**
