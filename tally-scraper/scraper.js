const axios = require('axios');
const xlsx = require('xlsx');

const API_URL = 'https://tallysolutions.com/wp-content/themes/tally/api/partner_listing_api.php';

// Headers based on the cURL command
const HEADERS = {
    'Accept': '*/*',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Origin': 'https://tallysolutions.com',
    'Referer': 'https://tallysolutions.com/partners/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
};

// Function to introduce a delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPartnerData(pageNum) {
    // Data payload for the POST request
    const data = new URLSearchParams({
        'country': 'IN',
        'searchType': 'location',
        'loc_type': 'country',
        'partner_type': '',
        'sortby': '2',
        'pageNum': pageNum,
        'state': '',
        'lat': '',
        'lng': '',
        'X1': '',
        'Y1': '',
        'X2': '',
        'Y2': '',
        'keyword': ''
    });

    try {
        console.log(`Fetching data for page: ${pageNum}...`);
        const response = await axios.post(API_URL, data.toString(), { headers: HEADERS });
        // The data is already parsed by axios
        return response.data;
    } catch (error) {
        console.error(`Error fetching page ${pageNum}:`, error.message);
        return null;
    }
}

async function scrapeAllPages() {
    let allPartners = [];
    let pageNum = 13;
    let hasMoreData = true;

    while (hasMoreData && pageNum <= 18) {
        const result = await fetchPartnerData(pageNum);

        if (result && result.partnerData && result.partnerData.length > 0) {
            allPartners = allPartners.concat(result.partnerData);
            pageNum++;
            // Wait for 6 seconds before the next request
            await sleep(6000);
        } else {
            hasMoreData = false;
            console.log('No more data found. Concluding scraping.');
        }
    }

    return allPartners;
}

function saveDataToExcel(data) {
    if (data.length === 0) {
        console.log('No data to save.');
        return;
    }

    console.log(`Total partners scraped: ${data.length}`);

    // Map the scraped data to the desired Excel format
    const formattedData = data.map((partner, index) => ({
        'Sr No': index + 1,
        'Company Name*': partner.orgName || '',
        'Business Type': partner.cert ? `${partner.cert}-Star Certified` : '',
        'Contact Name*': partner.name || '',
        'Contact Title': '', // Not available in API response
        'Phone*': partner.phone || '',
        'Email*': partner.emailid || '',
        'Continue?': '', // Not available in API response
        'Company Website': partner.slugName ? `https://tallysolutions.com/partner-search/${partner.slugName}/` : '',
        'Company Size': '', // Not available in API response
        'Annual Revenue Range': '', // Not available in API response
        'GST Registration Number': '', // Not available in API response
        'Location (City)*': partner.city || '',
        'State*': partner.state || '',
    }));

    // Create a new workbook and worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(formattedData);

    // Append the worksheet to the workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Tally Partners');

    // Write the workbook to a file
    const fileName = 'tally_partners.xlsx';
    xlsx.writeFile(workbook, fileName);


    console.log(`Data successfully saved to ${fileName}`);
}

async function main() {
    console.log('Starting scraper...');
    const scrapedData = await scrapeAllPages();
    saveDataToExcel(scrapedData);
    console.log('Scraping process finished.');
}

main();
