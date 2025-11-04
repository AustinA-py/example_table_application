document.addEventListener('DOMContentLoaded', function() {
    const ITEMS_PER_PAGE = 15;
    let currentPage = 1;
    let allData = [];
    let filteredData = [];

    // Function to filter data based on search input and field
    function filterData(searchTerm) {
        searchTerm = (searchTerm || '').toLowerCase().trim();
        const searchField = document.getElementById('searchField').value;
        
        if (!searchTerm) {
            filteredData = [...allData];
        } else {
            filteredData = allData.filter(item => {
                let fieldValue;
                switch(searchField) {
                    case 'ptr':
                        fieldValue = item.id;
                        break;
                    case 'address':
                        fieldValue = item.address;
                        break;
                    default:
                        fieldValue = '';
                }
                return String(fieldValue || '').toLowerCase().includes(searchTerm);
            });
        }
        currentPage = 1;
        populateTable(currentPage);
    }

    // Function to update search placeholder based on selected field
    function updateSearchPlaceholder() {
        const searchField = document.getElementById('searchField');
        const searchInput = document.getElementById('amrSearch');
        const fieldNames = {
            'ptr': 'Account Number',
            'address': 'Service Address'
        };
        searchInput.placeholder = `Search by ${fieldNames[searchField.value]}...`;
    }

    // Function to populate table with paginated data
    function populateTable(page) {
        const tableBody = document.querySelector('#data-table tbody');
        tableBody.innerHTML = '';

        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedData = filteredData.slice(startIndex, endIndex);

        paginatedData.forEach(item => {
            const row = document.createElement('tr');
            // store hidden data on the row for easy access when double-clicked
            row.dataset.globalid = item.globalid || '';
            row.dataset.lat = item.latitude || '';
            row.dataset.lon = item.longitude || '';

            // globalid is present in the record but intentionally not shown in the table
            row.innerHTML = `
                <td>${item.id || 'N/A'}</td>
                <td>${item.address || 'N/A'}</td>
                <td>${item.latitude || 'N/A'}</td>
                <td>${item.longitude || 'N/A'}</td>
            `;

            // double-click to open record popup
            row.addEventListener('dblclick', async () => {
                const gid = row.dataset.globalid;
                const lat = row.dataset.lat;
                const lon = row.dataset.lon;
                const acctNum = item.id;
                const address = item.address;
                const recordTitle = `${acctNum} | ${address}`;

                if (!gid) {
                    alert('No GlobalID available for this record.');
                    return;
                }

                // Store GlobalID for form submission
                window.currentGlobalId = gid;
                
                // Show modal immediately with loading state and map
                showRecordModal(null, lat, lon, recordTitle);

                try {
                    const resp = await fetch(`/api/record?globalid=${encodeURIComponent(gid)}`);
                    if (!resp.ok) {
                        // If the service returns 404 for no matching asset data,
                        // update the modal to show "No Asset Data"
                        if (resp.status === 404) {
                            updateModalAttributes({});
                            return;
                        }

                        const err = await resp.json().catch(() => ({}));
                        updateModalAttributes(null, 'Failed to fetch record details: ' + (err.error || resp.statusText));
                        return;
                    }

                    const json = await resp.json();
                    const attrs = json.attributes || {};

                    // If the response contains no attributes, show "No Asset Data"
                    if (!attrs || Object.keys(attrs).length === 0) {
                        updateModalAttributes({});
                    } else {
                        updateModalAttributes(attrs);
                    }
                } catch (e) {
                    console.error('Error fetching record:', e);
                    updateModalAttributes(null, 'Error fetching record details. See console for details.');
                }
            });

            tableBody.appendChild(row);
        });

        updatePaginationControls();
    }

    // Update pagination controls and info
    function updatePaginationControls() {
        const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');

        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage === totalPages;
        pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${filteredData.length} records)`;
    }

    // Event listeners for pagination buttons
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            populateTable(currentPage);
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            populateTable(currentPage);
        }
    });

    // Add search input event listener with debounce
    const searchInput = document.getElementById('amrSearch');
    const searchField = document.getElementById('searchField');
    let debounceTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            filterData(e.target.value);
        }, 300); // 300ms delay for better performance
    });

    // Add event listener for search field change
    searchField.addEventListener('change', () => {
        updateSearchPlaceholder();
        filterData(searchInput.value);
    });

    // Initialize placeholder
    updateSearchPlaceholder();

    // Function to set loading state
    function setLoading(isLoading) {
        const tableContainer = document.querySelector('.table-container');
        if (isLoading) {
            tableContainer.classList.add('loading');
        } else {
            tableContainer.classList.remove('loading');
        }
    }

    // Splash modal handling
    function showSplashIfNeeded() {
        try {
            const hide = window.localStorage.getItem('hideSplash');
            if (hide === 'true') return;
        } catch (e) {
            // ignore localStorage errors
        }
        const splash = document.getElementById('splash-modal');
        if (splash) {
            splash.classList.add('show');
        }
    }

    function closeSplash(savePreference) {
        const splash = document.getElementById('splash-modal');
        if (splash) {
            splash.classList.remove('show');
        }
        if (savePreference) {
            try { window.localStorage.setItem('hideSplash','true'); } catch (e) { }
        }
    }

    // Function to fetch data from our API
    async function fetchData() {
        setLoading(true);
        try {
            const response = await fetch('/api/data');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            allData = await response.json();
            filteredData = [...allData]; // Initialize filtered data with all records
            populateTable(currentPage);
        } catch (error) {
            console.error('Error fetching data:', error);
            document.querySelector('#data-table tbody').innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: red;">
                        Error loading data. Please try again later.
                    </td>
                </tr>
            `;
            document.getElementById('prevPage').disabled = true;
            document.getElementById('nextPage').disabled = true;
            document.getElementById('pageInfo').textContent = 'Error loading data';
        } finally {
            setLoading(false);
        }
    }

    // Modal and map handling for record popup
    let modalMap = null;
    let currentMarker = null;

    // Create custom icons for different states
    const greenIcon = L.divIcon({
        className: 'custom-div-icon',
        html: '<div style="background-color: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const warningIcon = L.divIcon({
        className: 'custom-div-icon',
        html: '<div style="background-color: #FFD700; width: 24px; height: 24px; transform: rotate(45deg); border: 2px solid white;">' +
              '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); color: black; font-weight: bold;">!</div></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const loadingIcon = L.divIcon({
        className: 'custom-div-icon',
        html: '<div style="background-color: #2196F3; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white;">' +
              '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: bold;"></div></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const unknownIcon = L.divIcon({
        className: 'custom-div-icon',
        html: '<div style="background-color: #808080; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white;">' +
              '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: bold;">?</div></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    function getMarkerIcon(attributes) {
        if (!attributes || Object.keys(attributes).length === 0) {
            return unknownIcon;
        }

        const material = attributes.customerSL;
        if (!material) return unknownIcon;

        const materialLower = material.toLowerCase();
        
        // Safe materials get green circle
        if (['copper', 'plastic', 'non-lead'].some(safe => materialLower.includes(safe))) {
            return greenIcon;
        }
        // Lead or Galvanized requiring replacement get warning symbol
        else if (['lead', 'galvanized requiring replacement'].some(unsafe => materialLower.includes(unsafe))) {
            return warningIcon;
        }
        
        return unknownIcon;
    }
    function showRecordModal(attributes, lat, lon, recordTitle) {
        const modal = document.getElementById('record-modal');
        const attrsContainer = document.getElementById('record-attributes');
        const modalTitle = document.getElementById('modal-title');

        // Set the title if provided (on initial show it won't be)
        if (recordTitle) {
            modalTitle.textContent = recordTitle;
        }

        // Clear previous
        attrsContainer.innerHTML = '';

        // Show loading spinner if attributes is null (initial load)
        if (attributes === null) {
            attrsContainer.innerHTML = `
                <div class="attributes-loading">
                    <div class="spinner"></div>
                    <div>Loading record details...</div>
                </div>
            `;
        } else if (!attributes || Object.keys(attributes).length === 0) {
            // Per requirement: display "No Asset Data" when no record returned
            attrsContainer.innerHTML = '<div class="no-attrs">No Asset Data</div>';
        } else {
            for (const [key, value] of Object.entries(attributes)) {
                const row = document.createElement('div');
                row.className = 'attr-row';
                row.innerHTML = `<strong>${key}</strong>: <span>${value === null ? '' : value}</span>`;
                attrsContainer.appendChild(row);
            }
        }

        // Reset tabs to default (Record Info tab)
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Activate first tab (Record Info)
        const firstTabBtn = document.querySelector('.tab-btn[data-tab="record-info"]');
        const firstTabPane = document.getElementById('record-info');
        if (firstTabBtn) firstTabBtn.classList.add('active');
        if (firstTabPane) firstTabPane.classList.add('active');

        // Show modal
        modal.classList.remove('hidden');

        // Initialize or refresh Leaflet map
        const mapContainer = document.getElementById('modal-map');
        mapContainer.innerHTML = '';
        try {
            if (modalMap) {
                modalMap.remove();
                modalMap = null;
            }

            const latNum = parseFloat(lat);
            const lonNum = parseFloat(lon);
            const center = (!isNaN(latNum) && !isNaN(lonNum)) ? [latNum, lonNum] : [0, 0];

            modalMap = L.map(mapContainer).setView(center, (!isNaN(latNum) && !isNaN(lonNum)) ? 13 : 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(modalMap);

            if (!isNaN(latNum) && !isNaN(lonNum)) {
                // Remove existing marker if any
                if (currentMarker) {
                    currentMarker.remove();
                }
                
                // Add new marker with loading icon initially
                currentMarker = L.marker(center, { icon: loadingIcon }).addTo(modalMap);
                
                // Add legend to the map
                const legend = L.control({position: 'bottomright'});
                legend.onAdd = function(map) {
                    const div = L.DomUtil.create('div', 'info legend');
                    div.style.backgroundColor = 'white';
                    div.style.padding = '10px';
                    div.style.border = '2px solid rgba(0,0,0,0.2)';
                    div.style.borderRadius = '4px';
                    
                    div.innerHTML = `
                        <div style="margin-bottom: 5px;"><strong>Service Line Material</strong></div>
                        <div style="display: flex; align-items: center; margin-bottom: 3px;">
                            <div style="background-color: #4CAF50; width: 15px; height: 15px; border-radius: 50%; margin-right: 5px;"></div>
                            <span>Safe Material</span>
                        </div>
                        <div style="display: flex; align-items: center; margin-bottom: 3px;">
                            <div style="background-color: #FFD700; width: 15px; height: 15px; transform: rotate(45deg); margin-right: 5px;"></div>
                            <span>Needs Replacement</span>
                        </div>
                        <div style="display: flex; align-items: center; margin-bottom: 3px;">
                            <div style="background-color: #808080; width: 15px; height: 15px; border-radius: 50%; margin-right: 5px;"></div>
                            <span>Unknown</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <div style="background-color: #2196F3; width: 15px; height: 15px; border-radius: 50%; margin-right: 5px;"></div>
                            <span>Loading</span>
                        </div>
                    `;
                    return div;
                };
                legend.addTo(modalMap);
                
                // Sometimes Leaflet needs a moment to correctly size when the container was hidden.
                setTimeout(() => {
                    try { modalMap.invalidateSize(); } catch (e) { /* ignore */ }
                }, 100);
            }
        } catch (e) {
            console.error('Error initializing map in modal:', e);
            mapContainer.innerHTML = '<div style="color: red;">Map failed to load.</div>';
        }
    }

    function closeRecordModal() {
        const modal = document.getElementById('record-modal');
        modal.classList.add('hidden');
        if (modalMap) {
            // This will remove the map and all its controls including the legend
            modalMap.remove();
            modalMap = null;
            currentMarker = null;
        }
    }

    // Update modal attributes section and map marker icon
    function updateModalAttributes(attributes, errorMessage) {
        const attrsContainer = document.getElementById('record-attributes');
        const updateButton = document.getElementById('updateButton');
        
        if (errorMessage) {
            attrsContainer.innerHTML = `<div class="no-attrs" style="color: red;">${errorMessage}</div>`;
            updateButton.style.display = 'block';
            return;
        }

        if (!attributes || Object.keys(attributes).length === 0) {
            attrsContainer.innerHTML = '<div class="no-attrs">No Asset Data</div>';
            if (currentMarker) {
                currentMarker.setIcon(unknownIcon);
            }
            updateButton.style.display = 'block';
            return;
        }

        // Define field order and labels
        const fieldMapping = [
            { key: 'customerSL', label: 'Customer Service Line Material' },
            { key: 'AssetID', label: 'Asset Number' },
            { key: 'MXUNumber', label: 'Antenna Number' },
            { key: 'LOCDESC', label: 'Location Description' }
        ];

        // Check if update button should be shown based on service line material
        const material = attributes.customerSL ? attributes.customerSL.toLowerCase() : '';
        const showUpdateButton = !material || 
            material.includes('lead') || 
            material.includes('galvanized requiring replacement');
        updateButton.style.display = showUpdateButton ? 'block' : 'none';

        // Update marker icon based on service line material
        if (currentMarker) {
            currentMarker.setIcon(getMarkerIcon(attributes));
        }

        // Store current attributes for form pre-fill
        window.currentAttributes = attributes;

        attrsContainer.innerHTML = '';
        for (const field of fieldMapping) {
            const value = attributes[field.key];
            const row = document.createElement('div');
            row.className = 'attr-row';
            row.innerHTML = `<strong>${field.label}:</strong> <span>${value === null ? '' : value}</span>`;
            attrsContainer.appendChild(row);
        }
    }

    // Modal and form handlers
    document.addEventListener('click', (e) => {
        if (e.target && (e.target.id === 'modalClose' || e.target.id === 'modalOverlay')) {
            closeRecordModal();
        }
    });

    // Character counter for Location Description
    document.getElementById('locDesc').addEventListener('input', function(e) {
        const counter = document.getElementById('charCount');
        const currentLength = this.value.length;
        counter.textContent = currentLength;
        
        // Visual feedback when approaching limit
        if (currentLength >= 90) {
            counter.style.color = '#ff4444';
        } else {
            counter.style.color = '#666';
        }
    });

    // Update button click handler
    document.getElementById('updateButton').addEventListener('click', () => {
        const formOverlay = document.getElementById('updateFormOverlay');
        formOverlay.classList.add('show');
        
        // Pre-fill form with current data if available
        if (window.currentAttributes) {
            const assetIdField = document.getElementById('assetId');
            const mxuNumberField = document.getElementById('mxuNumber');
            
            // Store the GlobalID in a data attribute on the form
            document.getElementById('serviceLineForm').dataset.globalId = window.currentGlobalId || '';
            
            // Set values
            assetIdField.value = window.currentAttributes.AssetID || '';
            mxuNumberField.value = window.currentAttributes.MXUNumber || '';
            document.getElementById('customerSL').value = window.currentAttributes.customerSL || '';
            document.getElementById('locDesc').value = window.currentAttributes.LOCDESC || '';
            
            // Make fields readonly if they have existing values
            if (window.currentAttributes.AssetID) {
                assetIdField.readOnly = true;
                assetIdField.style.backgroundColor = '#f5f5f5';
                assetIdField.style.cursor = 'not-allowed';
            }
            if (window.currentAttributes.MXUNumber) {
                mxuNumberField.readOnly = true;
                mxuNumberField.style.backgroundColor = '#f5f5f5';
                mxuNumberField.style.cursor = 'not-allowed';
            }
        } else {
            // Reset readonly and styles if no existing data
            const assetIdField = document.getElementById('assetId');
            const mxuNumberField = document.getElementById('mxuNumber');
            
            assetIdField.readOnly = false;
            assetIdField.style.backgroundColor = '';
            assetIdField.style.cursor = '';
            
            mxuNumberField.readOnly = false;
            mxuNumberField.style.backgroundColor = '';
            mxuNumberField.style.cursor = '';
        }
    });

    // Cancel button click handler
    document.getElementById('cancelUpdate').addEventListener('click', () => {
        document.getElementById('updateFormOverlay').classList.remove('show');
        document.getElementById('serviceLineForm').reset();
        
        // Reset readonly states and styles
        const assetIdField = document.getElementById('assetId');
        const mxuNumberField = document.getElementById('mxuNumber');
        
        assetIdField.readOnly = false;
        assetIdField.style.backgroundColor = '';
        assetIdField.style.cursor = '';
        
        mxuNumberField.readOnly = false;
        mxuNumberField.style.backgroundColor = '';
        mxuNumberField.style.cursor = '';
        
        // Reset form state
        document.getElementById('formContent').style.display = 'block';
        document.getElementById('formSuccess').classList.remove('show');
        document.getElementById('formLoadingOverlay').classList.remove('show');
        document.querySelector('#serviceLineForm button[type="submit"]').disabled = false;
    });

    // Form submit handler
    document.getElementById('serviceLineForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('formLoadingOverlay');
        const formContent = document.getElementById('formContent');
        const formSuccess = document.getElementById('formSuccess');
        const submitButton = e.target.querySelector('button[type="submit"]');
        
        loadingOverlay.classList.add('show');
        submitButton.disabled = true;
        
        const formData = {
            AssetID: document.getElementById('assetId').value,
            MXUNumber: document.getElementById('mxuNumber').value,
            customerSL: document.getElementById('customerSL').value,
            LOCDESC: document.getElementById('locDesc').value,
            meterGlobal: e.target.dataset.globalId, // Include the GlobalID from the form's data attribute
        };

        try {
            const response = await fetch('/api/record', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update record');
            }

            // Update the modal with new data
            updateModalAttributes(formData);
            
            // Hide loading overlay and form content, show success message
            loadingOverlay.classList.remove('show');
            formContent.style.display = 'none';
            formSuccess.classList.add('show');

            // Reset form for next use
            document.getElementById('serviceLineForm').reset();

        } catch (error) {
            console.error('Error updating record:', error);
            alert(error.message || 'Failed to update record. Please try again.');
            
            // Hide loading overlay and re-enable submit button
            loadingOverlay.classList.remove('show');
            submitButton.disabled = false;
        }
    });

    // Success "Done" button handler
    document.getElementById('successDone').addEventListener('click', () => {
        // Hide the form overlay entirely
        document.getElementById('updateFormOverlay').classList.remove('show');
        // Reset the form state for next use
        document.getElementById('formContent').style.display = 'block';
        document.getElementById('formSuccess').classList.remove('show');
    });

    // Fetch and populate data
    // Show the splash (if not opted out) then fetch data
    showSplashIfNeeded();
    fetchData();

    // Tab switching functionality
    function initializeTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remove active class from all buttons and panes
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // Add active class to clicked button and corresponding pane
                button.classList.add('active');
                const targetPane = document.getElementById(targetTab);
                if (targetPane) {
                    targetPane.classList.add('active');
                    
                    // If switching to map view, refresh the map
                    if (targetTab === 'map-view' && modalMap) {
                        setTimeout(() => {
                            modalMap.invalidateSize();
                        }, 100);
                    }
                }
            });
        });
    }

    // Initialize tabs when DOM is ready
    initializeTabs();

    // Splash event handlers
    const splashOk = document.getElementById('splashOk');
    const splashClose = document.getElementById('splashClose');
    const dontShow = document.getElementById('dontShowSplash');
    if (splashOk) {
        splashOk.addEventListener('click', () => {
            const save = dontShow && dontShow.checked;
            closeSplash(save);
        });
    }
    if (splashClose) {
        splashClose.addEventListener('click', () => closeSplash(false));
    }
});