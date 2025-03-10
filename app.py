from flask import Flask, render_template, request, redirect, url_for
import os
import pandas as pd
import numpy as np
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
from sklearn.cluster import KMeans
from geopy.exc import GeocoderUnavailable
from datetime import datetime

app = Flask(__name__)

# Global variables to hold data
user_data = None
history_data = None
private_parking_data = None
public_parking_data = None
merged_history = None   # For private history records (merged)
public_history = None   # For public history records

# ---------------------------
# Data Loading
# ---------------------------
def load_data():
    global user_data, history_data, private_parking_data, public_parking_data, merged_history, public_history
    user_data = pd.read_json(os.path.join('database_generator', 'user_data.json'))
    history_data = pd.read_json(os.path.join('database_generator', 'history_data.json'))
    private_parking_data = pd.read_json(os.path.join('database_generator', 'private_parking.json'))
    public_parking_data = pd.read_json(os.path.join('database_generator', 'public_parking.json'))
    
    # For private history: merge with private_parking_data to obtain price info.
    merged_history = history_data[history_data['parking_id'].str.startswith("PRI")].copy()
    if not merged_history.empty:
        merged_history = pd.merge(
            merged_history,
            private_parking_data[['private_id', 'price_per_hour']],
            left_on='parking_id',
            right_on='private_id',
            how='left'
        )
        merged_history['price'] = merged_history['price_per_hour']
        merged_history['distance'] = merged_history['distance'].astype(str).str.extract(r'([\d\.]+)')[0].astype(float)
    
    # For public history: filter records with parking_id starting with "PUB"
    public_history = history_data[history_data['parking_id'].str.startswith("PUB")].copy()
    if not public_history.empty:
        if 'price' not in public_history.columns or public_history['price'].dropna().empty:
            public_history['price'] = public_history['money_spent'] / public_history['hours_spent']
        public_history['distance'] = public_history['distance'].astype(str).str.extract(r'([\d\.]+)')[0].astype(float)

load_data()

# ---------------------------
# Helper Functions
# ---------------------------
def extract_city(address):
    parts = address.split(',')
    return parts[-1].strip() if len(parts) > 1 else address.strip()

def get_coordinates(address):
    geolocator = Nominatim(user_agent="parking_app_ml")
    try:
        test_address = address if "Germany" in address else address + ", Germany"
        location = geolocator.geocode(test_address, timeout=10)
        if location:
            return (location.latitude, location.longitude)
    except Exception as e:
        print("Error geocoding full address:", e)
    try:
        city = extract_city(address)
        test_city = city if "Germany" in city else city + ", Germany"
        location = geolocator.geocode(test_city, timeout=10)
        if location:
            return (location.latitude, location.longitude)
    except Exception as e:
        print("Error geocoding city:", e)
    return (None, None)

def compute_distance(row, user_coords):
    # Select only the 'latitude' and 'longitude' columns from the row.
    lat_val = row['latitude']
    lon_val = row['longitude']
    # If these are Series (due to duplicate columns), take the first element.
    if isinstance(lat_val, pd.Series):
        lat_val = lat_val.iloc[0]
    if isinstance(lon_val, pd.Series):
        lon_val = lon_val.iloc[0]
    try:
        candidate_lat = float(lat_val)
        candidate_lon = float(lon_val)
    except Exception as e:
        print("Error converting candidate coordinates:", e)
        return np.nan
    d = geodesic(user_coords, (candidate_lat, candidate_lon)).kilometers
    return round(d, 2)

def get_user_vector_for_type(uid, history_df, prefix):
    sub = history_df[(history_df['user_id'] == uid) & (history_df['parking_id'].str.startswith(prefix))]
    if not sub.empty:
        avg_rating = sub['rating'].mean() if 'rating' in sub.columns and not sub['rating'].dropna().empty else np.random.uniform(1,5)
        if 'price' not in sub.columns or sub['price'].dropna().empty:
            avg_price = np.random.uniform(1.09, 1.88) if prefix=="PRI" else np.random.uniform(3.0, 4.0)
        else:
            avg_price = sub['price'].mean()
        if 'distance' in sub.columns and not sub['distance'].dropna().empty:
            sub['dist_num'] = sub['distance'].astype(str).str.extract(r'([\d\.]+)')[0].astype(float)
            avg_distance = sub['dist_num'].mean()
        else:
            avg_distance = np.random.uniform(36.01, 114.93)
    else:
        print(f"No history available for {prefix} for user {uid}. Generating fake data.")
        avg_rating = np.random.uniform(1, 5)
        avg_price = np.random.uniform(1.09, 1.88) if prefix=="PRI" else np.random.uniform(3.0, 4.0)
        avg_distance = np.random.uniform(36.01, 114.93)
    return np.array([[avg_rating, avg_price, avg_distance]])

def rank_candidates(candidates_df, user_vector):
    candidates_df['euclidean_diff'] = candidates_df[['rating', 'price', 'calc_distance']].apply(
        lambda row: np.linalg.norm(row.to_numpy() - user_vector[0]), axis=1)
    return candidates_df.sort_values('euclidean_diff').reset_index(drop=True)

def is_parking_open(parking, start_time, end_time):
    if not start_time or not end_time:
        return True
    
    start_time = datetime.fromisoformat(start_time)
    end_time = datetime.fromisoformat(end_time)
    
    # Extrahiere die Öffnungszeiten des Parkplatzes
    opening_time_str = str(parking.get('opening_time', '00:00:00'))  # Konvertiere Timestamp zu String
    closing_time_str = str(parking.get('closing_time', '23:59:59'))  # Konvertiere Timestamp zu String
    
    # Parse die Öffnungszeiten im Format 'YYYY-MM-DD HH:MM:SS'
    opening_time = datetime.strptime(opening_time_str, '%Y-%m-%d %H:%M:%S').time()
    closing_time = datetime.strptime(closing_time_str, '%Y-%m-%d %H:%M:%S').time()
    
    # Überprüfe, ob der ausgewählte Zeitraum innerhalb der Öffnungszeiten liegt
    return (start_time.time() >= opening_time and end_time.time() <= closing_time)

# ---------------------------
# Routes
# ---------------------------
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/recommend', methods=['GET'])
def recommend():
    uid = request.args.get('uid')
    address_override = request.args.get('address_override')
    max_price_str = request.args.get('max_price')
    max_distance_str = request.args.get('max_distance')
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')
    
    max_price = float(max_price_str) if max_price_str and max_price_str.strip() != "" else None
    max_distance = float(max_distance_str) if max_distance_str and max_distance_str.strip() != "" else None

    if not uid:
        return redirect(url_for('index'))
    
    # Get User Info
    user_row = user_data[user_data['user_id'] == uid]
    if user_row.empty:
        return f"User {uid} not found.", 404
    user_address = user_row.iloc[0]['address']
    if address_override and address_override.strip() != "":
        user_address = address_override.strip()
    user_city = extract_city(user_address)
    
    # Determine user coordinates.
    if 'latitude' in user_row and 'longitude' in user_row:
        user_lat = user_row.iloc[0].get('latitude', None)
        user_lon = user_row.iloc[0].get('longitude', None)
        if pd.notna(user_lat) and pd.notna(user_lon):
            user_coords = (float(user_lat), float(user_lon))
        else:
            user_coords = get_coordinates(user_address)
    else:
        user_coords = get_coordinates(user_address)
    if None in user_coords:
        user_coords = get_coordinates(user_city)
    if None in user_coords:
        return "Could not geocode user's address or city.", 500
    
    # Filter Candidate Parking by City
    # Private candidates.
    private_candidates = private_parking_data[private_parking_data['city'] == user_city].copy()
    private_candidates = private_candidates.loc[:, ~private_candidates.columns.duplicated()]
    if "rating" not in private_candidates.columns:
        private_candidates["rating"] = np.random.uniform(1, 5, size=len(private_candidates))
    private_candidates["price"] = private_candidates["price_per_hour"]
    # Compute distance using only the 'latitude' and 'longitude' columns.
    if not private_candidates.empty:
        private_candidates['calc_distance'] = pd.Series(
            private_candidates[['latitude','longitude']].apply(lambda row: compute_distance(row, user_coords), axis=1).values,
            index=private_candidates.index
        )
    else:
        private_candidates['calc_distance'] = pd.Series([], index=private_candidates.index)
    if max_price is not None:
        private_candidates = private_candidates[private_candidates["price"] <= max_price]
    if max_distance is not None:
        private_candidates = private_candidates[private_candidates["calc_distance"] <= max_distance]
    
    # Public candidates.
    if 'city' not in public_parking_data.columns:
        public_parking_data['city'] = public_parking_data['address'].apply(extract_city)
    public_candidates = public_parking_data[public_parking_data['city'] == user_city].copy()
    public_candidates = public_candidates.loc[:, ~public_candidates.columns.duplicated()]
    if "rating" not in public_candidates.columns:
        public_candidates["rating"] = np.random.uniform(1, 5, size=len(public_candidates))
    public_candidates["price"] = public_candidates["price_per_hour"]
    if not public_candidates.empty:
        public_candidates['calc_distance'] = pd.Series(
            public_candidates[['latitude','longitude']].apply(lambda row: compute_distance(row, user_coords), axis=1).values,
            index=public_candidates.index
        )
    else:
        public_candidates['calc_distance'] = pd.Series([], index=public_candidates.index)
    if max_price is not None:
        public_candidates = public_candidates[public_candidates["price"] <= max_price]
    if max_distance is not None:
        public_candidates = public_candidates[public_candidates["calc_distance"] <= max_distance]
    
    # Filter by start and end time
    if start_time and end_time:
        private_candidates = private_candidates[private_candidates.apply(lambda x: is_parking_open(x, start_time, end_time), axis=1)]
        public_candidates = public_candidates[public_candidates.apply(lambda x: is_parking_open(x, start_time, end_time), axis=1)]
    
    # KMeans-based Ranking for Private Parking
    X_private = private_candidates[['rating', 'price', 'calc_distance']].to_numpy()
    if len(X_private) == 0:
        top15_private = pd.DataFrame()
    else:
        kmeans_private = KMeans(n_clusters=3, random_state=42, n_init=10)
        kmeans_private.fit(X_private)
        private_candidates['cluster'] = kmeans_private.predict(X_private)
        user_vector_private = get_user_vector_for_type(uid, history_data, "PRI")
        user_cluster_private = kmeans_private.predict(user_vector_private)[0]
        private_in_cluster = private_candidates[private_candidates['cluster'] == user_cluster_private].copy()
        ranked_private = rank_candidates(private_in_cluster, user_vector_private)
        top15_private = ranked_private.head(15)
    
    # KMeans-based Ranking for Public Parking
    X_public = public_candidates[['rating', 'price', 'calc_distance']].to_numpy()
    if len(X_public) == 0:
        top1_public = pd.DataFrame()
    else:
        kmeans_public = KMeans(n_clusters=3, random_state=42, n_init=10)
        kmeans_public.fit(X_public)
        public_candidates['cluster'] = kmeans_public.predict(X_public)
        user_vector_public = get_user_vector_for_type(uid, history_data, "PUB")
        user_cluster_public = kmeans_public.predict(user_vector_public)[0]
        public_in_cluster = public_candidates[public_candidates['cluster'] == user_cluster_public].copy()
        ranked_public = rank_candidates(public_in_cluster, user_vector_public)
        top1_public = ranked_public.head(1)
    
    return render_template('results.html', uid=uid,
                           top15_private=top15_private.to_dict(orient='records'),
                           top1_public=top1_public.to_dict(orient='records'),
                           override_address=user_address,
                           max_price=max_price,
                           max_distance=max_distance,
                           start_time=start_time,
                           end_time=end_time)

# ---------------------------
# Run the App
# ---------------------------
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8000, debug=True)