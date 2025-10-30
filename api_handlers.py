"""
API request handlers and utilities for the Customer Service Line Viewer application.
"""
import os
import requests
import re
import json
from flask import jsonify, request
from profanity_filter import contains_profanity

# Load environment variables
CLIENT_ID = os.getenv('CLIENT_ID')
CLIENT_SECRET = os.getenv('CLIENT_SECRET')
DATA_QUERY_URL1 = os.getenv('DATA_QUERY_URL1')
DATA_QUERY_URL2 = os.getenv('DATA_QUERY_URL2')
DATA_ADD_URL1 = os.getenv('DATA_ADD_URL1')

# Validate that all required environment variables are set
required_env_vars = {
    'CLIENT_ID': CLIENT_ID,
    'CLIENT_SECRET': CLIENT_SECRET,
    'DATA_QUERY_URL1': DATA_QUERY_URL1,
    'DATA_QUERY_URL2': DATA_QUERY_URL2,
    'DATA_ADD_URL1': DATA_ADD_URL1
}

for var_name, var_value in required_env_vars.items():
    if not var_value:
        raise ValueError(f"Missing required environment variable: {var_name}")


def generate_token():
    """Generate an ArcGIS token for API authentication."""
    token_url = "https://arcgis.com/sharing/rest/oauth2/token"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {
        "grant_type" : "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "f ": "json"
    }

    response = requests.post(token_url, headers=headers, data=data)
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


def get_feature_service_data(token):
    """Fetch all features from the primary feature service."""
    if not token:
        return None
    
    params = {
        "where": "1=1",
        "outFields": "PTR,ServiceAddress,GlobalID,coory,coorx",
        "returnGeometry": "false",
        "token": token,
        "f": "json"
    }

    response = requests.get(DATA_QUERY_URL1, params=params)
    if response.status_code == 200:
        return response.json()
    return None


def transform_features_for_table(feature_data):
    """Transform raw feature data into the format expected by the data table."""
    if not feature_data:
        return []
    
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
    
    return transformed_data


def validate_location_description(loc_desc):
    """
    Validate and clean the Location Description field.
    Returns a tuple: (is_valid, cleaned_value_or_error_message)
    """
    if not isinstance(loc_desc, str):
        loc_desc = str(loc_desc)
    
    # Clean the input
    loc_desc = re.sub(r'\s+', ' ', loc_desc)  # Normalize whitespace
    loc_desc = loc_desc.strip()  # Remove leading/trailing whitespace
    
    # Check length after cleaning
    if len(loc_desc) > 100:
        return False, "Location Description must not exceed 100 characters"
    
    # Check for repeated characters that might be trying to bypass filter
    if re.search(r'(.)\1{3,}', loc_desc):  # Detects 4 or more repeated characters
        return False, "Location Description contains invalid character patterns"
    
    # Check for profanity
    if contains_profanity(loc_desc):
        return False, "Location Description contains inappropriate language"
    
    return True, loc_desc


def get_data_handler():
    """Handle GET /api/data - fetch and transform all feature data."""
    token = generate_token()
    feature_data = get_feature_service_data(token)
    
    if not feature_data:
        return jsonify({"error": "Failed to fetch data"}), 500
    
    transformed_data = transform_features_for_table(feature_data)
    return jsonify(transformed_data)


def get_record_handler():
    """Handle GET /api/record - fetch a single record by GlobalID."""
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

    response = requests.get(DATA_QUERY_URL2, params=params)
    if response.status_code != 200:
        return jsonify({"error": "Failed to query feature service"}), 500

    data = response.json()
    features = data.get("features", [])
    if not features:
        return jsonify({"attributes": {}}), 404

    attrs = features[0].get("attributes", {})
    return jsonify({"attributes": attrs})


def post_record_handler():
    """Handle POST /api/record - submit updated service line information."""
    try:
        # Get form data from request
        form_data = request.get_json()
        
        # Validate required fields
        if not form_data:
            return jsonify({"error": "No form data provided"}), 400
        
        # Validate Location Description
        loc_desc = form_data.get('LOCDESC', '')
        is_valid, result = validate_location_description(loc_desc)
        if not is_valid:
            return jsonify({"error": result}), 400
        
        # Update the cleaned version in the form data
        form_data['LOCDESC'] = result
        
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
        response = requests.post(DATA_ADD_URL1, data=params, headers=headers)
        
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
        import logging
        logging.error(f"Error processing form submission: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
