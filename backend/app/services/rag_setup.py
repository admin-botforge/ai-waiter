import os
import json
import faiss
import pickle
from sentence_transformers import SentenceTransformer

os.makedirs("vector_store", exist_ok=True)

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
VECTOR_DB_PATH = "data/vector_store/faiss.index"
METADATA_PATH = "data/vector_store/metadata.pkl"
MENU_PATH = "data/menu.json"

model = SentenceTransformer(MODEL_NAME)

documents = []
metadata_records = []

with open(MENU_PATH, "r", encoding="utf-8") as f:
    menu = json.load(f)

for section in menu["restaurant_menu"]["sections"]:
    category = section["category"]

    for item in section["items"]:
        text = f"""
        {item['name_en']} - {item['name_hi']}
        Category: {category}{item.get('category_context', '')}
        Description: {item.get('description', '')}
        Ingredients: {', '.join(item.get('key_ingredients', []))}
        Tags: {', '.join(item.get('dietary_tags', []))}
        """

        documents.append(text.strip())

        metadata_records.append({
            "item_id": item["id"],
            "name_en": item["name_en"],
            "name_hi": item["name_hi"],
            "category": category,
            "price": item["price"],
            "description": item.get("description", ""),
            "dietary_tags": item.get("dietary_tags", []),
            "is_popular": item.get("is_popular", False),
            "language": item.get("language", ["en"])
        })

embeddings = model.encode(documents, show_progress_bar=True)

dimension = embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(embeddings)

faiss.write_index(index, VECTOR_DB_PATH)

with open(METADATA_PATH, "wb") as f:
    pickle.dump(metadata_records, f)

print("✅ Vector store created successfully")
