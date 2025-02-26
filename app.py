from flask import Flask, jsonify, request, abort, send_from_directory
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from datetime import datetime
import json

app = Flask(__name__)

# Global variables for data and model.
user_data = None
history_data = None
private_parking_data = None
public_parking_data = None
merged_history = None
temp_data = None  # Candidate parking data loaded from temp_data_template.json
kmeans_model = None

def load_data():
    global user_data, history_data, private_parking_data, public_parking_data, merged_history, temp_data
    # Load JSON datasets.
    user_data = pd.read_json('user_data.json')
    history_data = pd.read_json('history_data.json')
    private_parking_data = pd.read_json('private_parking.json')
    public_parking_data = pd.read_json('public_parking.json')
    
    # Merge history data with private parking to get price info.
    merged_history = pd.merge(
        history_data,
        private_parking_data[['private_id', 'price_per_hour']],
        left_on='parking_id',
        right_on='private_id',
        how='left'
    )
    merged_history['price'] = merged_history['price_per_hour']
    # Convert "distance" from a string (e.g., "40.78 KM") to a float.
    merged_history['distance'] = merged_history['distance'].astype(str).str.extract(r'([\d\.]+)')[0].astype(float)
    
    # Load candidate parking data from temp_data_template.json.
    try:
        temp_data = pd.read_json('temp_data_template.json')
    except Exception as e:
        temp_data = pd.DataFrame()  # Fallback to empty DataFrame if file not found

def train_model():
    global kmeans_model, merged_history
    # Use features: rating, price, and distance.
    features = merged_history[['rating', 'price', 'distance']].copy()
    features['rating'] = pd.to_numeric(features['rating'], errors='coerce')
    features['price'] = pd.to_numeric(features['price'], errors='coerce')
    features['distance'] = pd.to_numeric(features['distance'], errors='coerce')
    features.fillna(features.mean(), inplace=True)
    
    kmeans_model = KMeans(n_clusters=3, random_state=42, n_init=10)
    kmeans_model.fit(features.to_numpy())
    merged_history['cluster'] = kmeans_model.labels_

def get_user_vector(user_id: str):
    """
    Returns the user preference vector as [avg_rating, avg_price, avg_distance].
    If the user has history in merged_history, uses their averages.
    Otherwise, randomly generates fake values within thresholds:
      - Rating: between 1 and 5
      - Price: between 1.09 and 1.88
      - Distance: between 36.01 and 114.93
    """
    user_history = merged_history[merged_history['user_id'] == user_id].copy()
    if not user_history.empty:
        global_avg_rating = merged_history['rating'].mean()
        global_avg_price = merged_history['price'].mean()
        global_avg_distance = merged_history['distance'].mean()
        user_history['rating'].fillna(global_avg_rating, inplace=True)
        user_history['price'].fillna(global_avg_price, inplace=True)
        user_history['distance'].fillna(global_avg_distance, inplace=True)
        avg_rating = user_history['rating'].mean()
        avg_price = user_history['price'].mean()
        avg_distance = user_history['distance'].mean()
    else:
        avg_rating = np.random.uniform(1, 5)
        avg_price = np.random.uniform(1.09, 1.88)
        avg_distance = np.random.uniform(36.01, 114.93)
    return np.array([[avg_rating, avg_price, avg_distance]])

def recommend_parking(user_id: str):
    global temp_data, kmeans_model
    user_vector = get_user_vector(user_id)
    try:
        user_cluster = kmeans_model.predict(user_vector)[0]
    except Exception as e:
        abort(500, description="Error predicting cluster: " + str(e))
    
    # Assign clusters to candidate data.
    candidate_df = temp_data.copy()
    candidate_features = candidate_df[['rating', 'price', 'distance']]
    candidate_df['cluster'] = kmeans_model.predict(candidate_features.to_numpy())
    
    recommended = candidate_df[candidate_df['cluster'] == user_cluster].copy()
    if recommended.empty:
        # Fallback: rank by Euclidean distance.
        diffs = candidate_df[['rating', 'price', 'distance']] - user_vector
        dists = np.linalg.norm(diffs.to_numpy(), axis=1)
        candidate_df['euclidean_distance'] = dists
        recommended = candidate_df.sort_values('euclidean_distance').head(5)
    else:
        recommended = recommended.sort_values('distance').head(5)
    return recommended

# Serve index.html at the root.
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# Recommendation endpoint.
@app.route('/recommend', methods=['GET'])
def get_recommendations():
    user_id = request.args.get('user_id')
    if not user_id:
        # Default to candidate JSON's user_id if none provided.
        if temp_data is not None and not temp_data.empty:
            user_id = temp_data.iloc[0]['user_id']
        else:
            abort(400, description="No candidate data available and no user_id provided.")
    rec_df = recommend_parking(user_id)
    rec_list = rec_df.to_dict(orient='records')
    return jsonify({"recommendations": rec_list})

if __name__ == '__main__':
    load_data()
    train_model()
    app.run(host="0.0.0.0", port=8000, debug=True)
