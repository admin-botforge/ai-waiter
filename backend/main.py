from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.api import chat_router # We will create this next

app = FastAPI(title="Veg Cafe Alexa Server")

origins = [
    "http://localhost:5173",        # Local React
    "http://127.0.0.1:5173",       # Local React alternative
    "https://your-app-name.vercel.app" # <--- ADD YOUR ACTUAL VERCEL URL HERE
]

# IMPORTANT: Allow React (Frontend) to talk to FastAPI (Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows POST, GET, etc.
    allow_headers=["*"], # Allows Content-Type, etc.
)

app.include_router(chat_router.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Cafe AI Server is Live"}