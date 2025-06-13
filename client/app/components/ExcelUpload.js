'use client';

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import styles from './ExcelUpload.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function ExcelUpload() {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [savedDataTimestamp, setSavedDataTimestamp] = useState(null);
  const [isClient, setIsClient] = useState(false);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load data from localStorage on component mount
  useEffect(() => {
    if (!isClient) return;
    
    try {
      const savedData = localStorage.getItem('excelAnalysisData');
      const timestamp = localStorage.getItem('excelAnalysisTimestamp');
      
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setResult(parsedData);
          generateChartData(parsedData);
        } catch (parseError) {
          console.error('Error parsing saved data from localStorage:', parseError);
          // Clear corrupted data
          localStorage.removeItem('excelAnalysisData');
          localStorage.removeItem('excelAnalysisTimestamp');
        }
      }
      
      if (timestamp) {
        setSavedDataTimestamp(timestamp);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
      // Clear all localStorage data if there's any error
      localStorage.removeItem('excelAnalysisData');
      localStorage.removeItem('excelAnalysisTimestamp');
    }
  }, [isClient]);

  const saveToLocalStorage = (data) => {
    if (!isClient) return;
    
    try {
      localStorage.setItem('excelAnalysisData', JSON.stringify(data));
      const timestamp = new Date().toISOString();
      localStorage.setItem('excelAnalysisTimestamp', timestamp);
      setSavedDataTimestamp(timestamp);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const clearSavedData = () => {
    if (isClient) {
      localStorage.removeItem('excelAnalysisData');
      localStorage.removeItem('excelAnalysisTimestamp');
    }
    setResult(null);
    setChartData(null);
    setSavedDataTimestamp(null);
  };

  // Helper functions for external factors simulation
  const getSeasonalMultiplier = (month) => {
    // Seasonal patterns for fruit business (example)
    const seasonalFactors = [
      1.1, // Jan - New Year boost
      0.9, // Feb - Post-holiday dip
      1.0, // Mar - Normal
      1.2, // Apr - Spring season
      1.3, // May - Peak season
      1.1, // Jun - Summer
      0.8, // Jul - Mid-year slowdown
      0.9, // Aug - Back to school
      1.0, // Sep - Normal
      1.1, // Oct - Festival season
      1.2, // Nov - Holiday prep
      1.4  // Dec - Holiday peak
    ];
    return seasonalFactors[month] || 1.0;
  };

  const getEconomicFactor = (monthsAhead) => {
    // Simulate economic conditions impact (decreasing certainty over time)
    const baseEconomicGrowth = 1.02; // 2% growth assumption
    const uncertainty = monthsAhead * 0.01; // Increasing uncertainty
    return baseEconomicGrowth + (Math.random() - 0.5) * uncertainty;
  };

  const getHolidayFactor = (month) => {
    // Holiday impact by month
    const holidayImpact = {
      0: 1.15, // January - New Year
      1: 1.05, // February - Valentine's
      3: 1.10, // April - Songkran (Thailand)
      4: 1.08, // May - Labor Day
      11: 1.25 // December - Christmas/New Year
    };
    return holidayImpact[month] || 1.0;
  };

  const getRiskFactor = (monthsAhead) => {
    // Simulate geopolitical and market risks
    const baseRisk = 0.95; // 5% risk discount
    const timeRisk = Math.max(0.8, 1 - monthsAhead * 0.02); // Increasing risk over time
    return baseRisk * timeRisk;
  };

  const generateChartData = (analysisResult) => {
    if (!analysisResult?.analysis?.excel_data) return;

    const excelData = analysisResult.analysis.excel_data;
    const aiAnalysis = analysisResult.analysis.ai_analysis?.analysis_response;
    const charts = {};

    // Process each sheet to extract chart data
    Object.entries(excelData).forEach(([sheetName, sheetData]) => {
      if (!sheetData || sheetData.length === 0) return;

      // Handle TotalSales data
      if (sheetName === 'TotalSales' && sheetData.length > 0) {
        const salesData = sheetData.slice(-90); // Show last 90 days for better trend analysis
        charts.salesTrend = {
          labels: salesData.map(row => {
            const date = new Date(row.Date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }),
          datasets: [{
            label: 'Daily Sales (THB)',
            data: salesData.map(row => row['Daily Sales (THB)'] || 0),
            borderColor: '#4299e1',
            backgroundColor: 'rgba(66, 153, 225, 0.1)',
            tension: 0.4,
            fill: true,
          }]
        };

        // Generate monthly sales aggregation for better overview
        const monthlySales = {};
        salesData.forEach(row => {
          const date = new Date(row.Date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlySales[monthKey]) {
            monthlySales[monthKey] = { total: 0, count: 0, month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) };
          }
          monthlySales[monthKey].total += row['Daily Sales (THB)'] || 0;
          monthlySales[monthKey].count += 1;
        });

        const monthlyData = Object.values(monthlySales);
        charts.monthlySales = {
          labels: monthlyData.map(item => item.month),
          datasets: [{
            label: 'Monthly Sales (THB)',
            data: monthlyData.map(item => item.total),
            backgroundColor: 'rgba(72, 187, 120, 0.6)',
            borderColor: '#48bb78',
            borderWidth: 2,
          }]
        };
      }

      // Handle SalesForecast data if available
      if (sheetName === 'SalesForecast' && sheetData.length > 0) {
        const forecastData = sheetData.slice(-60); // Show last 60 days
        charts.salesForecast = {
          labels: forecastData.map(row => {
            const date = new Date(row.Date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }),
          datasets: [
            {
              label: 'Actual Sales (THB)',
              data: forecastData.map(row => row['Actual Sales (THB)'] || 0),
              borderColor: '#4299e1',
              backgroundColor: 'rgba(66, 153, 225, 0.1)',
              tension: 0.4,
            },
            {
              label: 'Predicted Sales (THB)',
              data: forecastData.map(row => row['Predicted Sales (THB)'] || 0),
              borderColor: '#ed8936',
              backgroundColor: 'rgba(237, 137, 54, 0.1)',
              tension: 0.4,
              borderDash: [5, 5],
            }
          ]
        };
      }

      // Handle RepeatPurchase data
      if (sheetName === 'RepeatPurchase' && sheetData.length > 0) {
        charts.repeatPurchase = {
          labels: sheetData.map(row => row.Product || 'Unknown'),
          datasets: [{
            label: 'Repeat Purchase Rate (%)',
            data: sheetData.map(row => row['Repeat Purchase Rate (%)'] || 0),
            backgroundColor: [
              '#4299e1',
              '#48bb78',
              '#ed8936',
              '#9f7aea',
              '#f56565',
              '#38b2ac',
              '#ecc94b'
            ],
            borderWidth: 2,
          }]
        };
      }

      // Handle StockLevels data
      if (sheetName === 'StockLevels' && sheetData.length > 0) {
        charts.stockLevels = {
          labels: sheetData.map(row => row.Product || 'Unknown'),
          datasets: [{
            label: 'Stock Level',
            data: sheetData.map(row => row['Stock Level'] || 0),
            backgroundColor: sheetData.map(row => {
              const anomaly = row['Anomaly Type'];
              if (anomaly === 'High') return '#f56565'; // Red for overstocked
              if (anomaly === 'Low') return '#ed8936';  // Orange for understocked
              return '#48bb78'; // Green for normal
            }),
            borderWidth: 2,
          }]
        };
      }
    });

    // Parse AI analysis for forecasting data if available
    let parsedAIAnalysis = null;
    if (typeof aiAnalysis === 'string') {
      try {
        let cleanedAnalysis = aiAnalysis.trim();
        if (cleanedAnalysis.startsWith('```json')) {
          cleanedAnalysis = cleanedAnalysis.replace(/```json\s*/, '').replace(/```\s*$/, '');
        }
        parsedAIAnalysis = JSON.parse(cleanedAnalysis);
      } catch (error) {
        console.warn('Could not parse AI analysis for chart generation:', error);
      }
    } else if (typeof aiAnalysis === 'object') {
      parsedAIAnalysis = aiAnalysis;
    }

    // Generate future predictions chart from AI analysis
    if (parsedAIAnalysis?.sales_forecasting?.monthly_forecasts) {
      const forecasts = parsedAIAnalysis.sales_forecasting.monthly_forecasts;
      charts.futurePredictions = {
        labels: forecasts.map(forecast => forecast.month),
        datasets: [
          {
            label: 'Most Likely (THB)',
            data: forecasts.map(forecast => forecast.most_likely),
            borderColor: '#4299e1',
            backgroundColor: 'rgba(66, 153, 225, 0.1)',
            tension: 0.4,
            fill: false,
          },
          {
            label: 'Best Case (THB)',
            data: forecasts.map(forecast => forecast.best_case),
            borderColor: '#48bb78',
            backgroundColor: 'rgba(72, 187, 120, 0.1)',
            tension: 0.4,
            fill: false,
            borderDash: [3, 3],
          },
          {
            label: 'Worst Case (THB)',
            data: forecasts.map(forecast => forecast.worst_case),
            borderColor: '#f56565',
            backgroundColor: 'rgba(245, 101, 101, 0.1)',
            tension: 0.4,
            fill: false,
            borderDash: [3, 3],
          }
        ]
      };
    }

    // Create combined historical and predicted sales overview chart
    const createCombinedSalesOverview = () => {
      const historicalData = [];
      const historicalLabels = [];
      const predictionData = [];
      const predictionLabels = [];

      // Get historical data from monthly sales
      if (charts.monthlySales) {
        historicalLabels.push(...charts.monthlySales.labels);
        historicalData.push(...charts.monthlySales.datasets[0].data);
      }

      // Get prediction data from AI analysis
      if (parsedAIAnalysis?.sales_forecasting?.monthly_forecasts) {
        const forecasts = parsedAIAnalysis.sales_forecasting.monthly_forecasts;
        predictionLabels.push(...forecasts.map(f => f.month));
        predictionData.push(...forecasts.map(f => f.most_likely));
      }

      // If we have both historical and prediction data, create the combined chart
      if (historicalData.length > 0 && predictionData.length > 0) {
        // Combine labels ensuring no overlap
        const allLabels = [...historicalLabels, ...predictionLabels];
        
        // Create datasets with proper alignment
        const historicalDataset = new Array(allLabels.length).fill(null);
        const predictionDataset = new Array(allLabels.length).fill(null);
        
        // Fill historical data
        historicalLabels.forEach((label, index) => {
          const globalIndex = allLabels.indexOf(label);
          if (globalIndex !== -1) {
            historicalDataset[globalIndex] = historicalData[index];
          }
        });

        // Fill prediction data
        predictionLabels.forEach((label, index) => {
          const globalIndex = allLabels.indexOf(label);
          if (globalIndex !== -1) {
            predictionDataset[globalIndex] = predictionData[index];
          }
        });

        // Create a bridge point where historical ends and prediction begins
        const lastHistoricalIndex = historicalLabels.length - 1;
        const firstPredictionIndex = historicalLabels.length;
        
        if (historicalDataset[lastHistoricalIndex] && predictionDataset[firstPredictionIndex]) {
          // Add the last historical point to the prediction dataset for smooth transition
          predictionDataset[lastHistoricalIndex] = historicalDataset[lastHistoricalIndex];
        }

        charts.salesOverview = {
          labels: allLabels,
          datasets: [
            {
              label: 'Historical Sales (THB)',
              data: historicalDataset,
              borderColor: '#4299e1',
              backgroundColor: 'rgba(66, 153, 225, 0.3)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#4299e1',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
            },
            {
              label: 'Predicted Sales (THB)',
              data: predictionDataset,
              borderColor: '#ed8936',
              backgroundColor: 'rgba(237, 137, 54, 0.1)',
              tension: 0.4,
              fill: false,
              borderDash: [8, 4],
              pointBackgroundColor: '#ed8936',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointStyle: 'triangle',
            }
          ]
        };
      }
      // If we only have historical data, create historical-only chart with future timeline
      else if (historicalData.length > 0) {
        // Generate future months for prediction placeholder
        const lastHistoricalDate = new Date();
        const futureMonths = [];
        for (let i = 1; i <= 12; i++) {
          const futureDate = new Date(lastHistoricalDate);
          futureDate.setMonth(futureDate.getMonth() + i);
          futureMonths.push(futureDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        }

        const allLabels = [...historicalLabels, ...futureMonths];
        const historicalDataset = [...historicalData, ...new Array(12).fill(null)];
        
        // Create basic prediction based on historical trend
        const avgGrowthRate = historicalData.length > 1 ? 
          (historicalData[historicalData.length - 1] / historicalData[0]) ** (1 / (historicalData.length - 1)) : 1.05;
        
        const predictionDataset = new Array(historicalData.length).fill(null);
        let lastValue = historicalData[historicalData.length - 1];
        
        // Add bridge point
        predictionDataset[historicalData.length - 1] = lastValue;
        
        // Generate predictions
        for (let i = 0; i < 12; i++) {
          lastValue *= avgGrowthRate;
          predictionDataset.push(lastValue);
        }

        charts.salesOverview = {
          labels: allLabels,
          datasets: [
            {
              label: 'Historical Sales (THB)',
              data: historicalDataset,
              borderColor: '#4299e1',
              backgroundColor: 'rgba(66, 153, 225, 0.3)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#4299e1',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
            },
            {
              label: 'Trend-Based Prediction (THB)',
              data: predictionDataset,
              borderColor: '#ed8936',
              backgroundColor: 'rgba(237, 137, 54, 0.1)',
              tension: 0.4,
              fill: false,
              borderDash: [8, 4],
              pointBackgroundColor: '#ed8936',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointStyle: 'triangle',
            }
          ]
        };
      }
    };

    // Generate the combined overview chart
    createCombinedSalesOverview();

    setChartData(charts);
    console.log('✅ Generated chart data:', charts);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          droppedFile.type === 'application/vnd.ms-excel' ||
          droppedFile.name.endsWith('.xlsx') || 
          droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          selectedFile.type === 'application/vnd.ms-excel' ||
          selectedFile.name.endsWith('.xlsx') || 
          selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  const analyzeFile = async () => {
    if (!file) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/ai/analyze-excel/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      saveToLocalStorage(data);
      generateChartData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setChartData(null);
    setSavedDataTimestamp(null);
    
    if (isClient) {
      localStorage.removeItem('excelAnalysisData');
      localStorage.removeItem('excelAnalysisTimestamp');
    }
  };

  const formatAnalysisContent = (content) => {
    if (!content) return '';
    
    try {
      // Check if it's a Python-style dictionary first
      if (typeof content === 'string' && content.startsWith("{'value':")) {
        try {
          // Convert Python-style dictionary to JSON
          const jsonStr = content
            .replace(/'/g, '"')           // Replace single quotes with double quotes
            .replace(/True/g, 'true')     // Replace Python True with JSON true
            .replace(/False/g, 'false')   // Replace Python False with JSON false
            .replace(/None/g, 'null');    // Replace Python None with JSON null
          
          const pythonDict = JSON.parse(jsonStr);
          
          // Extract the value field which should contain the actual analysis
          if (pythonDict && pythonDict.value) {
            let innerContent = pythonDict.value;
            
            // The inner content might have escaped characters - let's clean it up
            innerContent = innerContent
              .replace(/\\n/g, '\n')      // Convert escaped newlines to actual newlines
              .replace(/\\"/g, '"')       // Convert escaped quotes to actual quotes
              .replace(/\\'/g, "'")       // Convert escaped single quotes
              .replace(/\\\\/g, '\\');    // Convert escaped backslashes
            
            // Look for JSON content within the analysis text
            const jsonMatch = innerContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const parsedJson = JSON.parse(jsonMatch[0]);
                return JSON.stringify(parsedJson, null, 2);
              } catch (jsonParseError) {
                // Return the cleaned text if JSON parsing fails
                return innerContent;
              }
            }
            
            return innerContent;
          }
        } catch (pythonDictError) {
          console.warn('Failed to parse Python dictionary in formatAnalysisContent:', pythonDictError);
        }
      }
      
      // First, try to parse as JSON
      let parsed;
      
      // Sanitize the content first
      let sanitizedContent = content;
      if (typeof content === 'string') {
        // Remove or escape control characters that could cause JSON parsing issues
        sanitizedContent = content
          .replace(/[\x00-\x1F\x7F]/g, '')  // Remove control characters
          .replace(/\\/g, '\\\\')           // Escape backslashes
          .replace(/"/g, '\\"')             // Escape quotes
          .replace(/\n/g, '\\n')            // Escape newlines
          .replace(/\r/g, '\\r')            // Escape carriage returns
          .replace(/\t/g, '\\t');           // Escape tabs
      }
      
      try {
        parsed = JSON.parse(sanitizedContent);
      } catch (firstError) {
        // Try with the original content
        parsed = JSON.parse(content);
      }
      
      // Handle the specific format from the API response
      if (parsed && typeof parsed === 'object' && parsed.value) {
        // Extract the value field which contains the actual analysis
        let analysisContent = parsed.value;
        
        // If it's a string, try to parse it as JSON
        if (typeof analysisContent === 'string') {
          try {
            // Replace Python-style single quotes with double quotes for JSON parsing
            const jsonString = analysisContent
              .replace(/'/g, '"')
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, "'"); // Convert escaped quotes back
            
            const analysisData = JSON.parse(jsonString);
            return JSON.stringify(analysisData, null, 2);
          } catch (innerError) {
            // If JSON parsing fails, return the cleaned string
            return analysisContent
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'");
          }
        }
        
        return JSON.stringify(parsed, null, 2);
      }
      
      // If it's already a proper object, stringify it
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      console.warn('Error formatting analysis content:', error);
      // If all parsing fails, try to clean up the string for better readability
      if (typeof content === 'string') {
        return content
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\\\/g, '\\')
          .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
      }
      return String(content);
    }
  };

  const renderCharts = () => {
    if (!chartData) return null;

    const chartOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return new Intl.NumberFormat('th-TH', {
                style: 'currency',
                currency: 'THB',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value);
            }
          }
        }
      }
    };

    return (
      <div className={styles.chartsSection}>
        <h4>📊 Interactive Data Visualizations</h4>
        
        <div className={styles.tabNavigation}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'overview' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            🎯 Overview
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'sales' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            📈 Sales Analysis
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'predictions' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('predictions')}
          >
            🔮 Predictions
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'inventory' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            📦 Inventory
          </button>
        </div>

        <div className={styles.chartsContainer}>
          {activeTab === 'overview' && (
            <div className={styles.chartGrid}>
              {chartData.salesOverview && (
                <div className={`${styles.chartCard} ${styles.salesOverviewChart}`}>
                  <h5>📊 Sales Overview: Historical & Predicted</h5>
                  <Line data={chartData.salesOverview} options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        display: true,
                        text: 'Complete Sales Timeline: Past Performance & Future Predictions'
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const value = context.parsed.y;
                            if (value === null) return null;
                            return `${context.dataset.label}: ${new Intl.NumberFormat('th-TH', {
                              style: 'currency',
                              currency: 'THB',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(value)}`;
                          },
                          title: function(context) {
                            return context[0].label;
                          }
                        }
                      }
                    },
                    scales: {
                      ...chartOptions.scales,
                      x: {
                        title: {
                          display: true,
                          text: 'Timeline'
                        }
                      },
                      y: {
                        ...chartOptions.scales.y,
                        title: {
                          display: true,
                          text: 'Sales Amount (THB)'
                        }
                      }
                    }
                  }} />
                </div>
              )}
              {chartData.salesTrend && (
                <div className={styles.chartCard}>
                  <h5>📈 Daily Sales Trend (Last 90 Days)</h5>
                  <Line data={chartData.salesTrend} options={chartOptions} />
                </div>
              )}
              {chartData.monthlySales && (
                <div className={styles.chartCard}>
                  <h5>📊 Monthly Sales Overview</h5>
                  <Bar data={chartData.monthlySales} options={chartOptions} />
                </div>
              )}
              {chartData.repeatPurchase && (
                <div className={styles.chartCard}>
                  <h5>🏆 Customer Loyalty by Product</h5>
                  <Doughnut data={chartData.repeatPurchase} options={{
                    ...chartOptions, 
                    scales: undefined,
                    plugins: {
                      ...chartOptions.plugins,
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `${context.label}: ${context.parsed}%`;
                          }
                        }
                      }
                    }
                  }} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'sales' && (
            <div className={styles.chartGrid}>
              {chartData.salesOverview && (
                <div className={`${styles.chartCard} ${styles.salesOverviewChart}`}>
                  <h5>📊 Sales Overview: Historical & Predicted</h5>
                  <Line data={chartData.salesOverview} options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        display: true,
                        text: 'Complete Sales Timeline: Past Performance & Future Predictions'
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const value = context.parsed.y;
                            if (value === null) return null;
                            return `${context.dataset.label}: ${new Intl.NumberFormat('th-TH', {
                              style: 'currency',
                              currency: 'THB',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(value)}`;
                          },
                          title: function(context) {
                            return context[0].label;
                          }
                        }
                      }
                    },
                    scales: {
                      ...chartOptions.scales,
                      x: {
                        title: {
                          display: true,
                          text: 'Timeline'
                        }
                      },
                      y: {
                        ...chartOptions.scales.y,
                        title: {
                          display: true,
                          text: 'Sales Amount (THB)'
                        }
                      }
                    }
                  }} />
                </div>
              )}
              {chartData.salesTrend && (
                <div className={styles.chartCard}>
                  <h5>📊 Detailed Sales Analysis</h5>
                  <Line data={chartData.salesTrend} options={chartOptions} />
                </div>
              )}
              {chartData.salesForecast && (
                <div className={styles.chartCard}>
                  <h5>🔮 Actual vs Predicted Sales</h5>
                  <Line data={chartData.salesForecast} options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        display: true,
                        text: 'Sales Forecast Accuracy Analysis'
                      }
                    }
                  }} />
                </div>
              )}
              {chartData.repeatPurchase && (
                <div className={styles.chartCard}>
                  <h5>📋 Product Performance Metrics</h5>
                  <Bar data={chartData.repeatPurchase} options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `${context.label}: ${context.parsed}% repeat rate`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                          display: true,
                          text: 'Repeat Purchase Rate (%)'
                        },
                        ticks: {
                          callback: function(value) {
                            return value + '%';
                          }
                        }
                      }
                    }
                  }} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'predictions' && (
            <div className={styles.chartGrid}>
              {chartData.futurePredictions && (
                <div className={styles.chartCard}>
                  <h5>🔮 AI-Generated 12-Month Forecasts</h5>
                  <Line data={chartData.futurePredictions} options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        display: true,
                        text: 'AI-Powered Sales Scenarios (Best, Likely, Worst Case)'
                      }
                    }
                  }} />
                </div>
              )}
              {chartData.salesForecast && (
                <div className={styles.chartCard}>
                  <h5>🎯 Historical Prediction Accuracy</h5>
                  <Line data={chartData.salesForecast} options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        display: true,
                        text: 'Model Performance Validation'
                      }
                    }
                  }} />
                </div>
              )}
              {chartData.monthlySales && (
                <div className={styles.chartCard}>
                  <h5>📈 Monthly Trends for Forecasting</h5>
                  <Bar data={chartData.monthlySales} options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        display: true,
                        text: 'Historical Monthly Performance'
                      }
                    }
                  }} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className={styles.chartGrid}>
              {chartData.stockLevels && (
                <div className={styles.chartCard}>
                  <h5>📦 Current Stock Status</h5>
                  <Bar data={chartData.stockLevels} options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        display: true,
                        text: 'Stock Levels by Product (Red: Overstocked, Orange: Understocked, Green: Normal)'
                      },
                      legend: {
                        display: false, // Hide legend since colors indicate status
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Stock Units'
                        },
                        ticks: {
                          callback: function(value) {
                            return value.toLocaleString();
                          }
                        }
                      }
                    }
                  }} />
                </div>
              )}
              {chartData.repeatPurchase && (
                <div className={styles.chartCard}>
                  <h5>🔄 Product Demand Analysis</h5>
                  <Pie data={chartData.repeatPurchase} options={{
                    ...chartOptions,
                    scales: undefined,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        display: true,
                        text: 'Customer Loyalty Distribution for Inventory Planning'
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `${context.label}: ${context.parsed}% loyalty`;
                          }
                        }
                      }
                    }
                  }} />
                </div>
              )}
              {chartData.stockLevels && (
                <div className={styles.chartCard}>
                  <h5>⚠️ Stock Anomaly Summary</h5>
                  <div className={styles.inventoryInsights}>
                    <div className={styles.stockAlert}>
                      <h6>🚨 Immediate Actions Required:</h6>
                      <ul>
                        <li><strong>Overstocked Items:</strong> Consider promotions to reduce excess inventory</li>
                        <li><strong>Understocked Items:</strong> Increase orders to prevent stockouts</li>
                        <li><strong>Normal Levels:</strong> Maintain current inventory strategies</li>
                      </ul>
                    </div>
                    <div className={styles.stockRecommendations}>
                      <h6>💡 AI Recommendations:</h6>
                      <ul>
                        <li>Monitor high-loyalty products (Mango, Apple) for consistent stock</li>
                        <li>Reduce orders for lower-loyalty items during slow seasons</li>
                        <li>Implement just-in-time inventory for highly variable items</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.chartsSummary}>
          <h5>📋 Chart Insights Summary</h5>
          <div className={styles.insightGrid}>
            <div className={styles.insightCard}>
              <h6>📈 Sales Trends</h6>
              <p>Track daily and monthly sales patterns to identify growth opportunities and seasonal variations.</p>
            </div>
            <div className={styles.insightCard}>
              <h6>🔮 AI Predictions</h6>
              <p>Advanced machine learning forecasts with confidence intervals and scenario analysis.</p>
            </div>
            <div className={styles.insightCard}>
              <h6>🏆 Customer Loyalty</h6>
              <p>Analyze repeat purchase rates to optimize inventory and marketing strategies.</p>
            </div>
            <div className={styles.insightCard}>
              <h6>📦 Inventory Control</h6>
              <p>Monitor stock levels and identify anomalies to prevent stockouts and overstock situations.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExcelDataSummary = (excelData) => {
    if (!excelData) return null;

    const totalSheets = Object.keys(excelData).length;
    const sheetNames = Object.keys(excelData);

    return (
      <div className={styles.dataSection}>
        <h4>📊 Excel Data Summary</h4>
        <div className={styles.summary}>
          <p><strong>Total Sheets:</strong> {totalSheets}</p>
          <p><strong>Sheets:</strong> {sheetNames.join(', ')}</p>
        </div>
        
        {Object.entries(excelData).map(([sheetName, sheetData]) => (
          <div key={sheetName} className={styles.sheetData}>
            <h5>📋 Sheet: {sheetName} ({sheetData.length} rows)</h5>
            {sheetData.length > 0 && (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      {Object.keys(sheetData[0]).map(col => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetData.slice(0, 5).map((row, index) => (
                      <tr key={index}>
                        {Object.keys(sheetData[0]).map(col => (
                          <td key={col}>{row[col]?.toString() || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sheetData.length > 5 && (
                  <p className={styles.moreRows}>... and {sheetData.length - 5} more rows</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderAIAnalysis = (aiAnalysis) => {
    if (!aiAnalysis) return null;

    // Parse the structured analysis response
    let parsedAnalysis = null;
    
    // Get the analysis content from the correct location in the data structure
    let analysisContent = null;
    if (aiAnalysis.analysis_response) {
      analysisContent = aiAnalysis.analysis_response;
    } else if (aiAnalysis.ai_insights && aiAnalysis.ai_insights.analysis) {
      analysisContent = aiAnalysis.ai_insights.analysis;
    } else {
      console.warn('No analysis content found in expected locations');
      analysisContent = aiAnalysis;
    }

    try {
      // Handle the analysis_response which is a JSON string
      if (typeof analysisContent === 'string') {
        // Clean up the JSON string and parse it
        let cleanedContent = analysisContent.trim();
        
        // Remove any markdown formatting if present
        if (cleanedContent.startsWith('```json')) {
          cleanedContent = cleanedContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.replace(/```\s*/, '').replace(/```\s*$/, '');
        }
        
        // Try to parse the cleaned JSON
        try {
          parsedAnalysis = JSON.parse(cleanedContent);
          console.log('✅ Successfully parsed AI analysis:', parsedAnalysis);
        } catch (jsonError) {
          console.warn('Failed to parse JSON, trying fallback cleaning:', jsonError);
          
          // Fallback cleaning for common issues
          cleanedContent = cleanedContent
            .replace(/'/g, '"')           // Replace single quotes with double quotes
            .replace(/True/g, 'true')     // Replace Python True with JSON true
            .replace(/False/g, 'false')   // Replace Python False with JSON false
            .replace(/None/g, 'null')     // Replace Python None with JSON null
            .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
          
          try {
            parsedAnalysis = JSON.parse(cleanedContent);
            console.log('✅ Successfully parsed AI analysis with fallback:', parsedAnalysis);
          } catch (fallbackError) {
            console.error('Failed to parse analysis response after fallback:', fallbackError);
            console.error('Content that failed to parse:', cleanedContent);
          }
        }
      } else if (typeof analysisContent === 'object') {
        parsedAnalysis = analysisContent;
        console.log('✅ Analysis content is already an object:', parsedAnalysis);
      }
    } catch (error) {
      console.error('Error processing analysis response:', error);
      console.error('Raw content:', analysisContent);
    }

    // Fallback to original display if parsing fails
    if (!parsedAnalysis) {
      return (
        <div className={styles.analysisSection}>
          <h4>🤖 AI Business Intelligence Analysis</h4>
          
          {aiAnalysis.data_processed && (
            <div className={styles.processingInfo}>
              <p><strong>📄 File:</strong> {aiAnalysis.data_processed.filename}</p>
              <p><strong>📊 Sheets Analyzed:</strong> {aiAnalysis.data_processed.sheets_analyzed?.join(', ')}</p>
              <p><strong>📈 Total Sheets:</strong> {aiAnalysis.data_processed.total_sheets}</p>
            </div>
          )}

          <div className={styles.analysisContent}>
            <h5>📋 Comprehensive Business Analysis</h5>
            <div className={styles.analysisText}>
              <pre>{formatAnalysisContent(analysisContent)}</pre>
            </div>
          </div>
        </div>
      );
    }

    // If we have parsed analysis, render structured boxes
    if (parsedAnalysis) {
      return (
        <div className={styles.analysisSection}>
          <h4>🤖 AI Business Intelligence Analysis</h4>
          
          {aiAnalysis.data_processed && (
            <div className={styles.processingInfo}>
              <p><strong>📄 File:</strong> {aiAnalysis.data_processed.filename}</p>
              <p><strong>📊 Sheets Analyzed:</strong> {aiAnalysis.data_processed.sheets_analyzed?.join(', ')}</p>
              <p><strong>📈 Total Sheets:</strong> {aiAnalysis.data_processed.total_sheets}</p>
            </div>
          )}

          <div className={styles.analysisBoxGrid}>
            {/* Sales Forecasting Box */}
            {parsedAnalysis.sales_forecasting && (
              <div className={styles.analysisBox}>
                <div className={styles.boxHeader}>
                  <h5>📈 {parsedAnalysis.sales_forecasting.title}</h5>
                </div>
                <div className={styles.boxContent}>
                  <p className={styles.boxSummary}>{parsedAnalysis.sales_forecasting.summary}</p>
                  
                  {parsedAnalysis.sales_forecasting.monthly_forecasts && (
                    <div className={styles.forecastSection}>
                      <h6>📅 Monthly Forecasts</h6>
                      <div className={styles.forecastGrid}>
                        {parsedAnalysis.sales_forecasting.monthly_forecasts.slice(0, 6).map((forecast, index) => (
                          <div key={index} className={styles.forecastCard}>
                            <div className={styles.forecastMonth}>{forecast.month}</div>
                            <div className={styles.forecastValues}>
                              <div className={styles.forecastValue}>
                                <span className={styles.valueLabel}>Most Likely:</span>
                                <span className={styles.valueAmount}>{forecast.most_likely?.toLocaleString()} THB</span>
                              </div>
                              <div className={styles.confidenceLevel}>
                                Confidence: {forecast.confidence}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedAnalysis.sales_forecasting.key_insights && (
                    <div className={styles.insightsSection}>
                      <h6>💡 Key Insights</h6>
                      <ul>
                        {parsedAnalysis.sales_forecasting.key_insights.map((insight, index) => (
                          <li key={index}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parsedAnalysis.sales_forecasting.recommendations && (
                    <div className={styles.recommendationsSection}>
                      <h6>🎯 Recommendations</h6>
                      <ul>
                        {parsedAnalysis.sales_forecasting.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* External Factors Box */}
            {parsedAnalysis.external_factors && (
              <div className={styles.analysisBox}>
                <div className={styles.boxHeader}>
                  <h5>🌍 {parsedAnalysis.external_factors.title}</h5>
                </div>
                <div className={styles.boxContent}>
                  <p className={styles.boxSummary}>{parsedAnalysis.external_factors.summary}</p>
                  
                  {parsedAnalysis.external_factors.economic_conditions && (
                    <div className={styles.factorSection}>
                      <h6>💰 Economic Conditions</h6>
                      <div className={styles.factorDetails}>
                        <p><strong>Status:</strong> {parsedAnalysis.external_factors.economic_conditions.current_status}</p>
                        <p><strong>Impact:</strong> {parsedAnalysis.external_factors.economic_conditions.impact_percentage}%</p>
                        <p><strong>Trend:</strong> 
                          <span className={`${styles.trendIndicator} ${styles[parsedAnalysis.external_factors.economic_conditions.trend]}`}>
                            {parsedAnalysis.external_factors.economic_conditions.trend}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}

                  {parsedAnalysis.external_factors.seasonal_patterns && (
                    <div className={styles.factorSection}>
                      <h6>🌱 Seasonal Patterns</h6>
                      <div className={styles.seasonalInfo}>
                        <p><strong>Current Impact:</strong> {parsedAnalysis.external_factors.seasonal_patterns.current_season_impact}%</p>
                        <p><strong>Peak Months:</strong> {parsedAnalysis.external_factors.seasonal_patterns.peak_months?.join(', ')}</p>
                        <p><strong>Low Months:</strong> {parsedAnalysis.external_factors.seasonal_patterns.low_months?.join(', ')}</p>
                      </div>
                    </div>
                  )}

                  {parsedAnalysis.external_factors.market_trends && (
                    <div className={styles.factorSection}>
                      <h6>📊 Market Trends</h6>
                      <ul>
                        {parsedAnalysis.external_factors.market_trends.map((trend, index) => (
                          <li key={index}>{trend}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Risk Assessment Box */}
            {parsedAnalysis.risk_assessment && (
              <div className={styles.analysisBox}>
                <div className={styles.boxHeader}>
                  <h5>⚠️ {parsedAnalysis.risk_assessment.title}</h5>
                </div>
                <div className={styles.boxContent}>
                  <p className={styles.boxSummary}>{parsedAnalysis.risk_assessment.summary}</p>
                  
                  {parsedAnalysis.risk_assessment.risk_factors && (
                    <div className={styles.riskSection}>
                      <h6>🎯 Risk Factors</h6>
                      <div className={styles.riskGrid}>
                        {parsedAnalysis.risk_assessment.risk_factors.map((risk, index) => (
                          <div key={index} className={styles.riskCard}>
                            <div className={styles.riskFactor}>{risk.factor}</div>
                            <div className={styles.riskDetails}>
                              <span className={styles.riskProbability}>Probability: {risk.probability}%</span>
                              <span className={`${styles.riskImpact} ${styles[risk.impact]}`}>
                                Impact: {risk.impact}
                              </span>
                            </div>
                            <div className={styles.riskMitigation}>
                              <strong>Mitigation:</strong> {risk.mitigation}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Promotion Strategy Box */}
            {parsedAnalysis.promotion_strategy && (
              <div className={styles.analysisBox}>
                <div className={styles.boxHeader}>
                  <h5>🎁 {parsedAnalysis.promotion_strategy.title}</h5>
                </div>
                <div className={styles.boxContent}>
                  <p className={styles.boxSummary}>{parsedAnalysis.promotion_strategy.summary}</p>
                  
                  {parsedAnalysis.promotion_strategy.recommended_promotions && (
                    <div className={styles.promotionSection}>
                      <h6>🏷️ Recommended Promotions</h6>
                      <div className={styles.promotionGrid}>
                        {parsedAnalysis.promotion_strategy.recommended_promotions.map((promo, index) => (
                          <div key={index} className={styles.promotionCard}>
                            <div className={styles.promotionProduct}>{promo.product}</div>
                            <div className={styles.promotionDetails}>
                              <span className={styles.promotionDiscount}>{promo.discount_percentage}% OFF</span>
                              <span className={styles.promotionTiming}>{promo.timing}</span>
                            </div>
                            <div className={styles.promotionImpact}>
                              Expected: {promo.expected_impact}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedAnalysis.promotion_strategy.seasonal_calendar && (
                    <div className={styles.calendarSection}>
                      <h6>📅 Seasonal Calendar</h6>
                      <div className={styles.calendarGrid}>
                        {Object.entries(parsedAnalysis.promotion_strategy.seasonal_calendar).map(([quarter, activities]) => (
                          <div key={quarter} className={styles.calendarQuarter}>
                            <div className={styles.quarterTitle}>{quarter}</div>
                            <ul>
                              {activities.map((activity, index) => (
                                <li key={index}>{activity}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inventory Management Box */}
            {parsedAnalysis.inventory_management && (
              <div className={styles.analysisBox}>
                <div className={styles.boxHeader}>
                  <h5>📦 {parsedAnalysis.inventory_management.title}</h5>
                </div>
                <div className={styles.boxContent}>
                  <p className={styles.boxSummary}>{parsedAnalysis.inventory_management.summary}</p>
                  
                  {parsedAnalysis.inventory_management.stock_recommendations && (
                    <div className={styles.stockSection}>
                      <h6>📊 Stock Recommendations</h6>
                      <div className={styles.stockGrid}>
                        {parsedAnalysis.inventory_management.stock_recommendations.map((stock, index) => (
                          <div key={index} className={styles.stockCard}>
                            <div className={styles.stockProduct}>{stock.product}</div>
                            <div className={styles.stockLevels}>
                              <span className={styles.currentLevel}>Current: {stock.current_level}</span>
                              <span className={styles.recommendedLevel}>→ Recommended: {stock.recommended_level}</span>
                            </div>
                            <div className={styles.stockReason}>{stock.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actionable Insights Box */}
            {parsedAnalysis.actionable_insights && (
              <div className={styles.analysisBox}>
                <div className={styles.boxHeader}>
                  <h5>🎯 {parsedAnalysis.actionable_insights.title}</h5>
                </div>
                <div className={styles.boxContent}>
                  <p className={styles.boxSummary}>{parsedAnalysis.actionable_insights.summary}</p>
                  
                  {parsedAnalysis.actionable_insights.immediate_actions && (
                    <div className={styles.actionsSection}>
                      <h6>⚡ Immediate Actions</h6>
                      <div className={styles.actionsGrid}>
                        {parsedAnalysis.actionable_insights.immediate_actions.map((action, index) => (
                          <div key={index} className={styles.actionCard}>
                            <div className={styles.actionTitle}>{action.action}</div>
                            <div className={styles.actionDeadline}>⏰ {action.deadline}</div>
                            <div className={styles.actionImpact}>💡 {action.expected_impact}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedAnalysis.actionable_insights.kpis && (
                    <div className={styles.kpiSection}>
                      <h6>📊 Key Performance Indicators</h6>
                      <div className={styles.kpiGrid}>
                        {parsedAnalysis.actionable_insights.kpis.map((kpi, index) => (
                          <div key={index} className={styles.kpiCard}>
                            <div className={styles.kpiMetric}>{kpi.metric}</div>
                            <div className={styles.kpiValues}>
                              <span className={styles.kpiCurrent}>Current: {kpi.current?.toLocaleString()}</span>
                              <span className={styles.kpiTarget}>Target: {kpi.target?.toLocaleString()}</span>
                            </div>
                            <div className={styles.kpiTimeline}>{kpi.timeline}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Data Sources */}
          {parsedAnalysis.data_sources && (
            <div className={styles.dataSourcesSection}>
              <h5>🔗 Data Sources</h5>
              <div className={styles.sourcesList}>
                {parsedAnalysis.data_sources.map((source, index) => (
                  <a key={index} href={source} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                    📄 Source {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className={styles.analysisFeatures}>
            <h5>🎯 Analysis Includes:</h5>
            <ul>
              <li>📈 <strong>Sales Prediction & Forecasting</strong> - Historical patterns and future trends</li>
              <li>🌍 <strong>External Factors Analysis</strong> - Economic, seasonal, and geopolitical impacts</li>
              <li>⚠️ <strong>Risk Assessment</strong> - Comprehensive risk analysis and mitigation strategies</li>
              <li>🎁 <strong>Promotion Strategies</strong> - Optimal timing and discount recommendations</li>
              <li>📦 <strong>Inventory Management</strong> - Stock optimization and reorder points</li>
              <li>🎯 <strong>Actionable Insights</strong> - KPIs and immediate action items</li>
            </ul>
          </div>
        </div>
      );
    }

    return null;
  };

  // Don't render saved data info during SSR
  const getSavedDataInfo = () => {
    if (!isClient || !savedDataTimestamp) return null;
    return new Date(savedDataTimestamp).toLocaleString();
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>🚀 AI-Powered Excel Business Intelligence</h2>
      <p className={styles.description}>
        Upload your Excel file to get comprehensive business insights including sales predictions, 
        promotion strategies, stock management recommendations, and interactive data visualizations.
      </p>

      {isClient && getSavedDataInfo() && !file && !result && (
        <div className={styles.savedDataInfo}>
          <p>💾 You have saved analysis data from {getSavedDataInfo()}</p>
          <button onClick={clearSavedData} className={`${styles.button} ${styles.resetButton}`}>
            Clear Saved Data
          </button>
        </div>
      )}
      
      {!file && !result && (
        <div 
          className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className={styles.uploadContent}>
            <div className={styles.uploadIcon}>📊</div>
            <p className={styles.uploadText}>
              Drag and drop your Excel file here, or
            </p>
            <label className={styles.fileInputLabel}>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className={styles.fileInput}
              />
              Click to browse
            </label>
            <p className={styles.supportedFormats}>
              Supports .xlsx and .xls files
            </p>
          </div>
        </div>
      )}

      {file && !result && (
        <div className={styles.fileInfo}>
          <div className={styles.fileDetails}>
            <span className={styles.fileName}>📄 {file.name}</span>
            <span className={styles.fileSize}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
          
          <div className={styles.actions}>
            <button 
              onClick={analyzeFile} 
              disabled={analyzing}
              className={`${styles.button} ${styles.primaryButton}`}
            >
              {analyzing ? (
                <>
                  <span className={styles.spinner}></span>
                  Analyzing with AI...
                </>
              ) : (
                <>
                  🤖 Analyze with AI
                </>
              )}
            </button>
            
            <button 
              onClick={resetUpload}
              className={`${styles.button} ${styles.resetButton}`}
            >
              Cancel
            </button>
          </div>

          {analyzing && (
            <div className={styles.analyzingInfo}>
              <p>🔍 AI is analyzing your data and searching for market insights...</p>
              <p>This may take a moment as we gather comprehensive business intelligence.</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <h3>✅ Analysis Results</h3>
            <button 
              onClick={resetUpload}
              className={`${styles.button} ${styles.resetButton}`}
            >
              Upload New File
            </button>
          </div>
          
          {chartData && renderCharts()}
          
          {result.analysis && result.analysis.excel_data && renderExcelDataSummary(result.analysis.excel_data)}
          
          {result.analysis && result.analysis.ai_analysis && renderAIAnalysis(result.analysis.ai_analysis)}

          <div className={styles.downloadSection}>
            <p>💾 <strong>Data Storage:</strong> Your analysis results are automatically saved in browser storage for future reference.</p>
            <p>📊 <strong>Charts:</strong> Interactive visualizations are generated from your data including sales trends, predictions, and inventory analysis.</p>
          </div>
        </div>
      )}
    </div>
  );
} 