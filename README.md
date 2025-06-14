# Excel Data Processor

A full-stack AI-powered application for analyzing Excel files and generating comprehensive business insights. Upload your Excel files to get automated analysis including sales predictions, promotion suggestions, stock management recommendations, and optimization strategies.

## 🚀 Features

- **Excel File Upload**: Support for `.xlsx` and `.xls` files
- **AI-Powered Analysis**: Comprehensive data analysis using Azure AI services
- **Business Insights**: 
  - Sales prediction and forecasting
  - Promotion suggestions
  - Stock management recommendations
  - Stock level optimization
- **Interactive Dashboard**: Modern React frontend with data visualization
- **Real-time Processing**: Fast API backend with real-time file processing
- **Containerized Deployment**: Docker support for easy deployment

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.3.3** - React framework with Turbopack
- **React 19** - Frontend library
- **Chart.js** - Data visualization
- **React Chart.js 2** - React wrapper for Chart.js

### Backend
- **FastAPI** - Modern Python web framework
- **Azure AI Services** - AI/ML analysis capabilities
- **OpenAI Integration** - Advanced AI processing
- **Pandas** - Data manipulation and analysis
- **OpenPyXL** - Excel file processing
- **Python 3.x** - Backend runtime

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **CORS** - Cross-origin resource sharing

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Docker and Docker Compose (optional)
- Azure AI Services account
- OpenAI API key

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Set up environment variables**
   Create `.env` files in both `client/` and `server/` directories with your API keys:
   ```bash
   # server/.env
   AZURE_AI_KEY=your_azure_key
   OPENAI_API_KEY=your_openai_key
   ```

3. **Run with Docker Compose**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Manual Setup

#### Backend Setup

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

#### Frontend Setup

1. **Navigate to client directory**
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

## 📖 Usage

1. **Open the application** in your browser at `http://localhost:3000`

2. **Upload Excel file** using the drag-and-drop interface or file picker

3. **View AI Analysis** - The system will process your file and provide:
   - Sales predictions and trends
   - Promotional strategy recommendations
   - Stock management insights
   - Optimization suggestions

4. **Interactive Charts** - Visualize your data with dynamic charts and graphs

## 🏗️ Project Structure

```
├── client/                 # Next.js frontend
│   ├── app/               # Next.js 13+ app directory
│   │   ├── components/    # React components
│   │   ├── globals.css    # Global styles
│   │   ├── layout.js      # Root layout
│   │   └── page.js        # Home page
│   ├── public/            # Static assets
│   ├── package.json       # Frontend dependencies
│   └── Dockerfile         # Frontend container
├── server/                # FastAPI backend
│   ├── routers/           # API route handlers
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   ├── internal/          # Internal modules
│   ├── main.py            # FastAPI app entry point
│   ├── requirements.txt   # Python dependencies
│   └── Dockerfile         # Backend container
├── docker-compose.dev.yml # Development orchestration
├── sample_business_data.xlsx # Sample data
└── README.md              # This file
```

## 🔧 API Endpoints

- `GET /` - Health check endpoint
- `GET /ai/` - Test AI service connection
- `POST /ai/analyze-excel/` - Upload and analyze Excel files

## 🧪 Testing

### Backend Tests
```bash
cd server
python test_excel_upload.py
python test_excel.py
```

### Frontend Tests
```bash
cd client
npm test
```

## 🚀 Deployment

The application is containerized and ready for deployment on any Docker-compatible platform:

- **Development**: Use `docker-compose.dev.yml`
- **Production**: Create production docker-compose file with environment-specific configurations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include error logs and system information

## 🙏 Acknowledgments

- Azure AI Services for powerful AI capabilities
- OpenAI for advanced language processing
- Chart.js for beautiful data visualizations
- FastAPI for excellent API framework
- Next.js for modern React development 