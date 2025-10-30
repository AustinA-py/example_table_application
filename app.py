from flask import Flask, render_template, jsonify
import requests
from config import ARCGIS_USERNAME, ARCGIS_PASSWORD

app = Flask(__name__)

def generate_token():
    token_url = "https://arcgis.com/sharing/rest/generateToken"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {
        "username": ARCGIS_USERNAME,
        "password": ARCGIS_PASSWORD,
        "referer": "https://arcgis.com",
        "f": "json"
    }

    response = requests.post(token_url, headers=headers, data=data)
    if response.status_code == 200:
        return response.json().get("token")
    return None

def get_feature_service_data(token):
    if not token:
        return None
    
    feature_url = "https://services.arcgis.com/dzhPRiWP0DwuzONX/arcgis/rest/services/Meter_Overhaul24/FeatureServer/0/query"
    params = {
        "where": "1=1",
        "outFields": "PTR,ServiceAddress,lastAMR,coory,coorx",
        "returnGeometry": "false",
        "token": token,
        "f": "json"
    }

    response = requests.get(feature_url, params=params)
    if response.status_code == 200:
        return response.json()
    return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    token = generate_token()
    feature_data = get_feature_service_data(token)
    
    if not feature_data:
        return jsonify({"error": "Failed to fetch data"}), 500
    
    # Transform the data for the table
    transformed_data = []
    for feature in feature_data.get("features", []):
        attrs = feature.get("attributes", {})
        transformed_data.append({
            "id": attrs.get("PTR"),
            "address": attrs.get("ServiceAddress"),
            "lastReading": attrs.get("lastAMR"),
            "latitude": attrs.get("coory"),
            "longitude": attrs.get("coorx")
        })
    
    return jsonify(transformed_data)

if __name__ == '__main__':
    app.run(debug=True)