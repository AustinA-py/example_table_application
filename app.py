from flask import Flask, render_template, jsonify, request
import requests
import re
from config import _un, _pw, data_query_url1, data_query_url2, data_add_url1
from profanity_filter import contains_profanity


app = Flask(__name__)

def generate_token():
    token_url = "https://arcgis.com/sharing/rest/generateToken"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {
        "username": _un,
        "password": _pw,
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
    
    feature_url = data_query_url1
    params = {
        "where": "1=1",
        "outFields": "PTR,ServiceAddress,GlobalID,coory,coorx",
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
        # Include GlobalID with each record (hidden in UI) and drop lastAMR
        transformed_data.append({
            "id": attrs.get("PTR"),
            "address": attrs.get("ServiceAddress"),
            "globalid": attrs.get("GlobalID"),
            "latitude": attrs.get("coory"),
            "longitude": attrs.get("coorx")
        })
    
    return jsonify(transformed_data)


@app.route('/api/record', methods=['GET', 'POST'])
def handle_record():
    if request.method == 'POST':
        try:
            # Get form data from request
            form_data = request.get_json()
            
            # Validate required fields
            if not form_data:
                return jsonify({"error": "No form data provided"}), 400
            
            # Validate Location Description
            loc_desc = form_data.get('LOCDESC', '')
            
            # Clean the input
            loc_desc = re.sub(r'\s+', ' ', loc_desc)  # Normalize whitespace
            loc_desc = loc_desc.strip()  # Remove leading/trailing whitespace
            
            # Check length after cleaning
            if len(loc_desc) > 100:
                return jsonify({"error": "Location Description must not exceed 100 characters"}), 400
            
            # Check for repeated characters that might be trying to bypass filter
            if re.search(r'(.)\1{3,}', loc_desc):  # Detects 4 or more repeated characters
                return jsonify({"error": "Location Description contains invalid character patterns"}), 400
                
            # Check for profanity
            if contains_profanity(loc_desc):
                return jsonify({"error": "Location Description contains inappropriate language"}), 400
                
            # Update the cleaned version in the form data
            form_data['LOCDESC'] = loc_desc
            
            # Convert Asset Number and Antenna Number to integers
            try:
                if form_data.get('AssetID'):
                    form_data['AssetID'] = int(form_data['AssetID'])
                if form_data.get('MXUNumber'):
                    form_data['MXUNumber'] = int(form_data['MXUNumber'])
            except ValueError:
                return jsonify({"error": "Asset Number and Antenna Number must be valid integers"}), 400

            # Validate meterGlobal is present
            if not form_data.get('meterGlobal'):
                return jsonify({"error": "Missing GlobalID for record update"}), 400

            # Construct the submission dictionary
            submission_dict = {
                "customerSL": form_data.get('customerSL'),
                "AssetID": form_data.get('AssetID'),
                "MXUNumber": form_data.get('MXUNumber'),
                "LOCDESC": form_data.get('LOCDESC'),
                "meterGlobal": form_data.get('meterGlobal')  # Include the GlobalID
            }

            # Get token
            token = generate_token()
            if not token:
                return jsonify({"error": "Failed to generate token"}), 500

            import json

            # Convert features to JSON string
            features_json = json.dumps([{"attributes": submission_dict}])

            # Prepare the request parameters
            params = {
                'features': features_json,  # Send features as JSON string
                'token': token,
                'f': 'json'  # Required format parameter
            }

            # Make the request to add the feature
            # Use x-www-form-urlencoded content type as required by the API
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            response = requests.post(data_add_url1, data=params, headers=headers)
            
            if response.status_code != 200:
                return jsonify({"error": "Failed to add feature", "details": "Server returned status " + str(response.status_code)}), 500

            result = response.json()
            
            # Check for addResults array in response
            add_results = result.get('addResults', [])
            if not add_results:
                return jsonify({
                    "error": "No results returned from server",
                    "details": result
                }), 500

            # Get the first result (we only submit one feature)
            feature_result = add_results[0]
            
            if not feature_result.get('success', False):
                # Extract error details if present
                error = feature_result.get('error', {})
                return jsonify({
                    "error": "Failed to add feature",
                    "code": error.get('code'),
                    "description": error.get('description', 'Unknown error occurred')
                }), 500

            # Success case - return the created feature details
            return jsonify({
                "success": True,
                "attributes": submission_dict,
                "objectId": feature_result.get('objectId'),
                "globalId": feature_result.get('globalId')
            })

        except Exception as e:
            app.logger.error(f"Error processing form submission: {str(e)}")
            return jsonify({"error": "Internal server error"}), 500

    # If method is GET, handle the existing get_record functionality
    """Query data_query_url2 for the record matching the provided GlobalID.

    Query params:
      - globalid: the GlobalID of the record to look up (required)
    """
    globalid = request.args.get('globalid')
    if not globalid:
        return jsonify({"error": "globalid query parameter required"}), 400

    token = generate_token()
    if not token:
        return jsonify({"error": "Failed to generate token"}), 500

    # Build the where clause - ensure the GlobalID is quoted
    where_clause = f"meterGlobal='{globalid}'"
    params = {
        "where": where_clause,
        "outFields": "LOCDESC,AssetID,MXUNumber,customerSL",
        "returnGeometry": "false",
        "orderByFields": "OBJECTID DESC",
        "resultRecordCount": "1",
        "token": token,
        "f": "json"
    }

    response = requests.get(data_query_url2, params=params)
    if response.status_code != 200:
        return jsonify({"error": "Failed to query feature service"}), 500

    data = response.json()
    features = data.get("features", [])
    if not features:
        return jsonify({"attributes": {}}), 404

    attrs = features[0].get("attributes", {})
    return jsonify({"attributes": attrs})

if __name__ == '__main__':
    app.run(debug=True)