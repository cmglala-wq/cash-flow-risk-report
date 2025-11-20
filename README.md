# Cash-Flow Risk Assessment Model

Interactive web-based loan approval decision engine with multi-criteria risk assessment.

## Features

- **Multi-Criteria Risk Assessment**: Evaluates customers across 4 dimensions (Transaction History, Affordability, Employment, Behavior)
- **Automated Decisions**: Auto-approve, Manual Review, Elevated Risk, Auto-deny based on business rules
- **Interactive Charts**: Pie charts, bar charts, histograms, radar charts, and heatmaps using Plotly.js
- **Data Table**: Sortable, filterable, paginated view of all customer records
- **CSV Upload**: Import your own data or use sample data
- **Export**: Download results as CSV
- **Responsive Design**: Works on desktop and mobile
- **Dark Navy Theme**: Professional financial aesthetic

## Quick Start

1. Open `index.html` in a web browser
2. Click "Load Sample Data" to see the report with demo data
3. Or upload your own CSV file with columns: `customer_id, transaction_history, affordability, employment, behavior`

## GitHub Pages Deployment

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click **New Repository** (+ icon in top right)
3. Name it: `cash-flow-risk-report` (or your preferred name)
4. Set to **Public** (required for free GitHub Pages)
5. Click **Create repository**

### Step 2: Upload Files

**Option A: Using GitHub Web Interface**

1. In your new repository, click **Add file** > **Upload files**
2. Drag and drop all three files:
   - `index.html`
   - `style.css`
   - `script.js`
3. Add commit message: "Initial web report upload"
4. Click **Commit changes**

**Option B: Using Git Command Line**

```bash
# Navigate to the project folder
cd /Users/claudiamontengrogonzalez/cash-flow-risk-report

# Initialize git
git init

# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/cash-flow-risk-report.git

# Add all files
git add .

# Commit
git commit -m "Initial web report upload"

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** in the left sidebar (under "Code and automation")
4. Under "Source", select **Deploy from a branch**
5. Select **main** branch and **/ (root)** folder
6. Click **Save**

### Step 4: Access Your Report

1. Wait 1-2 minutes for deployment
2. Your report will be live at: `https://YOUR_USERNAME.github.io/cash-flow-risk-report/`
3. The URL will also appear in the Pages settings

## Data Format

### Required CSV Columns

| Column | Type | Range | Description |
|--------|------|-------|-------------|
| `customer_id` | String | - | Unique customer identifier |
| `transaction_history` | Number | 0-100 | Banking relationship score |
| `affordability` | Number | 0-100 | Payment affordability score |
| `employment` | Number | 0-100 | Employment stability score |
| `behavior` | Number | 0-100 | Financial behavior score |

### Sample CSV Format

```csv
customer_id,transaction_history,affordability,employment,behavior
CUST-0001,85,72,90,88
CUST-0002,45,60,55,70
CUST-0003,30,25,40,35
```

## Risk Level Thresholds

- **Low Risk**: Score ≥ 70
- **Moderate Risk**: Score 50-69
- **Elevated Risk**: Score 35-49
- **High Risk**: Score < 35

## Decision Logic

### Auto-Deny
- Any criterion is High Risk
- Two or more Elevated Risk criteria
- Elevated Risk in affordability + 3 Moderate Risk

### Auto-Approve
- All criteria Low Risk
- 2+ criteria Low Risk, remainder Moderate

### Manual Review
- One Elevated Risk (not affordability) + 3 Moderate
- Mixed moderate and low risk patterns

## Technology Stack

- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Custom properties, flexbox, grid, animations
- **JavaScript (ES6+)**: Vanilla JS, no frameworks
- **Plotly.js**: Interactive chart library
- **PapaParse**: CSV parsing library

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

MIT License - feel free to modify and use for your projects.

---

Generated with Claude Code
