from fastapi import FastAPI
from routers import ai, excel

app = FastAPI()


app.include_router(ai.router)
app.include_router(excel.router)


@app.get("/")
async def root():
    return {"message": "Hello Bigger Applications!"}

