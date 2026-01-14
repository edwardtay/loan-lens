# LoanLens 🔍

**AI-Powered Loan Document Intelligence Platform**

*Built for the LMA Edge Hackathon 2026*

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

### Document Analysis
- Upload PDF loan documents or paste text directly
- AI extracts and structures key information automatically
- Visual dashboard displays all extracted data

### Loan Comparison
- Compare multiple loans side-by-side
- Identify differences in terms, covenants, and risk profiles
- Export comparison reports

### ESG Intelligence
- Detect sustainability-linked loan provisions
- Track green loan features
- Monitor ESG KPIs and margin ratchets

### Risk Detection
- Automatic flagging of high-risk clauses
- Cross-default provision detection
- Material Adverse Change (MAC) clause identification

## 🛠️ Technology Stack

- **Backend**: Node.js, Express
- **PDF Processing**: pdf-parse
- **Frontend**: Vanilla JavaScript, CSS3
- **Analysis**: Pattern-based NLP extraction

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/loanlens.git
cd loanlens

# Install dependencies
npm install

# Start the server
npm start
```

Visit `http://localhost:3000` in your browser.

## 🎮 Demo

Click "Load Demo Document" to see LoanLens analyze a sample facility agreement with:
- $500M revolving credit facility
- Term SOFR + 250bps pricing
- Financial covenants (leverage, interest coverage)
- Sustainability-linked provisions with carbon reduction KPIs

## 📊 Categories Addressed

This project addresses multiple LMA Edge Hackathon categories:

1. **Digital Loans**: Transforms unstructured loan documents into structured data
2. **Loan Documents**: Speeds up document analysis and term extraction
3. **Keeping Loans on Track**: Extracts covenants and obligations for monitoring
4. **Greener Lending**: Identifies and tracks ESG provisions and KPIs

## 🔮 Future Roadmap

- Integration with LMA standard templates
- Machine learning model training on real loan documents
- API for integration with loan management systems
- Real-time covenant monitoring and alerts
- Automated compliance reporting

## 👥 Team

Built with ❤️ for the LMA Edge Hackathon 2026

## 📄 License

MIT License
