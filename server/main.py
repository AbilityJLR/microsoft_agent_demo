from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import ai

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai.router)


@app.get("/")
async def root():
    return {"message": "Hello Bigger Applications!"}
