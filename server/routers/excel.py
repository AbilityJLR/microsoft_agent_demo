from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import json
import io
import numpy as np
from datetime import datetime
from typing import Dict, Any
from services.ai_services import analyze_excel_data

router = APIRouter()

def convert_to_json_serializable(obj):
    """Convert pandas/numpy objects to JSON serializable format"""
    if pd.isna(obj):
        return None
    elif isinstance(obj, (pd.Timestamp, pd.DatetimeIndex)):
        return obj.isoformat()
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, (np.ndarray,)):
        return obj.tolist()
    else:
        return obj

def excel_to_json(file_content: bytes) -> Dict[str, Any]:
    """Convert Excel file content to JSON format - reads ALL sheets"""
    try:
        # Read ALL sheets from Excel file
        all_sheets = pd.read_excel(io.BytesIO(file_content), sheet_name=None)
        
        # Convert each sheet to dictionary with records orientation
        sheets_data = {}
        total_rows = 0
        
        for sheet_name, df in all_sheets.items():
            # Convert DataFrame to records, handling non-JSON serializable types
            records = []
            for _, row in df.iterrows():
                record = {}
                for col, value in row.items():
                    record[str(col)] = convert_to_json_serializable(value)
                records.append(record)
            
            sheets_data[str(sheet_name)] = {
                "data": records,
                "columns": [str(col) for col in df.columns],
                "row_count": len(records)
            }
            total_rows += len(records)
        
        # Create result with all sheets
        result = {
            "sheets": sheets_data,
            "sheet_names": [str(name) for name in all_sheets.keys()],
            "total_sheets": len(all_sheets),
            "total_rows_all_sheets": total_rows
        }
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing Excel file: {str(e)}")

@router.post("/upload-excel")
async def upload_excel_file(file: UploadFile = File(...)):
    """Upload Excel file and convert ALL sheets to JSON"""
    
    # Check if file is Excel format
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be Excel format (.xlsx or .xls)")
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Convert to JSON (all sheets)
        json_result = excel_to_json(file_content)
        
        return JSONResponse(content=json_result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/upload-excel-analyze")
async def upload_excel_and_analyze(file: UploadFile = File(...)):
    """Upload Excel file and get AI business analysis with predictions and recommendations"""
    
    # Check if file is Excel format
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be Excel format (.xlsx or .xls)")
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Convert to JSON (all sheets)
        excel_json = excel_to_json(file_content)
        
        # Send to AI for analysis
        ai_analysis = analyze_excel_data(excel_json)
        
        # Return both Excel data and AI analysis
        result = {
            "excel_data": excel_json,
            "ai_insights": ai_analysis
        }
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/test-excel")
async def test_with_existing_excel():
    """Test endpoint using the existing data.xlsx file - reads ALL sheets"""
    try:
        # Read ALL sheets from the existing Excel file
        all_sheets = pd.read_excel("data.xlsx", sheet_name=None)
        
        sheets_data = {}
        total_rows = 0
        
        for sheet_name, df in all_sheets.items():
            # Convert DataFrame to records, handling non-JSON serializable types
            records = []
            for _, row in df.iterrows():
                record = {}
                for col, value in row.items():
                    record[str(col)] = convert_to_json_serializable(value)
                records.append(record)
            
            sheets_data[str(sheet_name)] = {
                "data": records,
                "columns": [str(col) for col in df.columns],
                "row_count": len(records)
            }
            total_rows += len(records)
        
        result = {
            "sheets": sheets_data,
            "sheet_names": [str(name) for name in all_sheets.keys()],
            "total_sheets": len(all_sheets),
            "total_rows_all_sheets": total_rows
        }
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading data.xlsx: {str(e)}")

@router.get("/test-excel-analyze")
async def test_excel_and_analyze():
    """Test endpoint using the existing data.xlsx file with AI business analysis"""
    try:
        # Read ALL sheets from the existing Excel file
        all_sheets = pd.read_excel("data.xlsx", sheet_name=None)
        
        sheets_data = {}
        total_rows = 0
        
        for sheet_name, df in all_sheets.items():
            # Convert DataFrame to records, handling non-JSON serializable types
            records = []
            for _, row in df.iterrows():
                record = {}
                for col, value in row.items():
                    record[str(col)] = convert_to_json_serializable(value)
                records.append(record)
            
            sheets_data[str(sheet_name)] = {
                "data": records,
                "columns": [str(col) for col in df.columns],
                "row_count": len(records)
            }
            total_rows += len(records)
        
        excel_json = {
            "sheets": sheets_data,
            "sheet_names": [str(name) for name in all_sheets.keys()],
            "total_sheets": len(all_sheets),
            "total_rows_all_sheets": total_rows
        }
        
        # Send to AI for analysis
        ai_analysis = analyze_excel_data(excel_json)
        
        # Return both Excel data and AI analysis
        result = {
            "excel_data": excel_json,
            "ai_insights": ai_analysis
        }
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading data.xlsx: {str(e)}") 