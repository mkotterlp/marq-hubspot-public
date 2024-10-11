const axios = require('axios');

exports.main = async (context) => {
  try {
    const templateLink = context.parameters?.templateLink || "";

    if (!templateLink) {
      throw new Error("Template link is missing.");
    }

    // Fetch the JSON data from the external URL
    const response = await axios.get(templateLink);
    const data = response.data;

    // Ensure the fetched data contains the expected structure
    if (!data.templatesresponse) {
      throw new Error("Invalid response structure.");
    }

    // Return the fetched data in the expected format
    return {
      statusCode: 200,
      body: JSON.stringify({ templatesresponse: data.templatesresponse })
    };

  } catch (error) {
    console.error("Error fetching JSON data:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch JSON data", error: error.message })
    };
  }
};
