/**
 * ============================================================================
 * CASH-FLOW RISK ASSESSMENT MODEL - INTERACTIVE ENGINE
 * ============================================================================
 *
 * METHODOLOGY:
 * This script implements a multi-criteria risk assessment engine for loan
 * approval decisions. It processes customer data through four evaluation
 * dimensions and produces automated lending decisions.
 *
 * DATA FLOW:
 * 1. Data ingestion (CSV upload or sample generation)
 * 2. Data validation and normalization
 * 3. Risk score calculation per criterion
 * 4. Combined score computation
 * 5. Decision derivation based on business rules
 * 6. Visualization and reporting
 *
 * ASSUMPTIONS:
 * - All scores normalized to 0-100 scale
 * - Higher scores = lower risk (better performance)
 * - Equal weighting (25% each) for combined score
 * - Conservative lending thresholds
 *
 * VERSION: 1.0
 * ============================================================================
 */

// ============================================================================
// GLOBAL STATE
// ============================================================================

/**
 * Application state management
 * Centralized state for data and UI state
 */
const AppState = {
    // Raw customer data from upload/sample
    rawData: [],

    // Processed data with calculated fields
    processedData: [],

    // Filtered data for table display
    filteredData: [],

    // Current sort configuration
    sortConfig: {
        column: null,
        direction: 'asc'
    },

    // Pagination state
    pagination: {
        currentPage: 1,
        itemsPerPage: 15
    },

    // Chart instances for updates
    charts: {}
};

// ============================================================================
// RISK ASSESSMENT CONFIGURATION
// ============================================================================

/**
 * Risk level thresholds for individual criteria
 * These define the boundaries for categorizing scores
 *
 * SCORING METHODOLOGY:
 * - Low Risk (70-100): Excellent performance, minimal concern
 * - Moderate Risk (50-69): Acceptable but monitor closely
 * - Elevated Risk (35-49): Significant concerns, needs attention
 * - High Risk (0-34): Critical issues, high default probability
 */
const RISK_THRESHOLDS = {
    low: 70,        // >= 70: Low Risk
    moderate: 50,   // 50-69: Moderate Risk
    elevated: 35,   // 35-49: Elevated Risk
    high: 0         // 0-34: High Risk
};

/**
 * Color palette for visualizations
 * Consistent across all charts and UI elements
 */
const COLORS = {
    low: '#17ca60',
    moderate: '#0156f4',
    elevated: '#f5a623',
    high: '#e53e3e',
    background: '#00052e',
    turquoise: '#01CFFB'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Determines risk level based on score
 *
 * @param {number} score - Score value (0-100)
 * @returns {string} Risk level category
 *
 * LOGIC:
 * Uses predefined thresholds to categorize scores.
 * Conservative approach - borderline cases fall to higher risk.
 */
function getRiskLevel(score) {
    if (score >= RISK_THRESHOLDS.low) return 'Low Risk';
    if (score >= RISK_THRESHOLDS.moderate) return 'Moderate Risk';
    if (score >= RISK_THRESHOLDS.elevated) return 'Elevated Risk';
    return 'High Risk';
}

/**
 * Determines risk category for a single criterion
 * Used for decision logic evaluation
 *
 * @param {number} score - Score value (0-100)
 * @returns {string} Short risk category
 */
function getCriteriaRisk(score) {
    if (score >= RISK_THRESHOLDS.low) return 'low';
    if (score >= RISK_THRESHOLDS.moderate) return 'moderate';
    if (score >= RISK_THRESHOLDS.elevated) return 'elevated';
    return 'high';
}

/**
 * Determines lending decision based on multi-criteria analysis
 *
 * @param {Object} customer - Customer data with all scores
 * @returns {string} Decision: Auto Approve, Manual Review, Elevated Risk, Auto Deny
 *
 * DECISION LOGIC:
 *
 * AUTO-DENY conditions (any of these triggers denial):
 * - Any criterion is High Risk
 * - Two or more criteria are Elevated Risk
 * - Elevated Risk in affordability + all others Moderate
 *
 * AUTO-APPROVE conditions (all must be met):
 * - All criteria Low Risk, OR
 * - 2+ criteria Low Risk, remainder Moderate
 *
 * ELEVATED RISK:
 * - Single Elevated Risk criterion (except affordability with all moderate)
 *
 * MANUAL REVIEW:
 * - All other cases require human underwriter assessment
 */
function determineDecision(customer) {
    const risks = {
        transaction: getCriteriaRisk(customer.transaction_history),
        affordability: getCriteriaRisk(customer.affordability),
        employment: getCriteriaRisk(customer.employment),
        behavior: getCriteriaRisk(customer.behavior)
    };

    const riskCounts = {
        low: 0,
        moderate: 0,
        elevated: 0,
        high: 0
    };

    // Count risk levels
    Object.values(risks).forEach(risk => {
        riskCounts[risk]++;
    });

    // AUTO-DENY: Any High Risk criterion
    if (riskCounts.high > 0) {
        return 'Auto Deny';
    }

    // AUTO-DENY: Two or more Elevated Risk
    if (riskCounts.elevated >= 2) {
        return 'Auto Deny';
    }

    // AUTO-DENY: Elevated affordability + 3 Moderate
    if (risks.affordability === 'elevated' && riskCounts.moderate === 3) {
        return 'Auto Deny';
    }

    // AUTO-APPROVE: All Low Risk
    if (riskCounts.low === 4) {
        return 'Auto Approve';
    }

    // AUTO-APPROVE: 2+ Low Risk, rest Moderate
    if (riskCounts.low >= 2 && riskCounts.elevated === 0) {
        return 'Auto Approve';
    }

    // ELEVATED RISK: Single Elevated criterion
    if (riskCounts.elevated === 1) {
        return 'Elevated Risk';
    }

    // MANUAL REVIEW: All other cases
    return 'Manual Review';
}

/**
 * Calculates combined risk score
 *
 * @param {Object} customer - Customer data with all scores
 * @returns {number} Average score across all criteria
 *
 * METHODOLOGY:
 * Simple arithmetic mean with equal weighting.
 * Each criterion contributes 25% to the final score.
 */
function calculateCombinedScore(customer) {
    return (
        customer.transaction_history +
        customer.affordability +
        customer.employment +
        customer.behavior
    ) / 4;
}

// ============================================================================
// DATA GENERATION
// ============================================================================

/**
 * Generates sample customer data for demonstration
 *
 * @param {number} count - Number of customers to generate
 * @returns {Array} Array of customer objects
 *
 * METHODOLOGY:
 * Creates realistic distribution of customers across risk levels.
 * Uses weighted random generation to simulate real-world patterns:
 * - ~30% Low Risk
 * - ~40% Moderate Risk
 * - ~20% Elevated Risk
 * - ~10% High Risk
 */
function generateSampleData(count = 100) {
    const data = [];

    for (let i = 1; i <= count; i++) {
        // Generate customer ID with padding
        const customerId = `CUST-${String(i).padStart(4, '0')}`;

        // Determine customer profile (for realistic distribution)
        const profile = getRandomProfile();

        // Generate scores based on profile
        const customer = {
            customer_id: customerId,
            transaction_history: generateScore(profile, 'transaction'),
            affordability: generateScore(profile, 'affordability'),
            employment: generateScore(profile, 'employment'),
            behavior: generateScore(profile, 'behavior')
        };

        data.push(customer);
    }

    return data;
}

/**
 * Determines random customer profile for score generation
 *
 * @returns {string} Profile type: excellent, good, fair, poor
 *
 * DISTRIBUTION:
 * Weighted to create realistic portfolio composition
 */
function getRandomProfile() {
    const rand = Math.random();
    if (rand < 0.30) return 'excellent';
    if (rand < 0.70) return 'good';
    if (rand < 0.90) return 'fair';
    return 'poor';
}

/**
 * Generates score based on profile and criterion
 *
 * @param {string} profile - Customer profile type
 * @param {string} criterion - Scoring criterion
 * @returns {number} Generated score (0-100)
 *
 * METHODOLOGY:
 * Uses normal distribution around profile-specific mean.
 * Adds slight variation between criteria for realism.
 */
function generateScore(profile, criterion) {
    const baseRanges = {
        excellent: { min: 70, max: 100 },
        good: { min: 50, max: 85 },
        fair: { min: 30, max: 65 },
        poor: { min: 10, max: 45 }
    };

    // Add criterion-specific variation
    const variation = {
        transaction: 0,
        affordability: -5,  // Generally lower
        employment: 5,      // Generally higher
        behavior: 0
    };

    const range = baseRanges[profile];
    let score = Math.floor(
        Math.random() * (range.max - range.min + 1) + range.min
    );

    // Apply criterion variation
    score = Math.max(0, Math.min(100, score + (variation[criterion] || 0)));

    // Add random noise
    score += Math.floor(Math.random() * 11) - 5;

    return Math.max(0, Math.min(100, score));
}

// ============================================================================
// DATA PROCESSING
// ============================================================================

/**
 * Processes raw data to add calculated fields
 *
 * @param {Array} rawData - Raw customer data
 * @returns {Array} Processed data with risk levels and decisions
 *
 * DATA TRANSFORMATION:
 * 1. Calculate combined score
 * 2. Determine overall risk level
 * 3. Apply decision logic
 * 4. Add metadata for visualization
 */
function processData(rawData) {
    return rawData.map(customer => {
        const combinedScore = calculateCombinedScore(customer);
        const riskLevel = getRiskLevel(combinedScore);
        const decision = determineDecision(customer);

        return {
            ...customer,
            combined_score: Math.round(combinedScore * 10) / 10,
            risk_level: riskLevel,
            decision: decision
        };
    });
}

// ============================================================================
// UI UPDATES
// ============================================================================

/**
 * Updates all UI components with current data
 */
function updateUI() {
    updateSummaryCards();
    updateInsights();
    updateCharts();
    updateTable();
    updateCustomerSelector();

    // Enable export button
    document.getElementById('exportBtn').disabled = AppState.processedData.length === 0;
    document.getElementById('clearData').disabled = AppState.processedData.length === 0;
}

/**
 * Updates summary cards with decision counts
 *
 * VISUALIZATION:
 * Animated counters and progress bars show portfolio composition
 */
function updateSummaryCards() {
    const data = AppState.processedData;
    const total = data.length;

    // Count decisions
    const counts = {
        approve: data.filter(d => d.decision === 'Auto Approve').length,
        review: data.filter(d => d.decision === 'Manual Review').length,
        elevated: data.filter(d => d.decision === 'Elevated Risk').length,
        deny: data.filter(d => d.decision === 'Auto Deny').length
    };

    // Update values with animation
    animateCounter('autoApprove', counts.approve);
    animateCounter('manualReview', counts.review);
    animateCounter('elevatedRisk', counts.elevated);
    animateCounter('autoDeny', counts.deny);
    animateCounter('totalCustomers', total);

    // Update progress bars
    if (total > 0) {
        document.getElementById('approveBar').style.width = `${(counts.approve / total) * 100}%`;
        document.getElementById('reviewBar').style.width = `${(counts.review / total) * 100}%`;
        document.getElementById('elevatedBar').style.width = `${(counts.elevated / total) * 100}%`;
        document.getElementById('denyBar').style.width = `${(counts.deny / total) * 100}%`;
    }
}

/**
 * Animates counter from current value to target
 *
 * @param {string} elementId - Element ID to update
 * @param {number} target - Target value
 */
function animateCounter(elementId, target) {
    const element = document.getElementById(elementId);
    const start = parseInt(element.textContent) || 0;
    const duration = 1000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (target - start) * eased);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

/**
 * Generates and displays insights from data analysis
 *
 * INSIGHT GENERATION LOGIC:
 * 1. Portfolio health assessment
 * 2. Red flag identification
 * 3. Criterion-specific analysis
 * 4. Trend detection
 */
function updateInsights() {
    const container = document.getElementById('insightsContainer');
    const data = AppState.processedData;

    if (data.length === 0) {
        container.innerHTML = `
            <div class="insight-placeholder">
                <span class="placeholder-icon">📊</span>
                <p>Upload data to generate insights...</p>
            </div>
        `;
        return;
    }

    const insights = [];
    const total = data.length;

    // Calculate percentages
    const approvalRate = (data.filter(d => d.decision === 'Auto Approve').length / total * 100).toFixed(1);
    const denyRate = (data.filter(d => d.decision === 'Auto Deny').length / total * 100).toFixed(1);
    const reviewRate = (data.filter(d => d.decision === 'Manual Review' || d.decision === 'Elevated Risk').length / total * 100).toFixed(1);

    // Insight 1: Overall portfolio health
    if (approvalRate >= 50) {
        insights.push({
            type: 'positive',
            icon: '✅',
            title: 'Strong Portfolio Health',
            description: `${approvalRate}% of customers qualify for auto-approval, indicating a healthy loan portfolio.`
        });
    } else if (denyRate >= 30) {
        insights.push({
            type: 'negative',
            icon: '🚨',
            title: 'High Denial Rate Alert',
            description: `${denyRate}% of customers are auto-denied. Consider reviewing acquisition channels.`
        });
    }

    // Insight 2: Manual review workload
    if (reviewRate >= 30) {
        insights.push({
            type: 'warning',
            icon: '⚠️',
            title: 'High Manual Review Volume',
            description: `${reviewRate}% of applications require manual review. This may impact processing times.`
        });
    }

    // Insight 3: Criterion analysis
    const criteriaStats = analyzeCriteria(data);
    const weakestCriterion = criteriaStats.reduce((a, b) => a.avgScore < b.avgScore ? a : b);

    if (weakestCriterion.avgScore < 60) {
        insights.push({
            type: 'warning',
            icon: '📉',
            title: `Weak ${weakestCriterion.name} Scores`,
            description: `Average ${weakestCriterion.name.toLowerCase()} score is ${weakestCriterion.avgScore.toFixed(1)}. This criterion is dragging down approvals.`
        });
    }

    // Insight 4: High risk concentration
    const highRiskTransactions = data.filter(d => getCriteriaRisk(d.transaction_history) === 'high').length;
    if (highRiskTransactions / total > 0.15) {
        insights.push({
            type: 'negative',
            icon: '🔴',
            title: 'Transaction History Red Flag',
            description: `${(highRiskTransactions / total * 100).toFixed(1)}% of customers have insufficient banking history.`
        });
    }

    // Insight 5: Behavioral concerns
    const behaviorIssues = data.filter(d => getCriteriaRisk(d.behavior) === 'high' || getCriteriaRisk(d.behavior) === 'elevated').length;
    if (behaviorIssues / total > 0.2) {
        insights.push({
            type: 'negative',
            icon: '⚡',
            title: 'Behavioral Risk Concentration',
            description: `${(behaviorIssues / total * 100).toFixed(1)}% show elevated behavioral risk (stop payments, ACH returns).`
        });
    }

    // Default insight if no issues
    if (insights.length === 0) {
        insights.push({
            type: 'positive',
            icon: '✨',
            title: 'Balanced Risk Profile',
            description: 'The portfolio shows well-distributed risk across all criteria with no major concerns.'
        });
    }

    // Render insights
    container.innerHTML = insights.map((insight, index) => `
        <div class="insight-item insight-${insight.type}" style="animation-delay: ${index * 0.1}s">
            <div class="insight-icon">${insight.icon}</div>
            <div class="insight-content">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-description">${insight.description}</div>
            </div>
        </div>
    `).join('');
}

/**
 * Analyzes criteria scores for insights
 *
 * @param {Array} data - Processed customer data
 * @returns {Array} Statistics per criterion
 */
function analyzeCriteria(data) {
    const criteria = ['transaction_history', 'affordability', 'employment', 'behavior'];
    const names = ['Transaction History', 'Affordability', 'Employment', 'Behavior'];

    return criteria.map((criterion, index) => {
        const scores = data.map(d => d[criterion]);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        return {
            key: criterion,
            name: names[index],
            avgScore: avgScore
        };
    });
}

// ============================================================================
// CHART RENDERING
// ============================================================================

/**
 * Updates all charts with current data
 *
 * CHART TYPES:
 * 1. Pie/Donut - Decision distribution
 * 2. Grouped Bar - Risk by criteria
 * 3. Histogram - Score distribution
 * 4. Radar - Individual customer profile
 * 5. Heatmap - Portfolio overview
 */
function updateCharts() {
    if (AppState.processedData.length === 0) return;

    renderRiskDistributionChart();
    renderCriteriaBreakdownChart();
    renderScoreDistributionChart();
    renderRadarChart('all');
    renderHeatmapChart();
}

/**
 * Renders risk distribution pie chart
 *
 * VISUALIZATION LOGIC:
 * Donut chart showing percentage of each decision type.
 * Color-coded to match risk level colors.
 */
function renderRiskDistributionChart() {
    const data = AppState.processedData;

    const counts = {
        'Auto Approve': data.filter(d => d.decision === 'Auto Approve').length,
        'Manual Review': data.filter(d => d.decision === 'Manual Review').length,
        'Elevated Risk': data.filter(d => d.decision === 'Elevated Risk').length,
        'Auto Deny': data.filter(d => d.decision === 'Auto Deny').length
    };

    const plotData = [{
        values: Object.values(counts),
        labels: Object.keys(counts),
        type: 'pie',
        hole: 0.5,
        marker: {
            colors: [COLORS.low, COLORS.moderate, COLORS.elevated, COLORS.high]
        },
        textinfo: 'percent+label',
        textposition: 'outside',
        automargin: true,
        hovertemplate: '%{label}<br>Count: %{value}<br>Percentage: %{percent}<extra></extra>'
    }];

    const layout = {
        showlegend: true,
        legend: {
            orientation: 'h',
            y: -0.1
        },
        margin: { t: 20, b: 60, l: 20, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('riskDistributionChart', plotData, layout, config);
}

/**
 * Renders criteria breakdown grouped bar chart
 *
 * VISUALIZATION LOGIC:
 * Shows distribution of risk levels within each criterion.
 * Helps identify which criteria cause most issues.
 */
function renderCriteriaBreakdownChart() {
    const data = AppState.processedData;
    const criteria = ['transaction_history', 'affordability', 'employment', 'behavior'];
    const labels = ['Transaction', 'Affordability', 'Employment', 'Behavior'];

    // Count risk levels per criterion
    const riskLevels = ['Low Risk', 'Moderate Risk', 'Elevated Risk', 'High Risk'];
    const colors = [COLORS.low, COLORS.moderate, COLORS.elevated, COLORS.high];

    const traces = riskLevels.map((level, levelIndex) => {
        const counts = criteria.map(criterion => {
            return data.filter(d => getRiskLevel(d[criterion]) === level).length;
        });

        return {
            name: level,
            x: labels,
            y: counts,
            type: 'bar',
            marker: {
                color: colors[levelIndex]
            },
            hovertemplate: '%{x}<br>' + level + ': %{y}<extra></extra>'
        };
    });

    const layout = {
        barmode: 'group',
        showlegend: true,
        legend: {
            orientation: 'h',
            y: -0.2
        },
        margin: { t: 20, b: 80, l: 50, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        yaxis: {
            title: 'Count',
            gridcolor: 'rgba(0,0,0,0.1)'
        },
        xaxis: {
            tickangle: 0
        }
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('criteriaBreakdownChart', traces, layout, config);
}

/**
 * Renders combined score distribution histogram
 *
 * VISUALIZATION LOGIC:
 * Shows spread of combined scores with threshold lines.
 * Helps identify clustering and boundary cases.
 */
function renderScoreDistributionChart() {
    const data = AppState.processedData;
    const scores = data.map(d => d.combined_score);

    const plotData = [{
        x: scores,
        type: 'histogram',
        nbinsx: 20,
        marker: {
            color: COLORS.turquoise,
            line: {
                color: 'white',
                width: 1
            }
        },
        hovertemplate: 'Score: %{x}<br>Count: %{y}<extra></extra>'
    }];

    const layout = {
        margin: { t: 20, b: 50, l: 50, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: {
            title: 'Combined Score',
            range: [0, 100],
            gridcolor: 'rgba(0,0,0,0.1)'
        },
        yaxis: {
            title: 'Count',
            gridcolor: 'rgba(0,0,0,0.1)'
        },
        shapes: [
            // Threshold lines
            {
                type: 'line',
                x0: 70, x1: 70,
                y0: 0, y1: 1,
                yref: 'paper',
                line: { color: COLORS.low, width: 2, dash: 'dash' }
            },
            {
                type: 'line',
                x0: 50, x1: 50,
                y0: 0, y1: 1,
                yref: 'paper',
                line: { color: COLORS.moderate, width: 2, dash: 'dash' }
            },
            {
                type: 'line',
                x0: 35, x1: 35,
                y0: 0, y1: 1,
                yref: 'paper',
                line: { color: COLORS.elevated, width: 2, dash: 'dash' }
            }
        ],
        annotations: [
            { x: 70, y: 1, yref: 'paper', text: 'Low', showarrow: false, yanchor: 'bottom' },
            { x: 50, y: 1, yref: 'paper', text: 'Moderate', showarrow: false, yanchor: 'bottom' },
            { x: 35, y: 1, yref: 'paper', text: 'Elevated', showarrow: false, yanchor: 'bottom' }
        ]
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('scoreDistributionChart', plotData, layout, config);
}

/**
 * Renders radar chart for customer risk profile
 *
 * @param {string} customerId - Customer ID or 'all' for average
 *
 * VISUALIZATION LOGIC:
 * Spider/radar chart showing scores across all four criteria.
 * Useful for identifying specific weak areas per customer.
 */
function renderRadarChart(customerId) {
    const data = AppState.processedData;

    let values;
    let title;

    if (customerId === 'all') {
        // Calculate averages
        values = [
            data.reduce((sum, d) => sum + d.transaction_history, 0) / data.length,
            data.reduce((sum, d) => sum + d.affordability, 0) / data.length,
            data.reduce((sum, d) => sum + d.employment, 0) / data.length,
            data.reduce((sum, d) => sum + d.behavior, 0) / data.length
        ];
        title = 'Portfolio Average';
    } else {
        const customer = data.find(d => d.customer_id === customerId);
        if (!customer) return;

        values = [
            customer.transaction_history,
            customer.affordability,
            customer.employment,
            customer.behavior
        ];
        title = customerId;
    }

    // Close the polygon
    values.push(values[0]);

    const plotData = [{
        type: 'scatterpolar',
        r: values,
        theta: ['Transaction', 'Affordability', 'Employment', 'Behavior', 'Transaction'],
        fill: 'toself',
        fillcolor: 'rgba(1, 207, 251, 0.3)',
        line: {
            color: COLORS.turquoise,
            width: 2
        },
        marker: {
            size: 8,
            color: COLORS.turquoise
        },
        name: title,
        hovertemplate: '%{theta}: %{r:.1f}<extra></extra>'
    }];

    const layout = {
        polar: {
            radialaxis: {
                visible: true,
                range: [0, 100],
                gridcolor: 'rgba(0,0,0,0.1)'
            },
            angularaxis: {
                gridcolor: 'rgba(0,0,0,0.1)'
            }
        },
        showlegend: false,
        margin: { t: 30, b: 30, l: 60, r: 60 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('radarChart', plotData, layout, config);
}

/**
 * Renders heatmap of all customer risk profiles
 *
 * VISUALIZATION LOGIC:
 * Matrix visualization with customers as rows, criteria as columns.
 * Color intensity indicates risk level (red = high risk).
 * Limited to 50 customers for readability.
 */
function renderHeatmapChart() {
    const data = AppState.processedData.slice(0, 50); // Limit for readability

    const z = data.map(d => [
        d.transaction_history,
        d.affordability,
        d.employment,
        d.behavior
    ]);

    const plotData = [{
        z: z,
        x: ['Transaction', 'Affordability', 'Employment', 'Behavior'],
        y: data.map(d => d.customer_id),
        type: 'heatmap',
        colorscale: [
            [0, COLORS.high],
            [0.35, COLORS.elevated],
            [0.5, COLORS.moderate],
            [0.7, COLORS.low],
            [1, '#90EE90']
        ],
        showscale: true,
        colorbar: {
            title: 'Score',
            titleside: 'right'
        },
        hovertemplate: 'Customer: %{y}<br>Criterion: %{x}<br>Score: %{z}<extra></extra>'
    }];

    const layout = {
        margin: { t: 20, b: 50, l: 100, r: 80 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: {
            side: 'top'
        },
        yaxis: {
            autorange: 'reversed',
            tickfont: { size: 9 }
        }
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('heatmapChart', plotData, layout, config);
}

/**
 * Updates customer selector dropdown for radar chart
 */
function updateCustomerSelector() {
    const select = document.getElementById('customerSelect');
    const data = AppState.processedData;

    // Clear existing options except first
    select.innerHTML = '<option value="all">All Customers (Average)</option>';

    // Add customer options
    data.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.customer_id;
        option.textContent = `${customer.customer_id} (${customer.risk_level})`;
        select.appendChild(option);
    });
}

// ============================================================================
// TABLE RENDERING
// ============================================================================

/**
 * Updates data table with filtering and pagination
 */
function updateTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const riskFilter = document.getElementById('filterRisk').value;

    // Filter data
    AppState.filteredData = AppState.processedData.filter(customer => {
        const matchesSearch = customer.customer_id.toLowerCase().includes(searchTerm);
        const matchesRisk = riskFilter === 'all' || customer.risk_level === riskFilter;
        return matchesSearch && matchesRisk;
    });

    // Apply sorting
    if (AppState.sortConfig.column) {
        sortData();
    }

    // Render table
    renderTable();
    renderPagination();
}

/**
 * Sorts filtered data by current sort configuration
 */
function sortData() {
    const { column, direction } = AppState.sortConfig;

    AppState.filteredData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // Handle string comparison
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

/**
 * Renders table body with current page data
 */
function renderTable() {
    const tbody = document.getElementById('tableBody');
    const { currentPage, itemsPerPage } = AppState.pagination;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = AppState.filteredData.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="table-placeholder">
                    <span class="placeholder-icon">🔍</span>
                    <p>No records match your filters</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = pageData.map(customer => {
        const decisionClass = getDecisionClass(customer.decision);

        return `
            <tr>
                <td><strong>${customer.customer_id}</strong></td>
                <td><span class="score-cell ${getScoreClass(customer.transaction_history)}">${customer.transaction_history}</span></td>
                <td><span class="score-cell ${getScoreClass(customer.affordability)}">${customer.affordability}</span></td>
                <td><span class="score-cell ${getScoreClass(customer.employment)}">${customer.employment}</span></td>
                <td><span class="score-cell ${getScoreClass(customer.behavior)}">${customer.behavior}</span></td>
                <td><strong>${customer.combined_score}</strong></td>
                <td><span class="risk-badge ${getRiskBadgeClass(customer.risk_level)}">${customer.risk_level}</span></td>
                <td><span class="decision-badge ${decisionClass}">${customer.decision}</span></td>
            </tr>
        `;
    }).join('');

    // Update table info
    const total = AppState.filteredData.length;
    document.getElementById('tableInfo').textContent =
        `Showing ${start + 1}-${Math.min(end, total)} of ${total} records`;
}

/**
 * Gets CSS class for score cell based on risk level
 */
function getScoreClass(score) {
    const risk = getCriteriaRisk(score);
    return `score-${risk}`;
}

/**
 * Gets CSS class for risk badge
 */
function getRiskBadgeClass(riskLevel) {
    const mapping = {
        'Low Risk': 'low',
        'Moderate Risk': 'moderate',
        'Elevated Risk': 'elevated',
        'High Risk': 'high'
    };
    return mapping[riskLevel] || '';
}

/**
 * Gets CSS class for decision badge
 */
function getDecisionClass(decision) {
    const mapping = {
        'Auto Approve': 'decision-approve',
        'Manual Review': 'decision-review',
        'Elevated Risk': 'decision-elevated',
        'Auto Deny': 'decision-deny'
    };
    return mapping[decision] || '';
}

/**
 * Renders pagination controls
 */
function renderPagination() {
    const container = document.getElementById('pagination');
    const { currentPage, itemsPerPage } = AppState.pagination;
    const total = AppState.filteredData.length;
    const totalPages = Math.ceil(total / itemsPerPage);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Previous button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">‹</button>`;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 ||
            i === totalPages ||
            (i >= currentPage - 1 && i <= currentPage + 1)
        ) {
            html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<button disabled>...</button>';
        }
    }

    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">›</button>`;

    container.innerHTML = html;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Initializes all event listeners
 */
function initEventListeners() {
    // File upload
    const csvInput = document.getElementById('csvFile');
    const uploadArea = document.getElementById('uploadArea');

    csvInput.addEventListener('change', handleFileUpload);

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');

        const file = e.dataTransfer.files[0];
        if (file && file.type === 'text/csv') {
            processCSVFile(file);
        }
    });

    // Sample data button
    document.getElementById('loadSampleData').addEventListener('click', () => {
        AppState.rawData = generateSampleData(100);
        AppState.processedData = processData(AppState.rawData);
        updateUI();
        showUploadStatus('Successfully loaded 100 sample customers', 'success');
    });

    // Clear data button
    document.getElementById('clearData').addEventListener('click', () => {
        AppState.rawData = [];
        AppState.processedData = [];
        AppState.filteredData = [];
        updateUI();
        clearCharts();
        showUploadStatus('Data cleared', 'success');
    });

    // Search input
    document.getElementById('searchInput').addEventListener('input', () => {
        AppState.pagination.currentPage = 1;
        updateTable();
    });

    // Risk filter
    document.getElementById('filterRisk').addEventListener('change', () => {
        AppState.pagination.currentPage = 1;
        updateTable();
    });

    // Customer selector for radar chart
    document.getElementById('customerSelect').addEventListener('change', (e) => {
        renderRadarChart(e.target.value);
    });

    // Table sorting
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;

            // Toggle direction
            if (AppState.sortConfig.column === column) {
                AppState.sortConfig.direction =
                    AppState.sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                AppState.sortConfig.column = column;
                AppState.sortConfig.direction = 'asc';
            }

            // Update header styles
            document.querySelectorAll('.data-table th').forEach(header => {
                header.classList.remove('sorted', 'sorted-asc', 'sorted-desc');
            });

            th.classList.add('sorted', `sorted-${AppState.sortConfig.direction}`);

            updateTable();
        });
    });

    // Pagination
    document.getElementById('pagination').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && !e.target.disabled) {
            AppState.pagination.currentPage = parseInt(e.target.dataset.page);
            renderTable();
            renderPagination();
        }
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportData);

    // Scroll progress
    window.addEventListener('scroll', updateScrollProgress);

    // Mobile menu toggle
    document.getElementById('mobileMenuToggle').addEventListener('click', () => {
        document.querySelector('.main-nav').classList.toggle('active');
    });

    // Smooth scroll for nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').slice(1);
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }

            // Update active state
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Close mobile menu
            document.querySelector('.main-nav').classList.remove('active');
        });
    });
}

/**
 * Handles CSV file upload
 */
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        processCSVFile(file);
    }
}

/**
 * Processes uploaded CSV file
 *
 * @param {File} file - CSV file object
 *
 * DATA TRANSFORMATION:
 * 1. Parse CSV using PapaParse
 * 2. Validate required columns
 * 3. Convert string values to numbers
 * 4. Filter invalid rows
 */
function processCSVFile(file) {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const requiredColumns = ['customer_id', 'transaction_history', 'affordability', 'employment', 'behavior'];
            const columns = Object.keys(results.data[0] || {}).map(c => c.toLowerCase().trim());

            // Validate columns
            const missingColumns = requiredColumns.filter(col =>
                !columns.some(c => c.includes(col.replace('_', '')))
            );

            if (missingColumns.length > 0) {
                showUploadStatus(`Missing columns: ${missingColumns.join(', ')}`, 'error');
                return;
            }

            // Process data
            let invalidCount = 0;
            const data = results.data
                .map(row => {
                    // Normalize column names
                    const normalized = {};
                    Object.keys(row).forEach(key => {
                        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
                        normalized[normalizedKey] = row[key];
                    });

                    return {
                        customer_id: String(normalized.customer_id || '').trim(),
                        transaction_history: parseFloat(normalized.transaction_history) || 0,
                        affordability: parseFloat(normalized.affordability) || 0,
                        employment: parseFloat(normalized.employment) || 0,
                        behavior: parseFloat(normalized.behavior) || 0
                    };
                })
                .filter(row => {
                    // Validate row
                    const valid = row.customer_id &&
                        !isNaN(row.transaction_history) &&
                        !isNaN(row.affordability) &&
                        !isNaN(row.employment) &&
                        !isNaN(row.behavior);

                    if (!valid) invalidCount++;
                    return valid;
                });

            if (data.length === 0) {
                showUploadStatus('No valid data found in file', 'error');
                return;
            }

            AppState.rawData = data;
            AppState.processedData = processData(data);
            updateUI();

            let message = `Successfully loaded ${data.length} customers`;
            if (invalidCount > 0) {
                message += ` (${invalidCount} invalid rows skipped)`;
            }

            showUploadStatus(message, 'success');
        },
        error: (error) => {
            showUploadStatus(`Error parsing file: ${error.message}`, 'error');
        }
    });
}

/**
 * Shows upload status message
 */
function showUploadStatus(message, type) {
    const status = document.getElementById('uploadStatus');
    status.textContent = message;
    status.className = `upload-status ${type}`;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        status.textContent = '';
        status.className = 'upload-status';
    }, 5000);
}

/**
 * Clears all charts
 */
function clearCharts() {
    const chartIds = [
        'riskDistributionChart',
        'criteriaBreakdownChart',
        'scoreDistributionChart',
        'radarChart',
        'heatmapChart'
    ];

    chartIds.forEach(id => {
        Plotly.purge(id);
    });
}

/**
 * Updates scroll progress indicator
 */
function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;

    document.getElementById('scrollProgress').style.width = `${progress}%`;
}

/**
 * Exports filtered data as CSV
 */
function exportData() {
    const data = AppState.filteredData;

    if (data.length === 0) {
        alert('No data to export');
        return;
    }

    // Create CSV content
    const headers = [
        'Customer ID',
        'Transaction History',
        'Affordability',
        'Employment',
        'Behavior',
        'Combined Score',
        'Risk Level',
        'Decision'
    ];

    const rows = data.map(d => [
        d.customer_id,
        d.transaction_history,
        d.affordability,
        d.employment,
        d.behavior,
        d.combined_score,
        d.risk_level,
        d.decision
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk-assessment-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize application on DOM load
 */
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();

    // Reset bars
    document.querySelectorAll('.bar-fill').forEach(bar => {
        bar.style.width = '0%';
    });
});
