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
                    case 'lastAMR':
                        fieldValue = item.lastReading;
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
            'ptr': 'PTR',
            'address': 'Service Address',
            'lastAMR': 'Last AMR'
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
            row.innerHTML = `
                <td>${item.id || 'N/A'}</td>
                <td>${item.address || 'N/A'}</td>
                <td>${item.lastReading || 'N/A'}</td>
                <td>${item.latitude || 'N/A'}</td>
                <td>${item.longitude || 'N/A'}</td>
            `;
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
                    <td colspan="5" style="text-align: center; color: red;">
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

    // Fetch and populate data
    fetchData();
});