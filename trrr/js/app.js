// State Management
let state = {
    transactions: [],
    charts: {},
    selectedMonths: {
        dashboard: new Date(),
        income: new Date(),
        expense: new Date()
    }
};

// DOM Elements
const navLinks = document.querySelectorAll('.nav-links li');
const pages = document.querySelectorAll('.page');
const incomeForm = document.getElementById('incomeForm');
const expenseForm = document.getElementById('expenseForm');
const incomeList = document.getElementById('incomeList');
const expenseList = document.getElementById('expenseList');
const recentTransactions = document.getElementById('recentTransactions');
const generateReportBtn = document.getElementById('generateReport');
const downloadCSVBtn = document.getElementById('downloadCSV');

// Month Selection Elements
const dashboardMonth = document.getElementById('dashboardMonth');
const incomeMonth = document.getElementById('incomeMonth');
const expenseMonth = document.getElementById('expenseMonth');

// Chart Options
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                padding: 20,
                font: {
                    size: 12
                }
            }
        },
        tooltip: {
            mode: 'index',
            intersect: false,
            padding: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#2c3e50',
            bodyColor: '#2c3e50',
            borderColor: '#ddd',
            borderWidth: 1,
            displayColors: true,
            callbacks: {
                label: function(context) {
                    return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                }
            }
        }
    },
    interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                callback: function(value) {
                    return formatCurrency(value);
                }
            }
        }
    }
};

// Navigation
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        const targetPage = link.getAttribute('data-page');
        navigateToPage(targetPage);
    });
});

function navigateToPage(pageId) {
    // Update active states
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        }
    });

    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === pageId) {
            page.classList.add('active');
        }
    });

    // Update charts and data based on the page
    updatePageData(pageId);
}

// Form Handlers
incomeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
        const transaction = {
            type: 'income',
            amount: parseFloat(document.getElementById('incomeAmount').value),
            category: document.getElementById('incomeCategory').value,
            date: document.getElementById('incomeDate').value,
            description: document.getElementById('incomeDescription').value,
            id: Date.now()
        };
        addTransaction(transaction);
        incomeForm.reset();
    } catch (error) {
        alert('Please fill in all fields correctly');
    }
});

expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
        const transaction = {
            type: 'expense',
            amount: parseFloat(document.getElementById('expenseAmount').value),
            category: document.getElementById('expenseCategory').value,
            date: document.getElementById('expenseDate').value,
            description: document.getElementById('expenseDescription').value,
            id: Date.now()
        };
        addTransaction(transaction);
        expenseForm.reset();
    } catch (error) {
        alert('Please fill in all fields correctly');
    }
});

// Transaction Management
function addTransaction(transaction) {
    if (!transaction.amount || transaction.amount <= 0) {
        throw new Error('Invalid amount');
    }
    state.transactions.push(transaction);
    saveToLocalStorage();
    updateAllData();
}

function deleteTransaction(id) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveToLocalStorage();
    updateAllData();
}

// Data Persistence
function saveToLocalStorage() {
    try {
        localStorage.setItem('xpensemate_transactions', JSON.stringify(state.transactions));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('xpensemate_transactions');
        if (saved) {
            state.transactions = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
}

// Data Updates
function updateAllData() {
    updateDashboard();
    updateTransactionLists();
    updateCharts();
}

function updateDashboard() {
    const selectedDate = state.selectedMonths.dashboard;
    let filteredTransactions = state.transactions;

    // Only filter by month if not showing all months
    if (selectedDate !== 'all') {
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth();

        filteredTransactions = state.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.getFullYear() === selectedYear && 
                   transactionDate.getMonth() === selectedMonth;
        });
    }

    const totalIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const netSavings = totalIncome - totalExpense;

    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('totalExpense').textContent = formatCurrency(totalExpense);
    document.getElementById('netSavings').textContent = formatCurrency(netSavings);
    document.getElementById('totalBalance').textContent = formatCurrency(totalIncome - totalExpense);
}

function updateTransactionLists() {
    const incomeTransactions = state.transactions.filter(t => t.type === 'income');
    const expenseTransactions = state.transactions.filter(t => t.type === 'expense');

    incomeList.innerHTML = renderTransactions(incomeTransactions);
    expenseList.innerHTML = renderTransactions(expenseTransactions);
    recentTransactions.innerHTML = renderRecentTransactions();
}

function renderTransactions(transactions) {
    if (!transactions.length) {
        return '<div class="no-transactions">No transactions found</div>';
    }
    return transactions.map(t => `
        <div class="transaction-item">
            <div class="transaction-info">
                <span class="transaction-category">${t.category}</span>
                <span class="transaction-description">${t.description}</span>
                <span class="transaction-date">${formatDate(t.date)}</span>
            </div>
            <div class="transaction-amount ${t.type}">
                ${formatCurrency(t.amount)}
            </div>
            <button onclick="deleteTransaction(${t.id})" class="btn btn-secondary">Delete</button>
        </div>
    `).join('');
}

function renderRecentTransactions() {
    const recent = [...state.transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    return renderTransactions(recent);
}

// Charts
function updateCharts() {
    try {
        updateIncomeExpenseChart();
        updateCategoryCharts();
        updateTrendCharts();
        updateForecastChart();
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

function updateIncomeExpenseChart() {
    const ctx = document.getElementById('incomeExpenseChart');
    if (!ctx) return;

    const monthlyData = getMonthlyData(state.selectedMonths.dashboard);

    if (state.charts.incomeExpense) {
        state.charts.incomeExpense.destroy();
    }

    state.charts.incomeExpense = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthlyData.labels,
            datasets: [
                {
                    label: 'Income',
                    data: monthlyData.income,
                    backgroundColor: '#27ae60',
                    borderColor: '#27ae60',
                    borderWidth: 1,
                    borderRadius: 5
                },
                {
                    label: 'Expenses',
                    data: monthlyData.expenses,
                    backgroundColor: '#e74c3c',
                    borderColor: '#e74c3c',
                    borderWidth: 1,
                    borderRadius: 5
                }
            ]
        },
        options: {
            ...chartOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function updateCategoryCharts() {
    const incomeCtx = document.getElementById('incomeCategoryChart');
    const expenseCtx = document.getElementById('expenseCategoryChart');
    if (!incomeCtx || !expenseCtx) return;

    const incomeData = getCategoryData('income', state.selectedMonths.income);
    const expenseData = getCategoryData('expense', state.selectedMonths.expense);

    if (state.charts.incomeCategory) {
        state.charts.incomeCategory.destroy();
    }
    if (state.charts.expenseCategory) {
        state.charts.expenseCategory.destroy();
    }

    const pieOptions = {
        ...chartOptions,
        plugins: {
            ...chartOptions.plugins,
            legend: {
                position: 'right',
                labels: {
                    padding: 20,
                    font: {
                        size: 12
                    }
                }
            }
        }
    };

    state.charts.incomeCategory = new Chart(incomeCtx, {
        type: 'pie',
        data: {
            labels: incomeData.labels,
            datasets: [{
                data: incomeData.data,
                backgroundColor: ['#27ae60', '#2ecc71', '#3498db', '#9b59b6'],
                borderWidth: 1
            }]
        },
        options: pieOptions
    });

    state.charts.expenseCategory = new Chart(expenseCtx, {
        type: 'pie',
        data: {
            labels: expenseData.labels,
            datasets: [{
                data: expenseData.data,
                backgroundColor: ['#e74c3c', '#c0392b', '#f39c12', '#d35400'],
                borderWidth: 1
            }]
        },
        options: pieOptions
    });
}

function updateTrendCharts() {
    const incomeTrendCtx = document.getElementById('incomeTrendChart');
    const expenseTrendCtx = document.getElementById('expenseTrendChart');
    if (!incomeTrendCtx || !expenseTrendCtx) return;

    const monthlyData = getMonthlyData(state.selectedMonths.income);

    if (state.charts.incomeTrend) {
        state.charts.incomeTrend.destroy();
    }
    if (state.charts.expenseTrend) {
        state.charts.expenseTrend.destroy();
    }

    const lineOptions = {
        ...chartOptions,
        plugins: {
            ...chartOptions.plugins,
            legend: {
                position: 'top',
                labels: {
                    padding: 10,
                    font: {
                        size: 12
                    }
                }
            }
        }
    };

    state.charts.incomeTrend = new Chart(incomeTrendCtx, {
        type: 'line',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Income Trend',
                data: monthlyData.income,
                borderColor: '#27ae60',
                backgroundColor: 'rgba(39, 174, 96, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
        options: lineOptions
    });

    state.charts.expenseTrend = new Chart(expenseTrendCtx, {
        type: 'line',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Expense Trend',
                data: monthlyData.expenses,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
        options: lineOptions
    });
}

function updateForecastChart() {
    const ctx = document.getElementById('forecastChart');
    if (!ctx) return;

    const forecastData = generateForecast();

    if (state.charts.forecast) {
        state.charts.forecast.destroy();
    }

    state.charts.forecast = new Chart(ctx, {
        type: 'line',
        data: {
            labels: forecastData.labels,
            datasets: [
                {
                    label: 'Projected Income',
                    data: forecastData.income,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.1,
                    fill: true
                },
                {
                    label: 'Projected Expenses',
                    data: forecastData.expenses,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.1,
                    fill: true
                }
            ]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                legend: {
                    position: 'top',
                    labels: {
                        padding: 10,
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// Data Processing
function calculateTotal(type) {
    return state.transactions
        .filter(t => t.type === type)
        .reduce((sum, t) => sum + t.amount, 0);
}

function getMonthlyData(selectedDate = null) {
    const months = {};
    const currentDate = selectedDate || new Date();
    const labels = [];
    const income = [];
    const expenses = [];

    // If showing all months, get data for all available months
    if (selectedDate === 'all') {
        const allDates = state.transactions.map(t => new Date(t.date));
        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));
        let currentMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

        while (currentMonth <= maxDate) {
            const monthKey = currentMonth.getFullYear() + '-' + String(currentMonth.getMonth() + 1).padStart(2, '0');
            months[monthKey] = { income: 0, expenses: 0 };
            labels.push(currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' }));
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
    } else {
        // Get 6 months before and including the selected month
        for (let i = 5; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            months[monthKey] = { income: 0, expenses: 0 };
            labels.push(date.toLocaleString('default', { month: 'short' }));
        }
    }

    // Calculate totals for each month
    state.transactions.forEach(t => {
        const transactionDate = new Date(t.date);
        const monthKey = transactionDate.getFullYear() + '-' + String(transactionDate.getMonth() + 1).padStart(2, '0');
        
        if (months[monthKey]) {
            if (t.type === 'income') {
                months[monthKey].income += t.amount;
            } else {
                months[monthKey].expenses += t.amount;
            }
        }
    });

    // Prepare data arrays
    Object.values(months).forEach(month => {
        income.push(month.income);
        expenses.push(month.expenses);
    });

    return { labels, income, expenses };
}

function getCategoryData(type, selectedDate = null) {
    const categories = {};
    const currentDate = selectedDate || new Date();
    
    let filteredTransactions = state.transactions.filter(t => t.type === type);

    // Filter by month only if not showing all months
    if (selectedDate !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.getMonth() === currentDate.getMonth() &&
                   transactionDate.getFullYear() === currentDate.getFullYear();
        });
    }

    filteredTransactions.forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    return {
        labels: Object.keys(categories),
        data: Object.values(categories)
    };
}

function generateForecast() {
    const monthlyData = getMonthlyData();
    const labels = [...monthlyData.labels, 'Next Month'];
    
    // Simple linear regression for forecasting
    const incomeSlope = calculateSlope(monthlyData.income);
    const expenseSlope = calculateSlope(monthlyData.expenses);
    
    const lastIncome = monthlyData.income[monthlyData.income.length - 1];
    const lastExpense = monthlyData.expenses[monthlyData.expenses.length - 1];
    
    const income = [...monthlyData.income, lastIncome + incomeSlope];
    const expenses = [...monthlyData.expenses, lastExpense + expenseSlope];

    return { labels, income, expenses };
}

function calculateSlope(data) {
    const n = data.length;
    const sumX = (n - 1) * n / 2;
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = data.reduce((sum, y, i) => sum + y * i, 0);
    const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Report Generation
function generateReport() {
    const reportContent = document.getElementById('reportContent');
    const selectedDate = state.selectedMonths.dashboard;
    const monthlyData = getMonthlyData(selectedDate);
    const totalIncome = monthlyData.income[monthlyData.income.length - 1];
    const totalExpense = monthlyData.expenses[monthlyData.expenses.length - 1];
    const netSavings = totalIncome - totalExpense;

    reportContent.innerHTML = `
        <div class="report-section">
            <h3>Financial Summary for ${selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <p>Total Income: ${formatCurrency(totalIncome)}</p>
            <p>Total Expenses: ${formatCurrency(totalExpense)}</p>
            <p>Net Savings: ${formatCurrency(netSavings)}</p>
        </div>
        <div class="report-section">
            <h3>Category Breakdown</h3>
            <div class="category-breakdown">
                ${renderCategoryBreakdown(selectedDate)}
            </div>
        </div>
        <div class="report-section">
            <h3>Monthly Analysis</h3>
            <div class="monthly-analysis">
                ${renderMonthlyAnalysis(monthlyData)}
            </div>
        </div>
    `;
}

function renderCategoryBreakdown(selectedDate) {
    const incomeData = getCategoryData('income', selectedDate);
    const expenseData = getCategoryData('expense', selectedDate);

    return `
        <div class="category-section">
            <h4>Income Categories</h4>
            ${incomeData.labels.length ? incomeData.labels.map((label, i) => `
                <div class="category-item">
                    <span>${label}</span>
                    <span>${formatCurrency(incomeData.data[i])}</span>
                </div>
            `).join('') : '<p>No income categories</p>'}
        </div>
        <div class="category-section">
            <h4>Expense Categories</h4>
            ${expenseData.labels.length ? expenseData.labels.map((label, i) => `
                <div class="category-item">
                    <span>${label}</span>
                    <span>${formatCurrency(expenseData.data[i])}</span>
                </div>
            `).join('') : '<p>No expense categories</p>'}
        </div>
    `;
}

function renderMonthlyAnalysis(monthlyData) {
    return monthlyData.labels.map((label, i) => `
        <div class="month-item">
            <h4>${label}</h4>
            <p>Income: ${formatCurrency(monthlyData.income[i])}</p>
            <p>Expenses: ${formatCurrency(monthlyData.expenses[i])}</p>
            <p>Net: ${formatCurrency(monthlyData.income[i] - monthlyData.expenses[i])}</p>
        </div>
    `).join('');
}

downloadCSVBtn.addEventListener('click', () => {
    try {
        const csv = generateCSV();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'xpensemate_report.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error generating CSV:', error);
        alert('Error generating CSV file');
    }
});

function generateCSV() {
    const selectedDate = state.selectedMonths.dashboard;
    const [year, month] = [selectedDate.getFullYear(), selectedDate.getMonth() + 1];
    
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
    const rows = state.transactions
        .filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.getFullYear() === year && 
                   transactionDate.getMonth() + 1 === month;
        })
        .map(t => [
            t.date,
            t.type,
            t.category,
            t.description,
            t.amount
        ]);

    return [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
}

// Page Data Updates
function updatePageData(pageId) {
    switch (pageId) {
        case 'dashboard':
            updateDashboard();
            updateIncomeExpenseChart();
            break;
        case 'income':
        case 'expense':
            updateTransactionLists();
            break;
        case 'income-summary':
            updateCategoryCharts();
            updateTrendCharts();
            break;
        case 'expense-summary':
            updateCategoryCharts();
            updateTrendCharts();
            break;
        case 'forecast':
            updateForecastChart();
            break;
        case 'report':
            generateReport();
            break;
    }
}

// Initialize Application
function init() {
    loadFromLocalStorage();
    initializeMonthSelectors();
    initializeFilters();
    updateAllData();
}

// Initialize Month Selectors
function initializeMonthSelectors() {
    const monthSelectors = [dashboardMonth, incomeMonth, expenseMonth];
    const currentDate = new Date();
    
    // Get unique months from transactions
    const uniqueMonths = [...new Set(state.transactions.map(t => {
        const date = new Date(t.date);
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    }))].sort().reverse();

    // Add current month if not present
    const currentMonthKey = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');
    if (!uniqueMonths.includes(currentMonthKey)) {
        uniqueMonths.unshift(currentMonthKey);
    }

    // Populate each selector
    monthSelectors.forEach(selector => {
        if (!selector) return;
        
        // Add "All Months" option first
        selector.innerHTML = `<option value="all">All Months</option>` + 
            uniqueMonths.map(monthKey => {
                const [year, month] = monthKey.split('-');
                const date = new Date(year, month - 1);
                return `<option value="${monthKey}">${date.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>`;
            }).join('');

        // Set initial value to current month
        selector.value = currentMonthKey;
    });

    // Add event listeners
    dashboardMonth.addEventListener('change', () => {
        if (dashboardMonth.value === 'all') {
            state.selectedMonths.dashboard = 'all';
        } else {
            const [year, month] = dashboardMonth.value.split('-');
            state.selectedMonths.dashboard = new Date(year, month - 1);
        }
        updateDashboard();
        updateIncomeExpenseChart();
    });

    incomeMonth.addEventListener('change', () => {
        if (incomeMonth.value === 'all') {
            state.selectedMonths.income = 'all';
        } else {
            const [year, month] = incomeMonth.value.split('-');
            state.selectedMonths.income = new Date(year, month - 1);
        }
        updateCategoryCharts();
        updateTrendCharts();
    });

    expenseMonth.addEventListener('change', () => {
        if (expenseMonth.value === 'all') {
            state.selectedMonths.expense = 'all';
        } else {
            const [year, month] = expenseMonth.value.split('-');
            state.selectedMonths.expense = new Date(year, month - 1);
        }
        updateCategoryCharts();
        updateTrendCharts();
    });
}

// Filter functionality
function initializeFilters() {
    // Date range toggle handlers
    ['income', 'expense'].forEach(type => {
        const dateSelect = document.getElementById(`${type}FilterDate`);
        const customRange = document.getElementById(`${type}CustomDateRange`);
        const customEnd = document.getElementById(`${type}CustomDateEnd`);

        dateSelect.addEventListener('change', () => {
            const isCustom = dateSelect.value === 'custom';
            customRange.style.display = isCustom ? 'block' : 'none';
            customEnd.style.display = isCustom ? 'block' : 'none';
        });

        // Apply filter button
        document.getElementById(`apply${type.charAt(0).toUpperCase() + type.slice(1)}Filter`)
            .addEventListener('click', () => applyFilter(type));

        // Reset filter button
        document.getElementById(`reset${type.charAt(0).toUpperCase() + type.slice(1)}Filter`)
            .addEventListener('click', () => resetFilter(type));
    });
}

function applyFilter(type) {
    const dateRange = document.getElementById(`${type}FilterDate`).value;
    const category = document.getElementById(`${type}FilterCategory`).value;
    const amountRange = document.getElementById(`${type}FilterAmount`).value;
    let startDate = null;
    let endDate = null;

    // Calculate date range
    if (dateRange === 'custom') {
        startDate = new Date(document.getElementById(`${type}FilterStartDate`).value);
        endDate = new Date(document.getElementById(`${type}FilterEndDate`).value);
    } else {
        const now = new Date();
        endDate = new Date();
        
        switch(dateRange) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'year':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            default:
                startDate = new Date(0); // Beginning of time
        }
    }

    // Filter transactions
    const filteredTransactions = state.transactions.filter(t => {
        if (t.type !== type) return false;
        
        const transactionDate = new Date(t.date);
        const amount = parseFloat(t.amount);

        // Date filter
        if (dateRange !== 'all' && (transactionDate < startDate || transactionDate > endDate)) {
            return false;
        }

        // Category filter
        if (category !== 'all' && t.category !== category) {
            return false;
        }

        // Amount filter
        if (amountRange !== 'all') {
            const [min, max] = amountRange.split('-').map(v => v.replace('+', ''));
            if (max) {
                if (amount < parseFloat(min) || amount > parseFloat(max)) return false;
            } else {
                if (amount < parseFloat(min)) return false;
            }
        }

        return true;
    });

    // Update the display
    const listElement = document.getElementById(`${type}List`);
    listElement.innerHTML = renderTransactions(filteredTransactions);
}

function resetFilter(type) {
    // Reset all filter inputs
    document.getElementById(`${type}FilterDate`).value = 'all';
    document.getElementById(`${type}FilterCategory`).value = 'all';
    document.getElementById(`${type}FilterAmount`).value = 'all';
    document.getElementById(`${type}CustomDateRange`).style.display = 'none';
    document.getElementById(`${type}CustomDateEnd`).style.display = 'none';
    
    // Show all transactions of the given type
    const transactions = state.transactions.filter(t => t.type === type);
    const listElement = document.getElementById(`${type}List`);
    listElement.innerHTML = renderTransactions(transactions);
}

// Start the application
init(); 
