# Customer Service Line Viewer

A Flask-based web application for viewing, searching, and managing customer service line information with interactive maps and detailed asset data.

## Features

- **Data Table with Search**: Browse customer accounts with real-time search by Account Number or Service Address
- **Detailed Asset View**: Double-click any row to see comprehensive asset information and service line material
- **Interactive Map**: View asset locations on an interactive Leaflet map with color-coded markers
- **Service Line Status Indicators**:
  - 🟢 **Green** - Safe materials (Copper, Plastic, Non-Lead)
  - 🟡 **Yellow** - Materials requiring replacement (Lead, Galvanized)
  - ⚪ **Gray** - Unknown or unverified materials
- **Update Service Line Data**: Submit corrections for unknown or unsafe service line materials
- **Profanity Filtering**: Comprehensive content validation on Location Description submissions
- **User-Friendly UI**: Responsive design with pagination, real-time validation, and loading states

## Tech Stack

- **Backend**: Python 3.x with Flask
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js with OpenStreetMap tiles
- **API Integration**: ArcGIS REST API for feature services
- **Styling**: Custom CSS with responsive design

## Project Structure

```
example_table_application/
├── app.py                  # Main Flask application
├── api_handlers.py         # Request handlers and utilities
├── config.py               # Configuration (credentials, URLs)
├── profanity_filter.py     # Content validation and filtering
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html          # Main HTML template
├── static/
│   ├── css/
│   │   └── styles.css      # Application styling
│   └── js/
│       └── main.js         # Client-side interactivity
└── README.md               # This file
```

## Installation

### Prerequisites

- Python 3.8+
- pip (Python package manager)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Setup Steps

1. **Clone or download the repository**:
   ```bash
   git clone <repository-url>
   cd example_table_application
   ```

2. **Create a virtual environment** (recommended):
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**:
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure credentials**:
   - Edit `config.py` with your ArcGIS credentials and feature service URLs:
     ```python
     _un = "your_arcgis_username"
     _pw = "your_arcgis_password"
     data_query_url1 = "https://your-arcgis-service.com/..."
     data_query_url2 = "https://your-arcgis-service.com/..."
     data_add_url1 = "https://your-arcgis-service.com/..."
     ```

6. **Run the application**:
   ```bash
   python app.py
   ```

7. **Open in browser**:
   - Navigate to `http://localhost:5000`

## Usage

### Searching for Records

1. Use the dropdown to select your search field:
   - **Account Number**: Search by customer account/PTR
   - **Service Address**: Search by service location address

2. Type your search query in the search box
   - Searches are case-insensitive
   - Partial matches are supported (e.g., "123" finds "12345" and "91234")
   - Results update automatically as you type

3. Browse paginated results (15 records per page)

### Viewing Asset Details

1. **Double-click** any row in the table to open the detail modal

2. The modal displays:
   - Customer Service Line Material (with color-coded indicator)
   - Asset Number
   - Antenna Number
   - Location Description
   - Interactive map showing the asset location

3. **Legend** (bottom-right of map):
   - Shows what each marker color represents
   - Displays loading and unknown states

### Updating Service Line Information

If the service line material is **Unknown** or marked for **Replacement**:

1. Click the **"Update Info"** button (top-right of the detail modal)

2. A form will appear with fields for:
   - **Asset Number** (read-only if existing)
   - **Antenna Number** (read-only if existing)
   - **Service Line Material** (dropdown: Plastic, Copper, Non-Lead)
   - **Location Description** (max 100 characters)

3. **Fill in the form**:
   - Select the correct service line material
   - Add any relevant location notes
   - Character counter shows usage (turns red near limit)

4. **Submit**:
   - A loading spinner appears during submission
   - On success, a confirmation message displays with a checkmark
   - Click "Done" to close the form
   - The modal updates with the new information
   - The map marker color updates to reflect the new material

### Handling Validation Errors

- **Character limit exceeded**: Location Description is limited to 100 characters
- **Inappropriate language detected**: Submission rejected if profanity is detected
- **Invalid character patterns**: Rejects suspicious patterns (e.g., excessive repetition)
- **Missing required fields**: Asset Number and Service Line Material are required
- **Invalid number format**: Asset Number and Antenna Number must be valid integers

## API Endpoints

### GET `/api/data`
Fetches all customer records for the data table.

**Response**:
```json
[
  {
    "id": "PTR_123",
    "address": "123 Main St",
    "globalid": "{12345-67890}",
    "latitude": 40.7128,
    "longitude": -74.0060
  }
]
```

### GET `/api/record?globalid={globalid}`
Fetches detailed asset information for a specific record.

**Response**:
```json
{
  "attributes": {
    "customerSL": "Copper",
    "AssetID": 1001,
    "MXUNumber": 5,
    "LOCDESC": "Under sidewalk, north side"
  }
}
```

### POST `/api/record`
Submits updated service line information.

**Request Body**:
```json
{
  "AssetID": 1001,
  "MXUNumber": 5,
  "customerSL": "Plastic",
  "LOCDESC": "Updated location info",
  "meterGlobal": "{12345-67890}"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "attributes": {
    "customerSL": "Plastic",
    "AssetID": 1001,
    "MXUNumber": 5,
    "LOCDESC": "Updated location info",
    "meterGlobal": "{12345-67890}"
  },
  "objectId": 12345,
  "globalId": "{12345-67890}"
}
```

## Configuration

### `config.py`
Contains all configuration variables:
- ArcGIS credentials (`_un`, `_pw`)
- Feature service query URLs (`data_query_url1`, `data_query_url2`)
- Feature service add URL (`data_add_url1`)

### `profanity_filter.py`
Defines profanity patterns and filtering logic. To add more filtered terms:
1. Add regex patterns to `PROFANITY_PATTERNS`
2. Update character substitutions in `CHAR_SUBSTITUTIONS` if needed

### `api_handlers.py`
Contains all business logic:
- Token generation
- Data fetching and transformation
- Input validation
- Feature submission

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Tips

- Searches are performed client-side for instant results
- Pagination limits data table to 15 records per page
- API calls are optimized with specific field queries
- Map tiles are cached by browser

## Troubleshooting

### Application won't start
- Verify Python 3.8+ is installed: `python --version`
- Check all dependencies are installed: `pip install -r requirements.txt`
- Ensure no other application is using port 5000

### Can't connect to ArcGIS services
- Verify credentials in `config.py` are correct
- Check internet connection
- Ensure feature service URLs are valid and accessible
- Verify ArcGIS account has proper permissions

### Search not working
- Clear browser cache and reload
- Check browser console for errors (F12)
- Verify data was loaded successfully

### Map not displaying
- Check browser console for errors
- Verify latitude/longitude values are valid
- Ensure Leaflet.js CDN is accessible

### Form submission failing
- Check Location Description doesn't contain profanity
- Verify Asset Number and Antenna Number are valid integers
- Ensure GlobalID is properly set (check browser console)
- Verify ArcGIS service has add permissions

## Security Considerations

- ArcGIS credentials are stored server-side in `config.py`
- Never commit `config.py` with credentials to version control
- Use environment variables for sensitive data in production
- All user input is validated and sanitized
- Profanity filter prevents inappropriate content submission

## Development

### Running in Debug Mode
The application runs in debug mode by default. For production:
1. Set `app.run(debug=False)` in `app.py`
2. Use a production WSGI server (Gunicorn, uWSGI)
3. Set environment variables for configuration

### Adding New Fields
To add new fields to submissions:
1. Update the form in `templates/index.html`
2. Add validation logic to `api_handlers.py`
3. Update the submission dictionary structure

### Extending Search Functionality
To search additional fields:
1. Add field to dropdown in `templates/index.html`
2. Update switch case in `main.js` filterData function
3. Update API query fields in `api_handlers.py`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

MIT License grants permission to use, modify, and distribute this software freely, provided the license and copyright notice are included.

## Support

For issues, questions, or suggestions, please contact:
- Project Owner: AustinA-py
- Repository: example_table_application

## Changelog

### Version 1.0 (October 2025)
- Initial release
- Core features: search, view details, update service line information
- Interactive map with status indicators
- Comprehensive input validation and profanity filtering
- Responsive design for desktop and tablet
