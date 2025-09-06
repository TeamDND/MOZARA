"""
Hair Damage Analysis Main Application
"""
from api.hair_analysis_api import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
