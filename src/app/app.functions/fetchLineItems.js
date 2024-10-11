const { makeApiCall } = require('./apiAuth'); // Import the makeApiCall function

exports.main = async (context) => {
    const userId = context.parameters?.userId || 'defaultUserId'; // Get the userId for token management
    const dealId = context.parameters?.dealId;

    console.log("Received dealId:", dealId);

    // Validate the required parameters
    if (!dealId) {
        console.log("Missing required parameter: dealId");
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required parameter: dealId." })
        };
    }

    try {
        console.log(`Fetching line items for deal with ID ${dealId}`);

        // Step 1: Fetch the associated line items
        const lineItemsResponse = await fetchDealLineItems(userId, dealId);
        const lineItemIds = lineItemsResponse.results.map(item => item.id);

        console.log("Fetched line item IDs:", JSON.stringify(lineItemIds, null, 2));

        // Step 2: Fetch all product properties
        const productProperties = await fetchProductProperties(userId);
        const propertyKeys = productProperties.map(property => property.name).join(',');

        console.log("Fetched product properties:", JSON.stringify(productProperties, null, 2));
        console.log("Property keys to include in line item request:", propertyKeys);

        // Step 3: Fetch the details for each line item, including all properties
        const lineItemDetails = await fetchLineItemDetails(userId, lineItemIds, propertyKeys);

        console.log("Fetched line item details:", JSON.stringify(lineItemDetails, null, 2));

        return {
            statusCode: 200,
            body: JSON.stringify(lineItemDetails)
        };

    } catch (error) {
        console.error("Error fetching data:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error fetching data." })
        };
    }
};

// Function to fetch the associated line items for a given deal
async function fetchDealLineItems(userId, dealId) {
    try {
        const url = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/line_items`;
        const response = await makeApiCall(userId, 'GET', url);
        return response;
    } catch (error) {
        console.error(`Error fetching line items for deal ${dealId}:`, error.message);
        throw error;
    }
}

// Function to fetch the details for each line item, including specified properties
async function fetchLineItemDetails(userId, lineItemIds, propertyKeys) {
    const lineItemDetails = [];

    for (const lineItemId of lineItemIds) {
        try {
            const url = `https://api.hubapi.com/crm/v3/objects/line_items/${lineItemId}`;
            const response = await makeApiCall(userId, 'GET', url, null, { properties: propertyKeys });
            lineItemDetails.push(response);
        } catch (error) {
            console.error(`Error fetching details for line item ${lineItemId}:`, error.message);
            throw error;
        }
    }

    return lineItemDetails;
}

// Function to fetch all product properties
async function fetchProductProperties(userId) {
    try {
        const url = 'https://api.hubapi.com/crm/v3/properties/products';
        const response = await makeApiCall(userId, 'GET', url);
        return response.results; // List of all product properties
    } catch (error) {
        console.error("Error fetching product properties:", error.message);
        throw error;
    }
}



















// const axios = require('axios');

// exports.main = async (context) => {
//     const accessToken = process.env['PRIVATE_APP_ACCESS_TOKEN'];
//     const dealId = context.parameters?.dealId;

//     console.log("Received dealId:", dealId);

//     // Validate the required parameters
//     if (!dealId) {
//         console.log("Missing required parameter: dealId");
//         return {
//             statusCode: 400,
//             body: JSON.stringify({ message: "Missing required parameter: dealId." })
//         };
//     }

//     try {
//         console.log(`Fetching line items for deal with ID ${dealId}`);

//         // Step 1: Fetch the associated line items
//         const lineItemsResponse = await fetchDealLineItems(accessToken, dealId);
//         const lineItemIds = lineItemsResponse.results.map(item => item.id);

//         console.log("Fetched line item IDs:", JSON.stringify(lineItemIds, null, 2));

//         // Step 2: Fetch all product properties
//         const productProperties = await fetchProductProperties(accessToken);
//         const propertyKeys = productProperties.map(property => property.name).join(',');

//         console.log("Fetched product properties:", JSON.stringify(productProperties, null, 2));
//         console.log("Property keys to include in line item request:", propertyKeys);

//         // Step 3: Fetch the details for each line item, including all properties
//         const lineItemDetails = await fetchLineItemDetails(accessToken, lineItemIds, propertyKeys);

//         console.log("Fetched line item details:", JSON.stringify(lineItemDetails, null, 2));

//         return {
//             statusCode: 200,
//             body: JSON.stringify(lineItemDetails)
//         };

//     } catch (error) {
//         console.error("Error fetching data:", error.message);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({ message: "Error fetching data." })
//         };
//     }
// };

// // Function to fetch the associated line items for a given deal
// async function fetchDealLineItems(accessToken, dealId) {
//     try {
//         const response = await axios.get(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/line_items`, {
//             headers: {
//                 Authorization: `Bearer ${accessToken}`
//             }
//         });
//         return response.data;
//     } catch (error) {
//         console.error(`Error fetching line items for deal ${dealId}:`, error.message);
//         throw error;
//     }
// }

// // Function to fetch the details for each line item, including specified properties
// async function fetchLineItemDetails(accessToken, lineItemIds, propertyKeys) {
//     const lineItemDetails = [];

//     for (const lineItemId of lineItemIds) {
//         try {
//             const response = await axios.get(`https://api.hubapi.com/crm/v3/objects/line_items/${lineItemId}`, {
//                 headers: {
//                     Authorization: `Bearer ${accessToken}`
//                 },
//                 params: {
//                     properties: propertyKeys // Include all properties
//                 }
//             });
//             lineItemDetails.push(response.data);
//         } catch (error) {
//             console.error(`Error fetching details for line item ${lineItemId}:`, error.message);
//             throw error;
//         }
//     }

//     return lineItemDetails;
// }

// // Function to fetch all product properties
// async function fetchProductProperties(accessToken) {
//     try {
//         const response = await axios.get('https://api.hubapi.com/crm/v3/properties/products', {
//             headers: {
//                 Authorization: `Bearer ${accessToken}`
//             }
//         });
//         return response.data.results; // List of all product properties
//     } catch (error) {
//         console.error("Error fetching product properties:", error.message);
//         throw error;
//     }
// }
