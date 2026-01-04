import faiss
import pickle
import json
from sentence_transformers import SentenceTransformer

class MenuService:
    _instance = None

    def __init__(self):
        # Paths relative to the backend root
        self.embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        self.index = faiss.read_index("data/vector_store/faiss.index")
        with open("data/vector_store/metadata.pkl", "rb") as f:
            self.metadata = pickle.load(f)

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def get_relevant_items(self, query: str, top_k: int = 5):
        query_embedding = self.embedder.encode([query])
        distances, indices = self.index.search(query_embedding, top_k)
        
        # Pull metadata for the matched items
        retrieved_items = [self.metadata[idx] for idx in indices[0]]
        return retrieved_items