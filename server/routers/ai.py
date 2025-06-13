from fastapi import APIRouter, UploadFile, File, HTTPException
from services.ai_services import ai_analyze, ai_analyze_excel_data
import json

router = APIRouter()


@router.get("/users/", tags=["users"])
async def read_users():
    result = test_openai()
    return {"message": result}


@router.get("/ai/", tags=["ai"])
async def read_ai():
    return ai_analyze()


@router.post("/ai/analyze-excel/", tags=["ai"])
async def analyze_excel(file: UploadFile = File(...)):
    """
    Upload Excel file and get comprehensive AI analysis including:
    - Sales prediction
    - Promotion suggestions
    - Stock management recommendations
    - Stock level optimization
    """
    try:
        # Validate file type
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are allowed")
        
        # Read the Excel file
        contents = await file.read()
        
        # Process Excel and get AI analysis
        analysis_result = await ai_analyze_excel_data(contents, file.filename)
        
        return {
            "message": "Excel file analyzed successfully",
            "filename": file.filename,
            "analysis": analysis_result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

