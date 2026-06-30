# Diabetes Health Analytics Dashboard

An interactive, responsive, and visually rich web application for analyzing, filtering, and managing diabetes research data. Built with modern vanilla technologies and dynamic data visualizations.

## 🚀 Live Demo & Repository
- **GitHub Repository**: [https://github.com/Abhisheknath25/diabetes-dashboard](https://github.com/Abhisheknath25/diabetes-dashboard)

---

## ✨ Features

- **📊 Real-time Data Visualization**: Integrated with **ApexCharts** to display:
  - Outcome Distributions (Diabetic vs. Non-Diabetic ratio).
  - Age cohort distributions.
  - Scatter plots correlating BMI, Glucose levels, and outcomes.
  - Pregnancy correlation charts.
- **🔍 Advanced Multi-Filter Panel**: Refine the dataset dynamically by:
  - Diabetic Status (All, Diabetic, Non-Diabetic)
  - Max Age (via range slider)
  - Max BMI (via range slider)
  - Max Glucose (via range slider)
  - Minimum Pregnancies
- **➕ Dynamic Data Management**:
  - Live search and filter for all active patient records.
  - Sorting and pagination (up to 25 items per page) for quick navigation.
  - Interactive **Add Record** modal allowing the addition of new client diagnostics instantly on the fly.
- **🎨 Premium Dark & Light Themes**: Sleek glassmorphism look with customized dark/light mode toggles styled using Vanilla CSS variables.
- **⚡ Offline-ready Architecture**: Runs entirely client-side using a structured dataset loaded locally.

---

## 🛠️ Technology Stack

- **Structure**: Semantic [HTML5](https://developer.mozilla.org/en-US/docs/Web/HTML)
- **Styling**: Modern [CSS3](https://developer.mozilla.org/en-US/docs/Web/CSS) (CSS Variables, Flexbox, CSS Grid, Glassmorphism, and Transition Animations)
- **Logic**: Pure [Vanilla JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) (ES6+)
- **Icons**: [Lucide Icons](https://lucide.dev/)
- **Charts**: [ApexCharts](https://apexcharts.com/)

---

## 📂 File Structure

```
├── index.html       # Main HTML UI structure
├── styles.css       # Core design system and theme styles
├── app.js           # Dashboard state, filtration logic, event handlers & chart config
├── data.js          # Preloaded Pima Indians Diabetes database subset
└── README.md        # Documentation
```

---

## 🚀 How to Run Locally

Since this is a client-side web application, running it locally is extremely simple:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Abhisheknath25/diabetes-dashboard.git
   cd diabetes-dashboard
   ```

2. **Open in Browser**:
   - Double-click the `index.html` file to open it directly in any modern browser.
   - Alternatively, serve it using any local development server (e.g., Live Server extension in VS Code).

---

## 📈 Database Reference
The data structure matches standard diabetes diagnostics fields (similar to the Pima Indians Diabetes Dataset):
* **Pregnancies**: Number of times pregnant.
* **Glucose**: Plasma glucose concentration.
* **BloodPressure**: Diastolic blood pressure (mm Hg).
* **SkinThickness**: Triceps skin fold thickness (mm).
* **Insulin**: 2-Hour serum insulin (mu U/ml).
* **BMI**: Body mass index (weight in kg/(height in m)^2).
* **DiabetesPedigreeFunction**: Diabetes pedigree function score.
* **Age**: Age in years.
* **Outcome**: Class variable (0 for non-diabetic, 1 for diabetic).
