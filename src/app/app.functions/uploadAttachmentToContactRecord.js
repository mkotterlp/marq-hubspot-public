const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://info.marq.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

exports.main = async (context, { logger, contactId, fileBuffer, fileName, fileType }) => {
    const apiKey = context.secrets.Marqsaveback_API_KEY;

    if (context.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: corsHeaders
        };
    }

    try {
        logger.info("Starting file upload process");

        let formData = new FormData();
        formData.append('file', fileBuffer, fileName);

        const uploadUrl = 'https://api.hubapi.com/files/v3/files';
        const uploadHeaders = {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${apiKey}`
        };

        // Using globally defined `makeApiCall`
        const uploadResponse = await makeApiCall('POST', uploadUrl, uploadHeaders, formData);
        logger.debug(`Upload response: ${JSON.stringify(uploadResponse)}`);

        const hsAttachmentId = uploadResponse.objects[0].id;
        logger.info(`Attachment ID: ${hsAttachmentId}`);

        const noteBody = {
            "properties": {
                "hs_timestamp": new Date().getTime(),
                "hs_note_body": `File ${fileName} attached.`,
                "hs_attachment_ids": `${hsAttachmentId}`
            }
        };

        const noteUrl = 'https://api.hubapi.com/crm/v3/objects/notes';
        const noteHeaders = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };

        const noteResponse = await makeApiCall('POST', noteUrl, noteHeaders, noteBody);
        logger.debug(`Note response: ${JSON.stringify(noteResponse)}`);

        const noteId = noteResponse.id;
        logger.info(`Note ID: ${noteId}`);

        const associationUrl = `https://api.hubapi.com/crm/v3/objects/notes/${noteId}/associations/contact/${contactId}/note_to_contact`;
        const associationHeaders = {
            'Authorization': `Bearer ${apiKey}`
        };

        const associationResponse = await makeApiCall('PUT', associationUrl, associationHeaders);
        logger.debug(`Association response: ${JSON.stringify(associationResponse)}`);

        return { 
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'SUCCESS', noteId: noteId })
        };

    } catch (error) {
        logger.error(`An error occurred: ${error.message}`);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'An error occurred during the upload process' })
        };
    }
};
