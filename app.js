/* app.js */

// Dashboard Global State
const state = {
  activeData: [],       // Contains all preloaded + user added records
  filteredData: [],     // Active subset after filtering/searching
  theme: 'dark',        // 'dark' or 'light'
  
  // Filtering states
  filters: {
    outcome: 'all',     // 'all', 'diabetic', 'nondiabetic'
    maxAge: 81,
    maxBmi: 67.1,
    maxGlucose: 199,
    minPregnancies: 'all' // 'all' or numeric min
  },
  
  // Table Pagination & Sorting
  table: {
    currentPage: 1,
    pageSize: 25,
    sortColumn: 'Age',
    sortDirection: 'desc',
    searchQuery: ''
  },
  
  // ApexChart Instances
  charts: {
    outcome: null,
    cohorts: null,
    scatter: null,
    pregnancy: null
  }
};

// Healthy medical thresholds (baseline guidelines)
const HEALTH_GUIDELINES = {
  glucoseNormalMax: 100,
  glucosePrediabetesMax: 125,
  bmiNormalMax: 24.9,
  bmiOverweightMax: 29.9
};

// Initialize Dashboard
document.addEventListener("DOMContentLoaded", () => {
  // Load initial dataset from DIABETES_DATA defined in data.js
  if (typeof DIABETES_DATA !== 'undefined') {
    state.activeData = [...DIABETES_DATA];
  } else {
    console.error("DIABETES_DATA is not defined. Please ensure data.js is loaded first.");
  }
  
  // Set up filters limits dynamically based on current data
  calculateDynamicFiltersBoundaries();
  
  // Sync page elements and setup listeners
  setupEventListeners();
  
  // Initial draw
  initCharts();
  updateDashboard();
  
  // Trigger initial icons render
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// Calculate min/max boundaries of the dataset to adjust slider filters
function calculateDynamicFiltersBoundaries() {
  if (state.activeData.length === 0) return;
  
  const ages = state.activeData.map(d => d.Age);
  const bmis = state.activeData.map(d => d.BMI);
  const glucoses = state.activeData.map(d => d.Glucose);
  
  const maxAge = Math.max(...ages);
  const maxBmi = Math.max(...bmis);
  const maxGlucose = Math.max(...glucoses);
  
  // Set sliders max values
  const ageSlider = document.getElementById('filter-age');
  const bmiSlider = document.getElementById('filter-bmi');
  const glucoseSlider = document.getElementById('filter-glucose');
  
  if (ageSlider) {
    ageSlider.max = maxAge;
    ageSlider.value = maxAge;
    state.filters.maxAge = maxAge;
    document.getElementById('val-age-display').innerText = maxAge;
  }
  if (bmiSlider) {
    bmiSlider.max = maxBmi;
    bmiSlider.value = maxBmi;
    state.filters.maxBmi = maxBmi;
    document.getElementById('val-bmi-display').innerText = maxBmi;
  }
  if (glucoseSlider) {
    glucoseSlider.max = maxGlucose;
    glucoseSlider.value = maxGlucose;
    state.filters.maxGlucose = maxGlucose;
    document.getElementById('val-glucose-display').innerText = maxGlucose;
  }
  
  document.getElementById('data-status').innerText = `${state.activeData.length.toLocaleString()} Records Active`;
}

// Attach listeners to interactive elements
function setupEventListeners() {
  // Theme Toggle
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }
  
  // Search Bar
  const searchInput = document.getElementById('search-patients');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.table.searchQuery = e.target.value.toLowerCase();
      state.table.currentPage = 1;
      updateDashboard(false); // Update metrics and table, skip full chart re-renders for search speed
    });
  }
  
  // Page Size Select
  const pageLimitSelect = document.getElementById('table-limit');
  if (pageLimitSelect) {
    pageLimitSelect.addEventListener('change', (e) => {
      state.table.pageSize = parseInt(e.target.value, 10);
      state.table.currentPage = 1;
      renderTable();
    });
  }
  
  // Outcome Filter Dropdown
  const outcomeFilter = document.getElementById('filter-outcome');
  if (outcomeFilter) {
    outcomeFilter.addEventListener('change', (e) => {
      state.filters.outcome = e.target.value;
      state.table.currentPage = 1;
      updateDashboard();
    });
  }
  
  // Pregnancies Filter Dropdown
  const pregFilter = document.getElementById('filter-pregnancies');
  if (pregFilter) {
    pregFilter.addEventListener('change', (e) => {
      state.filters.minPregnancies = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
      state.table.currentPage = 1;
      updateDashboard();
    });
  }
  
  // Sliders Change & Input listeners (using input for real-time response, change for chart redrawing)
  const ageSlider = document.getElementById('filter-age');
  if (ageSlider) {
    ageSlider.addEventListener('input', (e) => {
      document.getElementById('val-age-display').innerText = e.target.value;
      state.filters.maxAge = parseInt(e.target.value, 10);
      state.table.currentPage = 1;
      updateDashboard(false); // real-time visual feedback for table and KPIs
    });
    ageSlider.addEventListener('change', () => {
      updateDashboard(true); // redraw charts on drag-release
    });
  }
  
  const bmiSlider = document.getElementById('filter-bmi');
  if (bmiSlider) {
    bmiSlider.addEventListener('input', (e) => {
      document.getElementById('val-bmi-display').innerText = parseFloat(e.target.value).toFixed(1);
      state.filters.maxBmi = parseFloat(e.target.value);
      state.table.currentPage = 1;
      updateDashboard(false);
    });
    bmiSlider.addEventListener('change', () => {
      updateDashboard(true);
    });
  }
  
  const glucoseSlider = document.getElementById('filter-glucose');
  if (glucoseSlider) {
    glucoseSlider.addEventListener('input', (e) => {
      document.getElementById('val-glucose-display').innerText = e.target.value;
      state.filters.maxGlucose = parseInt(e.target.value, 10);
      state.table.currentPage = 1;
      updateDashboard(false);
    });
    glucoseSlider.addEventListener('change', () => {
      updateDashboard(true);
    });
  }
  
  // Reset Filters Button
  const resetBtn = document.getElementById('btn-reset-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetFilters);
  }
  
  // Add Patient Modal Control
  const addRecordBtn = document.getElementById('btn-add-record');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const cancelModalBtn = document.getElementById('btn-cancel-modal');
  const modalOverlay = document.getElementById('add-record-modal');
  
  if (addRecordBtn && modalOverlay) {
    addRecordBtn.addEventListener('click', () => {
      modalOverlay.classList.add('active');
    });
  }
  
  const hideModal = () => {
    if (modalOverlay) modalOverlay.classList.remove('active');
    document.getElementById('add-patient-form').reset();
  };
  
  if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideModal);
  
  // Modal Backdrop Click
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) hideModal();
    });
  }
  
  // Submit New Diagnostic Record Form
  const addForm = document.getElementById('add-patient-form');
  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const newRecord = {
        Pregnancies: parseInt(document.getElementById('input-pregnancies').value, 10),
        Glucose: parseInt(document.getElementById('input-glucose').value, 10),
        BloodPressure: parseInt(document.getElementById('input-bp').value, 10),
        SkinThickness: parseInt(document.getElementById('input-skin').value, 10),
        Insulin: parseInt(document.getElementById('input-insulin').value, 10),
        BMI: parseFloat(document.getElementById('input-bmi').value),
        DiabetesPedigreeFunction: parseFloat(document.getElementById('input-pedigree').value),
        Age: parseInt(document.getElementById('input-age').value, 10),
        Outcome: parseInt(document.getElementById('input-outcome').value, 10)
      };
      
      // Append to local dataset
      state.activeData.unshift(newRecord);
      
      // Notify components and reset
      calculateDynamicFiltersBoundaries();
      hideModal();
      updateDashboard(true);
      showToast("Diagnostic record added successfully!");
    });
  }
  
  // Sort Headers setup
  const tableHeaders = document.querySelectorAll('#patients-table th');
  tableHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const column = th.getAttribute('data-column');
      if (state.table.sortColumn === column) {
        state.table.sortDirection = state.table.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.table.sortColumn = column;
        state.table.sortDirection = 'asc';
      }
      
      // Reset headers sort icons
      tableHeaders.forEach(header => {
        const col = header.getAttribute('data-column');
        const iconDiv = document.getElementById(`sort-${col}`);
        if (iconDiv) {
          if (col === state.table.sortColumn) {
            iconDiv.innerHTML = state.table.sortDirection === 'asc' 
              ? '<i data-lucide="chevron-up" style="width: 14px; height: 14px;"></i>' 
              : '<i data-lucide="chevron-down" style="width: 14px; height: 14px;"></i>';
          } else {
            iconDiv.innerHTML = '<i data-lucide="chevrons-up-down" style="width: 14px; height: 14px;"></i>';
          }
        }
      });
      if (window.lucide) window.lucide.createIcons();
      
      sortDataset();
      renderTable();
    });
  });
  
  // Export CSV Button
  const exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportCSV);
  }
}

// Filter dataset according to active filters and query
function performDataFiltering() {
  state.filteredData = state.activeData.filter(d => {
    // 1. Outcome Filter
    if (state.filters.outcome === 'diabetic' && d.Outcome !== 1) return false;
    if (state.filters.outcome === 'nondiabetic' && d.Outcome !== 0) return false;
    
    // 2. Age Slider
    if (d.Age > state.filters.maxAge) return false;
    
    // 3. BMI Slider
    if (d.BMI > state.filters.maxBmi) return false;
    
    // 4. Glucose Slider
    if (d.Glucose > state.filters.maxGlucose) return false;
    
    // 5. Pregnancies
    if (state.filters.minPregnancies !== 'all' && d.Pregnancies < state.filters.minPregnancies) return false;
    
    // 6. Text Search Filter
    if (state.table.searchQuery) {
      const query = state.table.searchQuery;
      const matchAge = d.Age.toString().includes(query);
      const matchGlucose = d.Glucose.toString().includes(query);
      const matchBmi = d.BMI.toString().includes(query);
      const matchPregnancies = d.Pregnancies.toString().includes(query);
      const matchBP = d.BloodPressure.toString().includes(query);
      
      if (!matchAge && !matchGlucose && !matchBmi && !matchPregnancies && !matchBP) return false;
    }
    
    return true;
  });
}

// Sort dataset based on column and direction
function sortDataset() {
  const col = state.table.sortColumn;
  const dir = state.table.sortDirection === 'asc' ? 1 : -1;
  
  state.filteredData.sort((a, b) => {
    const valA = a[col];
    const valB = b[col];
    
    if (valA < valB) return -1 * dir;
    if (valA > valB) return 1 * dir;
    return 0;
  });
}

// Reset Filters to default values
function resetFilters() {
  document.getElementById('filter-outcome').value = 'all';
  document.getElementById('filter-pregnancies').value = 'all';
  
  state.filters.outcome = 'all';
  state.filters.minPregnancies = 'all';
  state.table.searchQuery = '';
  
  const searchInput = document.getElementById('search-patients');
  if (searchInput) searchInput.value = '';
  
  calculateDynamicFiltersBoundaries();
  updateDashboard(true);
  showToast("Filters reset to dataset defaults!");
}

// Update the full dashboard: calculates statistics, updates KPIs, dynamic text insights, table, and charts
function updateDashboard(redrawCharts = true) {
  // 1. Filter Data
  performDataFiltering();
  
  // 2. Sort Data
  sortDataset();
  
  // 3. Recalculate KPI cards
  calculateKPIs();
  
  // 4. Render HTML table
  renderTable();
  
  // 5. Compute Dynamic clinical findings
  extractInsights();
  
  // 6. Refresh charts visualization
  if (redrawCharts) {
    renderCharts();
  }
}

// Recalculates statistics and changes DOM displays for KPI Cards
function calculateKPIs() {
  const count = state.filteredData.length;
  document.getElementById('kpi-val-total').innerText = count.toLocaleString();
  
  if (count === 0) {
    document.getElementById('kpi-val-rate').innerText = '0%';
    document.getElementById('kpi-val-glucose').innerText = '0';
    document.getElementById('kpi-val-bmi').innerText = '0';
    document.getElementById('kpi-val-age').innerText = '0';
    
    // Reset KPI trend displays
    document.getElementById('kpi-val-rate-trend').className = 'kpi-trend neutral';
    document.getElementById('kpi-val-glucose-trend').className = 'kpi-trend neutral';
    document.getElementById('kpi-val-bmi-trend').className = 'kpi-trend neutral';
    return;
  }
  
  // Diabetic Prevalence
  const diabeticCount = state.filteredData.filter(d => d.Outcome === 1).length;
  const rate = (diabeticCount / count) * 100;
  document.getElementById('kpi-val-rate').innerText = `${rate.toFixed(1)}%`;
  
  const rateTrend = document.getElementById('kpi-val-rate-trend');
  const rateIcon = document.getElementById('kpi-val-rate-icon');
  const rateDesc = document.getElementById('kpi-val-rate-desc');
  
  if (rate > 40) {
    rateTrend.className = 'kpi-trend positive'; // Red/Warning alert
    if (rateIcon) rateIcon.setAttribute('data-lucide', 'alert-triangle');
    rateDesc.innerText = 'High Prevalence Risk';
  } else if (rate > 20) {
    rateTrend.className = 'kpi-trend neutral';
    if (rateIcon) rateIcon.setAttribute('data-lucide', 'activity');
    rateDesc.innerText = 'Moderate Prevalence';
  } else {
    rateTrend.className = 'kpi-trend negative'; // Clean/Safe (Green)
    if (rateIcon) rateIcon.setAttribute('data-lucide', 'check');
    rateDesc.innerText = 'Lower Cohort Risk';
  }
  
  // Average Glucose
  const avgGlucose = state.filteredData.reduce((sum, d) => sum + d.Glucose, 0) / count;
  document.getElementById('kpi-val-glucose').innerText = avgGlucose.toFixed(1);
  const glucoseTrend = document.getElementById('kpi-val-glucose-trend');
  const glucoseDesc = document.getElementById('kpi-val-glucose-desc');
  
  if (avgGlucose >= HEALTH_GUIDELINES.glucosePrediabetesMax) {
    glucoseTrend.className = 'kpi-trend positive';
    glucoseDesc.innerText = 'Elevated (Diabetic Range)';
  } else if (avgGlucose >= HEALTH_GUIDELINES.glucoseNormalMax) {
    glucoseTrend.className = 'kpi-trend neutral';
    glucoseDesc.innerText = 'Borderline (Pre-Diabetic)';
  } else {
    glucoseTrend.className = 'kpi-trend negative';
    glucoseDesc.innerText = 'Normal Glycemic Average';
  }
  
  // Average BMI
  const avgBmi = state.filteredData.reduce((sum, d) => sum + d.BMI, 0) / count;
  document.getElementById('kpi-val-bmi').innerText = avgBmi.toFixed(1);
  const bmiTrend = document.getElementById('kpi-val-bmi-trend');
  const bmiDesc = document.getElementById('kpi-val-bmi-desc');
  
  if (avgBmi >= 30.0) {
    bmiTrend.className = 'kpi-trend positive';
    bmiDesc.innerText = 'Clinically Obese (BMI ≥ 30)';
  } else if (avgBmi >= HEALTH_GUIDELINES.bmiNormalMax) {
    bmiTrend.className = 'kpi-trend neutral';
    bmiDesc.innerText = 'Overweight average';
  } else {
    bmiTrend.className = 'kpi-trend negative';
    bmiDesc.innerText = 'Healthy Weight Average';
  }
  
  // Average Age
  const avgAge = state.filteredData.reduce((sum, d) => sum + d.Age, 0) / count;
  document.getElementById('kpi-val-age').innerText = `${avgAge.toFixed(1)} yrs`;
  
  if (window.lucide) window.lucide.createIcons();
}

// Compute custom clinical analytical insights in real-time based on filters
function extractInsights() {
  const container = document.getElementById('insights-container');
  if (!container) return;
  
  const count = state.filteredData.length;
  if (count === 0) {
    container.innerHTML = '<li>No records matching the current filters. Reset filters to observe analytics.</li>';
    return;
  }
  
  const insights = [];
  
  // 1. Glucose Risk Observation
  const highGlucoseCohort = state.filteredData.filter(d => d.Glucose >= 140);
  if (highGlucoseCohort.length > 0) {
    const diabeticHighGlucose = highGlucoseCohort.filter(d => d.Outcome === 1).length;
    const highGlucoseRate = (diabeticHighGlucose / highGlucoseCohort.length) * 100;
    
    const healthyGlucoseCohort = state.filteredData.filter(d => d.Glucose < 140);
    const diabeticHealthyGlucose = healthyGlucoseCohort.filter(d => d.Outcome === 1).length;
    const healthyGlucoseRate = healthyGlucoseCohort.length > 0 ? (diabeticHealthyGlucose / healthyGlucoseCohort.length) * 100 : 0;
    
    const riskRatio = healthyGlucoseRate > 0 ? (highGlucoseRate / healthyGlucoseRate).toFixed(1) : 'N/A';
    
    insights.push(`<strong>Glucose Risk</strong>: Patients with post-load glucose level &ge; 140 mg/dL exhibit a diabetic rate of <span class="insights-highlight">${highGlucoseRate.toFixed(1)}%</span>. This makes them <span class="insights-highlight">${riskRatio}x</span> more likely to have diabetes compared to those below 140 mg/dL.`);
  }
  
  // 2. BMI Obesity Observation
  const obeseCohort = state.filteredData.filter(d => d.BMI >= 30);
  if (obeseCohort.length > 0) {
    const diabeticObese = obeseCohort.filter(d => d.Outcome === 1).length;
    const obeseRate = (diabeticObese / obeseCohort.length) * 100;
    
    const normalWeightCohort = state.filteredData.filter(d => d.BMI < 25);
    const diabeticNormal = normalWeightCohort.filter(d => d.Outcome === 1).length;
    const normalRate = normalWeightCohort.length > 0 ? (diabeticNormal / normalWeightCohort.length) * 100 : 0;
    
    insights.push(`<strong>Obesity Impact</strong>: Obese patients (BMI &ge; 30) have a diabetic prevalence of <span class="insights-highlight">${obeseRate.toFixed(1)}%</span>, while patients within normal weight ranges (BMI &lt; 25) have a rate of <span class="insights-highlight">${normalRate.toFixed(1)}%</span>.`);
  }
  
  // 3. Age cohort Observation
  const seniorCohort = state.filteredData.filter(d => d.Age >= 45);
  if (seniorCohort.length > 0) {
    const diabeticSeniors = seniorCohort.filter(d => d.Outcome === 1).length;
    const seniorRate = (diabeticSeniors / seniorCohort.length) * 100;
    
    const juniorCohort = state.filteredData.filter(d => d.Age < 35);
    const diabeticJuniors = juniorCohort.filter(d => d.Outcome === 1).length;
    const juniorRate = juniorCohort.length > 0 ? (diabeticJuniors / juniorCohort.length) * 100 : 0;
    
    insights.push(`<strong>Age Cohort Factor</strong>: Mature patients (Age &ge; 45) show a diabetic incidence of <span class="insights-highlight">${seniorRate.toFixed(1)}%</span>, compared to young adults (Age &lt; 35) who stand at <span class="insights-highlight">${juniorRate.toFixed(1)}%</span>.`);
  }
  
  // 4. Pregnancies Pregnancy Risk Observation
  const multiplePregCohort = state.filteredData.filter(d => d.Pregnancies >= 5);
  if (multiplePregCohort.length > 0) {
    const diabeticMultPreg = multiplePregCohort.filter(d => d.Outcome === 1).length;
    const multPregRate = (diabeticMultPreg / multiplePregCohort.length) * 100;
    
    insights.push(`<strong>Maternal History</strong>: Patients with 5 or more pregnancies exhibit a combined diabetic rate of <span class="insights-highlight">${multPregRate.toFixed(1)}%</span>, suggesting correlation with gestational indicators.`);
  }
  
  // Draw insights
  container.innerHTML = insights.map(ins => `<li>${ins}</li>`).join('');
}

// Renders the HTML table body and sets up pagination buttons
function renderTable() {
  const tbody = document.getElementById('patients-table-body');
  const tableInfo = document.getElementById('table-info');
  const pagination = document.getElementById('table-pagination');
  
  if (!tbody) return;
  
  const count = state.filteredData.length;
  if (count === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">No matching clinical records found. Try modifying filters.</td></tr>';
    if (tableInfo) tableInfo.innerText = "Showing 0 to 0 of 0 patients";
    if (pagination) pagination.innerHTML = "";
    return;
  }
  
  const pageSize = state.table.pageSize;
  const maxPages = Math.ceil(count / pageSize);
  
  // Boundary constraints
  if (state.table.currentPage > maxPages) state.table.currentPage = maxPages;
  if (state.table.currentPage < 1) state.table.currentPage = 1;
  
  const startIdx = (state.table.currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, count);
  
  const pageRows = state.filteredData.slice(startIdx, endIdx);
  
  // Populate Table Rows
  tbody.innerHTML = pageRows.map(d => {
    const outcomeBadge = d.Outcome === 1 
      ? '<span class="badge badge-danger">Diabetic</span>' 
      : '<span class="badge badge-success">Healthy</span>';
      
    return `
      <tr>
        <td>${d.Pregnancies}</td>
        <td>${d.Glucose} mg/dL</td>
        <td>${d.BloodPressure} mmHg</td>
        <td>${d.SkinThickness} mm</td>
        <td>${d.Insulin} &mu;U/ml</td>
        <td>${d.BMI}</td>
        <td>${d.DiabetesPedigreeFunction.toFixed(3)}</td>
        <td>${d.Age} yrs</td>
        <td>${outcomeBadge}</td>
      </tr>
    `;
  }).join('');
  
  // Update showing info
  if (tableInfo) {
    tableInfo.innerText = `Showing ${(startIdx + 1).toLocaleString()} to ${endIdx.toLocaleString()} of ${count.toLocaleString()} patients`;
  }
  
  // Render Pagination controls
  if (pagination) {
    let pagesHTML = '';
    
    // Previous Page Button
    pagesHTML += `
      <button class="page-btn" ${state.table.currentPage === 1 ? 'disabled' : ''} onclick="changeTablePage(${state.table.currentPage - 1})" aria-label="Previous Page">
        <i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i>
      </button>
    `;
    
    // Page Numbers (sliding window for clean display when page count is high)
    const delta = 1; // Number of pages to show before and after current page
    const startPage = Math.max(1, state.table.currentPage - delta);
    const endPage = Math.min(maxPages, state.table.currentPage + delta);
    
    if (startPage > 1) {
      pagesHTML += `<button class="page-btn" onclick="changeTablePage(1)">1</button>`;
      if (startPage > 2) {
        pagesHTML += `<span style="padding: 0 0.25rem; color: var(--text-muted);">...</span>`;
      }
    }
    
    for (let p = startPage; p <= endPage; p++) {
      pagesHTML += `
        <button class="page-btn ${state.table.currentPage === p ? 'active' : ''}" onclick="changeTablePage(${p})">
          ${p}
        </button>
      `;
    }
    
    if (endPage < maxPages) {
      if (endPage < maxPages - 1) {
        pagesHTML += `<span style="padding: 0 0.25rem; color: var(--text-muted);">...</span>`;
      }
      pagesHTML += `<button class="page-btn" onclick="changeTablePage(${maxPages})">${maxPages}</button>`;
    }
    
    // Next Page Button
    pagesHTML += `
      <button class="page-btn" ${state.table.currentPage === maxPages ? 'disabled' : ''} onclick="changeTablePage(${state.table.currentPage + 1})" aria-label="Next Page">
        <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
      </button>
    `;
    
    pagination.innerHTML = pagesHTML;
    if (window.lucide) window.lucide.createIcons();
  }
}

// Global page changer called from page buttons
window.changeTablePage = function(pageNumber) {
  state.table.currentPage = pageNumber;
  renderTable();
};

// Exports filtered data as CSV download
function exportCSV() {
  const count = state.filteredData.length;
  if (count === 0) {
    showToast("No records to export.");
    return;
  }
  
  const headers = ['Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age', 'Outcome'];
  
  let csvContent = headers.join(',') + '\n';
  
  state.filteredData.forEach(d => {
    const row = headers.map(h => d[h]);
    csvContent += row.join(',') + '\n';
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `diabetes_filtered_cohort_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
  showToast("CSV dataset downloaded successfully!");
}

// Show custom toast notification
function showToast(message) {
  const toast = document.getElementById('success-toast');
  const msgEl = document.getElementById('toast-message');
  
  if (toast && msgEl) {
    msgEl.innerText = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }
}

// Toggle light/dark dashboard styling variables and charts updates
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  html.setAttribute('data-theme', nextTheme);
  state.theme = nextTheme;
  
  // Toggle theme button icons
  const lightIcon = document.getElementById('theme-icon-light');
  const darkIcon = document.getElementById('theme-icon-dark');
  
  if (nextTheme === 'light') {
    if (lightIcon) lightIcon.style.display = 'block';
    if (darkIcon) darkIcon.style.display = 'none';
  } else {
    if (lightIcon) lightIcon.style.display = 'none';
    if (darkIcon) darkIcon.style.display = 'block';
  }
  
  // Refresh Chart Themes
  updateChartsTheme(nextTheme);
}

// Triggers charts update to switch dark/light mode grids
function updateChartsTheme(themeMode) {
  const chartThemeOptions = {
    theme: {
      mode: themeMode
    }
  };
  
  Object.values(state.charts).forEach(chartInstance => {
    if (chartInstance) {
      chartInstance.updateOptions(chartThemeOptions);
    }
  });
}

// Chart Declarations and Initializers
function initCharts() {
  const chartTheme = state.theme;
  
  // --- 1. Outcome Proportion Donut ---
  const donutOptions = {
    chart: {
      id: 'chart-outcome',
      type: 'donut',
      height: 320,
      fontFamily: 'Inter, sans-serif',
      background: 'transparent',
      toolbar: { show: false }
    },
    theme: { mode: chartTheme },
    colors: ['#10b981', '#ef4444'], // Green for Healthy, Red for Diabetic
    labels: ['Healthy (0)', 'Diabetic (1)'],
    series: [0, 0],
    dataLabels: { enabled: true },
    legend: {
      position: 'bottom',
      labels: { colors: 'var(--text-secondary)' }
    },
    stroke: { width: 0 },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            name: { show: true, fontSize: '13px', color: 'var(--text-secondary)' },
            value: { show: true, fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' },
            total: {
              show: true,
              label: 'Total',
              color: 'var(--text-secondary)',
              formatter: function (w) {
                return w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString();
              }
            }
          }
        }
      }
    }
  };
  
  state.charts.outcome = new ApexCharts(document.getElementById('chart-outcome-distribution'), donutOptions);
  state.charts.outcome.render();
  
  // --- 2. Cohort Health Indicators Grouped Bar ---
  const barOptions = {
    chart: {
      id: 'chart-cohorts',
      type: 'bar',
      height: 320,
      fontFamily: 'Inter, sans-serif',
      background: 'transparent',
      toolbar: { show: false }
    },
    theme: { mode: chartTheme },
    colors: ['#6366f1', '#06b6d4'],
    series: [
      { name: 'Avg Glucose', data: [] },
      { name: 'Avg BMI', data: [] }
    ],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4
      }
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: ['20-29', '30-39', '40-49', '50-59', '60-69', '70+'],
      labels: { style: { colors: 'var(--text-secondary)' } }
    },
    yaxis: {
      title: { text: 'Measurement Value', style: { color: 'var(--text-secondary)' } },
      labels: { style: { colors: 'var(--text-secondary)' } }
    },
    legend: {
      position: 'top',
      labels: { colors: 'var(--text-secondary)' }
    },
    fill: { opacity: 0.95 },
    tooltip: {
      y: {
        formatter: function (val, { seriesIndex }) {
          return val.toFixed(1) + (seriesIndex === 0 ? " mg/dL" : "");
        }
      }
    }
  };
  
  state.charts.cohorts = new ApexCharts(document.getElementById('chart-age-cohorts'), barOptions);
  state.charts.cohorts.render();
  
  // --- 3. Glucose vs Age Scatter Plot ---
  const scatterOptions = {
    chart: {
      id: 'chart-glucose-scatter-plot',
      type: 'scatter',
      height: 320,
      fontFamily: 'Inter, sans-serif',
      background: 'transparent',
      zoom: { enabled: true, type: 'xy' },
      toolbar: { show: true }
    },
    theme: { mode: chartTheme },
    colors: ['rgba(16, 185, 129, 0.7)', 'rgba(239, 68, 68, 0.7)'],
    series: [
      { name: 'Healthy (Outcome: 0)', data: [] },
      { name: 'Diabetic (Outcome: 1)', data: [] }
    ],
    xaxis: {
      title: { text: 'Age (Years)', style: { color: 'var(--text-secondary)' } },
      labels: { style: { colors: 'var(--text-secondary)' } },
      tickAmount: 10
    },
    yaxis: {
      title: { text: 'Glucose Concentration (mg/dL)', style: { color: 'var(--text-secondary)' } },
      labels: { style: { colors: 'var(--text-secondary)' } }
    },
    markers: {
      size: 4,
      strokeWidth: 0,
      hover: { size: 6 }
    },
    legend: {
      position: 'top',
      labels: { colors: 'var(--text-secondary)' }
    },
    tooltip: {
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const item = w.config.series[seriesIndex].data[dataPointIndex];
        const classification = seriesIndex === 0 ? "Healthy" : "Diabetic";
        return `
          <div style="padding: 0.75rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <div style="font-weight: 600; color: ${seriesIndex === 0 ? 'var(--success)' : 'var(--danger)'}; margin-bottom: 0.25rem;">${classification}</div>
            <div style="font-size: 0.8rem; color: var(--text-primary);">Age: <strong>${item[0]} yrs</strong></div>
            <div style="font-size: 0.8rem; color: var(--text-primary);">Glucose: <strong>${item[1]} mg/dL</strong></div>
          </div>
        `;
      }
    }
  };
  
  state.charts.scatter = new ApexCharts(document.getElementById('chart-glucose-scatter'), scatterOptions);
  state.charts.scatter.render();
  
  // --- 4. Diabetes Risk by Pregnancy Area Chart ---
  const pregnancyOptions = {
    chart: {
      id: 'chart-pregnancy',
      type: 'area',
      height: 320,
      fontFamily: 'Inter, sans-serif',
      background: 'transparent',
      toolbar: { show: false }
    },
    theme: { mode: chartTheme },
    colors: ['#a855f7'],
    stroke: { curve: 'smooth', width: 3 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      }
    },
    series: [{ name: 'Diabetes Prevalence', data: [] }],
    xaxis: {
      title: { text: 'Number of Pregnancies', style: { color: 'var(--text-secondary)' } },
      labels: { style: { colors: 'var(--text-secondary)' } }
    },
    yaxis: {
      title: { text: 'Diabetic Proportion (%)', style: { color: 'var(--text-secondary)' } },
      labels: {
        formatter: function (val) { return val.toFixed(0) + "%"; },
        style: { colors: 'var(--text-secondary)' }
      }
    },
    tooltip: {
      y: {
        formatter: function (val) { return val.toFixed(1) + "% Prevalence"; }
      }
    },
    markers: {
      size: 4,
      colors: ['#a855f7'],
      strokeColors: '#ffffff',
      strokeWidth: 2
    }
  };
  
  state.charts.pregnancy = new ApexCharts(document.getElementById('chart-pregnancy-risk'), pregnancyOptions);
  state.charts.pregnancy.render();
}

// Compute aggregate metrics and redraw chart graphics based on filtered subset
function renderCharts() {
  const data = state.filteredData;
  const count = data.length;
  
  // --- Update 1: Outcome Pie ---
  let healthyCount = 0;
  let diabeticCount = 0;
  data.forEach(d => {
    if (d.Outcome === 1) diabeticCount++;
    else healthyCount++;
  });
  
  if (state.charts.outcome) {
    state.charts.outcome.updateSeries([healthyCount, diabeticCount]);
  }
  
  // --- Update 2: Age Cohorts Bar ---
  // Buckets: 20-29, 30-39, 40-49, 50-59, 60-69, 70+
  const cohortBuckets = [
    { label: '20-29', min: 20, max: 29, glucoseSum: 0, bmiSum: 0, count: 0 },
    { label: '30-39', min: 30, max: 39, glucoseSum: 0, bmiSum: 0, count: 0 },
    { label: '40-49', min: 40, max: 49, glucoseSum: 0, bmiSum: 0, count: 0 },
    { label: '50-59', min: 50, max: 59, glucoseSum: 0, bmiSum: 0, count: 0 },
    { label: '60-69', min: 60, max: 69, glucoseSum: 0, bmiSum: 0, count: 0 },
    { label: '70+', min: 70, max: 120, glucoseSum: 0, bmiSum: 0, count: 0 }
  ];
  
  data.forEach(d => {
    const age = d.Age;
    const bucket = cohortBuckets.find(b => age >= b.min && age <= b.max);
    if (bucket) {
      bucket.glucoseSum += d.Glucose;
      bucket.bmiSum += d.BMI;
      bucket.count++;
    }
  });
  
  const barGlucoseData = cohortBuckets.map(b => b.count > 0 ? parseFloat((b.glucoseSum / b.count).toFixed(1)) : 0);
  const barBmiData = cohortBuckets.map(b => b.count > 0 ? parseFloat((b.bmiSum / b.count).toFixed(1)) : 0);
  
  if (state.charts.cohorts) {
    state.charts.cohorts.updateSeries([
      { name: 'Avg Glucose', data: barGlucoseData },
      { name: 'Avg BMI', data: barBmiData }
    ]);
  }
  
  // --- Update 3: Scatter Plot ---
  // To avoid DOM lag in rendering SVG charts, we sub-sample scatter plot when count is extremely high
  const maxPoints = 500;
  let sampleData = data;
  if (count > maxPoints) {
    // Stratified sampling to preserve outcome visual distribution
    const healthyList = data.filter(d => d.Outcome === 0);
    const diabeticList = data.filter(d => d.Outcome === 1);
    
    const healthySampleCount = Math.round(maxPoints * (healthyList.length / count));
    const diabeticSampleCount = maxPoints - healthySampleCount;
    
    const sampledHealthy = sampleArray(healthyList, healthySampleCount);
    const sampledDiabetic = sampleArray(diabeticList, diabeticSampleCount);
    
    sampleData = [...sampledHealthy, ...sampledDiabetic];
  }
  
  const scatterHealthy = [];
  const scatterDiabetic = [];
  
  sampleData.forEach(d => {
    // Array format: [X-value, Y-value] -> [Age, Glucose]
    if (d.Outcome === 1) {
      scatterDiabetic.push([d.Age, d.Glucose]);
    } else {
      scatterHealthy.push([d.Age, d.Glucose]);
    }
  });
  
  if (state.charts.scatter) {
    state.charts.scatter.updateSeries([
      { name: 'Healthy (Outcome: 0)', data: scatterHealthy },
      { name: 'Diabetic (Outcome: 1)', data: scatterDiabetic }
    ]);
  }
  
  // --- Update 4: Pregnancy Risk Line/Area ---
  // Pregnancy counts ranges from 0 to 17 in dataset. Let's group them: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10+
  const pregGroups = Array.from({ length: 11 }, (_, i) => ({
    label: i === 10 ? '10+' : i.toString(),
    pregnanciesMin: i,
    pregnanciesMax: i === 10 ? 25 : i,
    diabeticSum: 0,
    totalCount: 0
  }));
  
  data.forEach(d => {
    const p = d.Pregnancies;
    const group = pregGroups.find(g => p >= g.pregnanciesMin && p <= g.pregnanciesMax);
    if (group) {
      if (d.Outcome === 1) group.diabeticSum++;
      group.totalCount++;
    }
  });
  
  const pregCategories = pregGroups.map(g => g.label);
  const pregRateData = pregGroups.map(g => g.totalCount > 0 ? parseFloat(((g.diabeticSum / g.totalCount) * 100).toFixed(1)) : 0);
  
  if (state.charts.pregnancy) {
    state.charts.pregnancy.updateOptions({
      xaxis: { categories: pregCategories }
    });
    state.charts.pregnancy.updateSeries([
      { name: 'Diabetes Prevalence', data: pregRateData }
    ]);
  }
}

// Helper to select N evenly spaced items from an array
function sampleArray(array, sampleSize) {
  if (array.length <= sampleSize) return array;
  
  const step = array.length / sampleSize;
  const result = [];
  for (let i = 0; i < sampleSize; i++) {
    const index = Math.floor(i * step);
    if (array[index]) result.push(array[index]);
  }
  return result;
}
