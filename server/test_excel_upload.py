import requests
import os

def test_excel_upload():
    """
    Test script for the Excel upload and AI analysis endpoint
    """
    
    # API endpoint
    url = "http://localhost:8000/ai/analyze-excel/"
    
    # Path to test Excel file (you can use the existing data.xlsx or fruits.xlsx)
    excel_file_path = "data.xlsx"  # or "fruits.xlsx" from root directory
    
    if not os.path.exists(excel_file_path):
        print(f"Excel file not found: {excel_file_path}")
        print("Please ensure you have an Excel file to test with.")
        return
    
    try:
        # Read the Excel file
        with open(excel_file_path, 'rb') as file:
            files = {
                'file': (excel_file_path, file, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            }
            
            print(f"Uploading {excel_file_path} for AI analysis...")
            print("This may take a moment as the AI analyzes the data and searches for market insights...")
            
            # Send POST request
            response = requests.post(url, files=files)
            
            if response.status_code == 200:
                result = response.json()
                print("\n✅ Analysis completed successfully!")
                print(f"📊 Analyzed file: {result['filename']}")
                print(f"🤖 AI Analysis: {result['analysis']['ai_analysis']['analysis_response'][:500]}...")
                print("\n📈 Full response saved to 'analysis_result.json'")
                
                # Save full response to file
                import json
                with open('analysis_result.json', 'w') as f:
                    json.dump(result, f, indent=2)
                    
            else:
                print(f"❌ Error: {response.status_code}")
                print(response.json())
                
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")

if __name__ == "__main__":
    test_excel_upload() 