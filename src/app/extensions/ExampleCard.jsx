import { useState, useEffect, useCallback, useRef } from "react"; 
import {
  LoadingButton,
  EmptyState,
  Flex,
  Box,
  Image,
  Input,
  Link,
  Button,
  ButtonRow,
  Table,
  Form,
  TableCell,
  TableBody,
  TableRow,
  Text,
  Divider,
  LoadingSpinner,
  hubspot,
} from "@hubspot/ui-extensions";
import {
  CrmActionButton
} from "@hubspot/ui-extensions/crm";

hubspot.extend((extensionContext) => {
  return (
    <Extension 
      context={extensionContext.context} 
      actions={extensionContext.actions}
    />
  );
});

const Extension = ({ context, actions }) => {
  const [iframeUrl, setIframeUrl] = useState("");
  const [constobjectType, setconstobjectType] = useState("");
  const [processedembedoptions, setprocessedembedoptions] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const [isAccountPolling, setAccountIsPolling] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState(null);
  const [ShowMarqAccountButton, setShowMarqAccountButton] = useState(false);
  const [ShowMarqUserButton, setShowMarqUserButton] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [userauthURL, setuserauthurl] = useState("");
  const [accountauthURL, setaccountauthurl] = useState("");
  const [templates, setTemplates] = useState([]);
  const [paginatedTemplates, setPaginatedTemplates] = useState([]);
  const [allTemplates, setAllTemplates] = useState([]);
  const [fulltemplatelist, setfullTemplates] = useState([]);
  const [dynamicProperties, setDynamicProperties] = useState({});
  const [lineitemProperties, setLineitemProperties] = useState({});
  const [isIframeOpen, setIframeOpen] = useState(false);
  const [title, setTitle] = useState("Relevant Content");
  const [stageName, setStage] = useState("");
  const [propertiesToWatch, setpropertiesToWatch] = useState([]);
  const [initialFilteredTemplates, setInitialFilteredTemplates] = useState([]);
  const [config, setConfig] = useState({});
  const [dataArray, setDataArray] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: "none",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [lastModifiedDate, setLastModifiedDate] = useState("");
  const hasInitialized = useRef(false);
  const RECORDS_PER_PAGE = 10;
  const [hoveredRow, setHoveredRow] = useState(null);
  const [crmProperties, setCrmProperties] = useState({});
  const [shouldPollForProjects, setShouldPollForProjects] = useState({
    isPolling: false,
    templateId: null,
  });
  const [prevProjectCount, setPrevProjectCount] = useState(0);
  const previousProjectCountRef = useRef(projects.length);
  const pollingTimerRef = useRef(null);
  const hasSyncedOnceRef = useRef(false);

  let objectId = "";
  let objectTypeId = "";
  let objectType = "";
  let userid = "";
  let hubid = "";
  let lasttemplatesyncdate = "";
  let templatesfeed = "";
  let marquserinitialized = false;
  let marqaccountinitialized = false;
  let globalcategories = [];
  let globalfields = [];
  let propertiesBody = {};
  let configData = {};
  let marqAccountId = "";
  let collectionid = "";
  let datasetid = "";
  let accountResponseBody = {};
  let schema = [
    { name: "Id", fieldType: "STRING", isPrimary: true, order: 1 },
    {
      name: "Marq User Restriction",
      fieldType: "STRING",
      isPrimary: false,
      order: 2,
    },
  ];

  const initialize = async () => {

    const authorizationUrlResponse = await handleConnectToMarq("user");
    const userauth = authorizationUrlResponse?.authorization_url;
    setuserauthurl(userauth);
    
    // const accountauthorizationUrlResponse = await handleConnectToMarq("data");
    // const accountauth = accountauthorizationUrlResponse?.authorization_url;
    // setaccountauthurl(accountauth);
    


    if (!hasInitialized.current && objectType) {
        hasInitialized.current = true;

        try {

          const marqlookup = await hubspot.fetch(
            "https://marqembed.fastgenapp.com/marq-lookup", 
            {
                method: "POST",
                body: {
                  objectTypeId: objectTypeId
                }
            }
        );
        
        if (marqlookup.ok) {
            // Parse the response body as JSON
            const marqlookupResponseBody = await marqlookup.json();
            const accounttableresult = marqlookupResponseBody.accounttableresult;
            const usertableresult = marqlookupResponseBody.usertableresult;
            const datatableresult = marqlookupResponseBody.datatableresult;

            console.log("usertableresult:", usertableresult);
            console.log("accounttableresult:", accounttableresult);
            console.log("datatableresult:", datatableresult);

            // Take actions based on the value of marquserinitialized
    if (usertableresult) {
      console.log("User is initialized. Showing templates...");

      lasttemplatesyncdate = usertableresult.lasttemplatesyncdate ?? null;
      templatesfeed = usertableresult.templatesfeed ?? null;
      marquserinitialized = true;

      setShowTemplates(true);  // Trigger to show templates
      fetchandapplytemplates();
      fetchembedoptions();
      // fetchAssociatedProjectsAndDetails(objectType);
  } else {
      console.log("User is not initialized. Hiding templates...");
      setIsLoading(false);
      setShowMarqUserButton(true);
      setShowTemplates(false);  // Hide templates or take other actions
  } 

//   if (accounttableresult) {
//     console.log("Account is initialized.");
//     marqaccountinitialized = true;

//     if (datatableresult) {
//       console.log("Data is initialized.");
//       await fetchMarqAccountData();  // Fetch account data if needed
//   } else {
//       console.log("Data is not initialized");
//   } 

// } else {
//     console.log("Account is not initialized. Showing account button...");
//     setIsLoading(false);
//     setShowMarqAccountButton(true);
// } 


        
        } else {
            // Log the status and status text for error debugging
            console.error(`Error fetching user table: ${marqlookup.status} - ${marqlookup.statusText}`);
        }
        
        } catch (error) {
            console.error("Error in fetching user data:", error);
        }
    } else if (hasInitialized.current) {
        console.log("Already initialized. Filtering templates...");
        // If already initialized, filter templates based on search criteria
        filterTemplates(
            fulltemplatelist,
            searchTerm,
            globalfields,
            globalcategories,
            crmProperties
        );
    }
};


useEffect(() => {
  if (context) {
    console.log("Context:", context); 
    const fetchData = async () => {
      objectId = context.crm.objectId;
      objectTypeId = context.crm.objectTypeId;
      hubid = context.portal.id;
      userid = context.user.id;
      await fetchObjectType();
      initialize();
    };
    fetchData();
  } else {
    console.log("Context is not available yet.");
  }
}, [context]);


const fetchembedoptions = async () => {
  try {
    const embedoptionslookup = await hubspot.fetch(
      "https://marqembed.fastgenapp.com/marq-embed-options-lookup",
      {
        method: "POST",
        body: {}
      }
    );

    if (embedoptionslookup.ok) {
      // Parse the response body as JSON
      const embedoptionslookupResponseBody = await embedoptionslookup.json();
      const embedoptionsresult = embedoptionslookupResponseBody.response;

      console.log("embedoptionsresult:", embedoptionsresult);

      // Grouping the options into enabled features, file types, and tabs
      const enabledFeatures = [];
      if (embedoptionsresult.collaboratingtoggle) enabledFeatures.push('collaborate');
      if (embedoptionsresult.downloadingtoggle) enabledFeatures.push('download');
      if (embedoptionsresult.printingtoggle) enabledFeatures.push('print');
      if (embedoptionsresult.sharingtoggle) enabledFeatures.push('share');

      let fileTypes = [];
      if (!embedoptionsresult.exportformat || embedoptionsresult.exportformat === 'all') {
        fileTypes = ['pdf', 'jpg', 'png', 'gif', 'mp4'];
      } else {
        fileTypes = [embedoptionsresult.exportformat];
      }

      const showTabs = ['templates']; // Add dynamic conditions here if needed

      // Creating encodedOptions
      const encodedOptions = encodeURIComponent(
        btoa(
          JSON.stringify({
            enabledFeatures: enabledFeatures.length > 0 ? enabledFeatures : ["share"],
            fileTypes: fileTypes.length > 0 ? fileTypes : ["pdf"],
            showTabs: showTabs.length > 0 ? showTabs : ["templates"],
          })
        )
      );

      console.log("encodedOptions:", encodedOptions);

      setprocessedembedoptions(encodedOptions);

    } else {
      console.error(`Error fetching embed options table: ${embedoptionslookup.status} - ${embedoptionslookup.statusText}`);
    }
  } catch (error) {
    console.error("Error in fetching embed options:", error);
  }
};


const fetchObjectType = async () => {
  try {
    if (!context) {
      throw new Error("Context is undefined.");
    }

      const objectTypeResponse = await hubspot.fetch(
        "https://marqembed.fastgenapp.com/fetch-object",
        {
          method: "POST",
          body: {
            objectTypeId: objectTypeId,
            userId: userid, 
          },
        }
      );

      if (objectTypeResponse.ok) {
        const objectTypeResponseBody = await objectTypeResponse.json();
        
        // Accessing the objectType within the body -> Data -> body
        objectType = objectTypeResponseBody.Data?.body?.objectType;
        setconstobjectType(objectType);

        if (objectType) {
          console.log("Object Type:", objectType);
        } else {
          console.error("Object Type not found in response.");
        }
      } else {
        console.error("Error fetching object type:", objectTypeResponse);
      }
  } catch (error) {
    console.error("Error fetching object type:", error);
  }
};


const fetchtemplatefilters = async () => {
  try {
    const response = await hubspot.fetch(
      "https://marqembed.fastgenapp.com/marq-filters-lookup",
      {
        method: "POST",
        body: JSON.stringify({})
      }
    );

    if (response.ok) {
      const templatefilterslookupResponseBody = await response.json();
      console.log("Full Response Body:", templatefilterslookupResponseBody);

      // Check if the response and mapping are present
      if (templatefilterslookupResponseBody && templatefilterslookupResponseBody.response && templatefilterslookupResponseBody.response.mapping) {
        // Parse the 'mapping' field which is a JSON string
        const templatefilterslookupresult = JSON.parse(templatefilterslookupResponseBody.response.mapping);
        console.log("Parsed templatefilterslookupresult:", templatefilterslookupresult);
        return templatefilterslookupresult; // Return the parsed result
      } else {
        console.error("Unexpected structure in response:", templatefilterslookupResponseBody);
        return null;
      }
    } else {
      console.error(
        `Error fetching template filters: ${response.status} - ${response.statusText}`
      );
      return null;
    }
  } catch (error) {
    console.error("Error in fetching template filters:", error);
    return null;
  }
};


const fetchObjectPropertiesFromFields = async (fields) => {
  try {
    const response = await hubspot.fetch(
      "https://marqembed.fastgenapp.com/fetch-object-properties",
      {
        method: "POST",
        body: {
          objectId: objectId,       
          objectType: objectType,  
          properties: fields    
        },
      }
    );
 
    const data = await response.json();
    // Correctly parse the properties from the response
    if (data && data.Data && data.Data.Data && data.Data.Data.body && data.Data.Data.body.mappedProperties) {
      return data.Data.Data.body.mappedProperties;  // Return the parsed properties
    } else {
      console.error('No properties found in the response:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching object properties:', error);
    return [];
  }
};


const getObjectProperties = async (template, categoryField, formField) => {
  const matchingCategory = template.categories.find(
    (category) => category.category_name.toLowerCase() === categoryField.toLowerCase()
  );

  if (matchingCategory) {
    const objectType = template.objectType || null;
    const objectId = template.objectId || null;

    if (objectType && objectId) {
      const properties = await fetchObjectProperties(objectType, objectId);
      return {
        objectType,
        objectId,
        properties,
      };
    }
  }

  return null;
};

const applytemplates = async (fetchedTemplates) => {
  try {
    setfullTemplates(fetchedTemplates || []);

    if (fetchedTemplates && fetchedTemplates.length > 0) {
      console.log('fetchedTemplates:', fetchedTemplates);

      // Await the result of fetchtemplatefilters and store it locally
      const templatefilterslookupresult = await fetchtemplatefilters();
      console.log("result from templatefilterslookupresult:", templatefilterslookupresult);

      // Check if templatefilterslookupresult is valid
      if (templatefilterslookupresult && typeof templatefilterslookupresult === 'object') {
        // Validate objectType (either passed or set globally)
        if (!objectType) {
          console.error('objectType is not defined.');
          return;
        }

        const pluralObjectType = `${objectType.toLowerCase()}s`; // e.g., "deal" -> "deals"
        const filterEntries = templatefilterslookupresult[pluralObjectType] || [];
        if (!filterEntries.length) {
          console.warn(`No entries found for objectType: ${objectType}`);
        }

        globalfields = filterEntries.map(entry => entry.formField); // Get formFields (e.g., 'industry', 'dealstage')
        globalcategories = filterEntries.map(entry => entry.categoryField.toLowerCase()); // Get categoryField (e.g., 'Industry', 'HS deal stage')

        console.log('fields:', globalfields);
        console.log('filters:', globalcategories);

        // Now, fetch the properties based on the fields
        const propertiesBody = await fetchObjectPropertiesFromFields(globalfields);
        console.log("Fetched propertiesBody:", propertiesBody);

        if (globalfields.length && globalcategories.length && propertiesBody && Object.keys(propertiesBody).length > 0) {
          // Call filterTemplates here
          filterTemplates(fetchedTemplates, searchTerm, globalfields, globalcategories, propertiesBody);
        } else {
          console.warn('Missing data for filtering. Showing all templates.');
          filterTemplates(fetchedTemplates, searchTerm, globalfields, globalcategories, propertiesBody);
        }
      } else {
        console.error("templatefilterslookupresult is undefined or not an object.");
        filterTemplates(fetchedTemplates, searchTerm, globalfields, globalcategories, propertiesBody);
      }
    } else {
      console.warn('No templates found. Setting empty array.');
      setTemplates([]);
      setFilteredTemplates([]);
      setInitialFilteredTemplates([]);
    }
  } catch (error) {
    console.error('Error in applytemplates:', error);
  }
};




const fetchandapplytemplates = async () => {

  setIsLoading(true); 
  const currentTime = Date.now();
  const timeDifference = currentTime - lasttemplatesyncdate;
  const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
  
  if (
    (timeDifference > twentyFourHoursInMs && marquserinitialized) ||
    (!templatesfeed && marquserinitialized)
  ) {
    try {
      console.log("Templates feed missing or synced more than 24hrs ago");

      // Fetch templates
      const templateFetchResponse = await hubspot.fetch(
        "https://marqembed.fastgenapp.com/fetch-marq-templates",
        {
          method: "POST",
          body: {}, 
        }
      );
  
      if (templateFetchResponse.ok) {
        const templateFetchResponseBody = await templateFetchResponse.json();
  
        // Accessing the objectType within the body -> Data -> body
        const fetchedTemplates = templateFetchResponseBody.templatesdata.templates;
        console.log("fetchedTemplates", fetchedTemplates);
  
        if (fetchedTemplates) {
          console.log("fetchedTemplates:", fetchedTemplates);

          await applytemplates(fetchedTemplates);

          // Fetch templates
      const saveTemplatesResponse = await hubspot.fetch(
        "https://marqembed.fastgenapp.com/save-marq-templates",
        {
          method: "POST",
          body: {
            templatesresponse: fetchedTemplates
          }, 
        }
      );
      if (saveTemplatesResponse.ok) {
        const saveTemplatesResponseBody = await saveTemplatesResponse.json();
        lasttemplatesyncdate = saveTemplatesResponseBody.lasttemplatesyncdate;
        templatesfeed = saveTemplatesResponseBody.templatesjsonurl;
      } else {
        console.error("Error saving templates:", saveTemplatesResponse);
      }

          
        } else {
          console.error("fetched templates not found in response.");
        }
      } else {
        console.error("Error fetching templates:", templateFetchResponse);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  } 

  if (templatesfeed) {
    console.log("Applying templates");
    const fetchjsonResponse = await hubspot.fetch(
      "https://marqembed.fastgenapp.com/fetch-jsondata",
      {
        method: "POST",
        body: {
          templateLink: templatesfeed,
        },
      }
    );
  
    if (fetchjsonResponse.ok) {
      const fetchjsonResponseBody = await fetchjsonResponse.json();
      const fetchedTemplates = fetchjsonResponseBody.Data.Data.body.templatesresponse;
      await applytemplates(fetchedTemplates);
      } else {
        console.error("Error with applying templates:", fetchjsonResponse);
      }
    } 
  

  console.log("lasttemplatesyncdate:", lasttemplatesyncdate);
  console.log("templatesfeed:", templatesfeed);
  setIsLoading(false); // Stop loading regardless of success or error
};




      // // Fetch config data from 'hubdbHelper'
      // try {

      //   const configDataResponse = await hubspot.fetch(
      //     "https://marqembed.fastgenapp.com/hubdb-helper",
      //     {
      //       method: "POST",
      //       headers: {
      //         'Content-Type': 'application/json',
      //       },
      //       body: JSON.stringify({
      //         objectType: objectType,
      //         userId: userid,
      //       }),
      //     }
      //   );
        

      //   if (configDataResponse?.response?.body) {
      //     configData =
      //       JSON.parse(configDataResponse.response.body).values || {};
      //     const fields =
      //       configData.textboxFields?.split(",").map((field) => field.trim()) ||
      //       [];
      //     const filters =
      //       configData.textboxFilters
      //         ?.split(",")
      //         .map((filter) => filter.trim()) || [];
      //     const dataFields =
      //       configData.dataFields?.split(",").map((field) => field.trim()) ||
      //       [];
      //     setFieldsArray(fields);
      //     setFiltersArray(filters);
      //     setDataArray(dataFields);

      //     // Log dataFields for debugging
      //     console.log("Pulled dataFields:", dataFields);

      //     const propertiesToWatch = configData.textboxFields
      //       ? configData.textboxFields.split(",").map((field) => field.trim())
      //       : [];
      //     setpropertiesToWatch(propertiesToWatch);

      //     // Fetch CRM properties if fields are available
      //     if (fields.length > 0) {
      //       try {

      //         const propertiesResponse = await fetch(
      //           "https://marqembed.fastgenapp.com/get-object-properties", 
      //         {
      //           method: "POST", // Ensure you use the correct HTTP method, assuming POST
      //           headers: {
      //             "Content-Type": "application/json"
      //           },
      //           body: {
      //             objectId: context.crm.objectId,
      //             objectType: objectType,
      //             properties: fields,
      //             userId: userid // Include userId in the parameters
      //           }
      //         });

      //         if (propertiesResponse?.response?.body) {
      //           propertiesBody =
      //             JSON.parse(propertiesResponse.response.body)
      //               .mappedProperties || {};
      //           console.log("Fetched CRM Properties:", propertiesBody);
      //           if (objectType === "DEAL") {
      //             setStage(propertiesBody.dealstage);
      //           }
      //         } else {
      //           console.error(
      //             "Failed to fetch CRM properties:",
      //             propertiesResponse
      //           );
      //         }
      //       } catch (propertiesError) {
      //         console.error(
      //           "Error occurred while fetching CRM properties:",
      //           propertiesError
      //         );
      //       }
      //     }

      //     // Group dynamic fields by their object types (parsed from dataFields)
      //     const objectTypeFieldsMap = {};

      //     // Dynamically group dataFields by their object types (e.g., deal, contact, etc.)
      //     dataFields.forEach((dataField) => {
      //       const parts = dataField.split("."); // Split the dataField
      //       if (parts.length === 2) {
      //         const [objectType, field] = parts;
      //         if (!objectTypeFieldsMap[objectType]) {
      //           objectTypeFieldsMap[objectType] = [];
      //         }
      //         objectTypeFieldsMap[objectType].push(field);
      //       } else if (parts.length === 1) {
      //         // Handle fields without an explicit objectType
      //         const defaultObjectType = objectTypeId;
      //         const field = parts[0];
      //         if (!objectTypeFieldsMap[defaultObjectType]) {
      //           objectTypeFieldsMap[defaultObjectType] = [];
      //         }
      //         objectTypeFieldsMap[defaultObjectType].push(field);
      //       } else {
      //         console.error(`Invalid dataField format: ${dataField}`);
      //       }
      //     });

      //     for (const [objectType, fieldsForObject] of Object.entries(
      //       objectTypeFieldsMap
      //     )) {
      //       try {

      //         const dynamicpropertiesResponse = await fetch("https://marqembed.fastgenapp.com/get-object-properties", {
      //           method: "POST", // Ensure the request method matches the expected method for the endpoint
      //           headers: {
      //             "Content-Type": "application/json"
      //           },
      //           body: {
      //             objectId: context.crm.objectId,
      //             objectType: objectType,
      //             properties: fields,
      //             userId: userid // Include userId in the parameters
      //           }
      //         });

      //         if (dynamicpropertiesResponse?.response?.body) {
      //           const responseBody = JSON.parse(
      //             dynamicpropertiesResponse.response.body
      //           );
      //           const dynamicpropertiesBody =
      //             responseBody.mappedProperties || {};

      //           console.log(
      //             `Fetched properties for dynamic objectType (${objectType}):`,
      //             dynamicpropertiesBody
      //           );

      //           let mappeddynamicproperties = {};

      //           // Iterate over dataFields and map to mappeddynamicproperties
      //           dataFields.forEach((dataField) => {
      //             const parts = dataField.split("."); // e.g., 'deal.dealstage'

      //             // Only update fields with the correct prefix (e.g., deal.amount for deal objectType)
      //             if (parts.length === 2 && parts[0] === objectType) {
      //               const [objectTypePrefix, field] = parts;
      //               const fieldValue = dynamicpropertiesBody[field]; // Get the value for the field
      //               if (fieldValue !== null && fieldValue !== "") {
      //                 mappeddynamicproperties[dataField] = fieldValue; // Only map if value is non-empty
      //               }
      //             } else if (parts.length === 1) {
      //               // Handle fields without an explicit objectType (using default)
      //               const field = parts[0];
      //               const fieldValue = dynamicpropertiesBody[field]; // Get the value for the field
      //               if (fieldValue !== null && fieldValue !== "") {
      //                 mappeddynamicproperties[dataField] = fieldValue; // Only map if value is non-empty
      //               }
      //             }
      //           });

      //           // Merge new properties with the existing ones, but only overwrite if non-empty
      //           setDynamicProperties((prevProperties) => ({
      //             ...prevProperties,
      //             ...mappeddynamicproperties,
      //           }));

      //           console.log(
      //             "Mapped Dynamic Properties after fetching:",
      //             mappeddynamicproperties
      //           );
      //         } else {
      //           console.error(
      //             `Failed to fetch properties for dynamic objectType (${objectType})`,
      //             dynamicpropertiesResponse
      //           );
      //         }
      //       } catch (error) {
      //         console.error(
      //           `Error fetching properties for dynamic objectType (${objectType}):`,
      //           error
      //         );
      //       }
      //     }

      //     try {
      //       // Check if the object is a 'deal'
      //       console.log("Starting deal check for lineItems:");
      //       if (objectType === "DEAL") {
      //         // Make your API call to fetch associated line items for the deal

      //         const lineItemsResponse = await fetch('https://marqembed.fastgenapp.com/fetch-line-items', {
      //           method: 'POST', // Assuming POST based on the nature of the operation, adjust if needed
      //           headers: {
      //             'Content-Type': 'application/json',
      //           },
      //           body: {
      //             dealId: context.crm.objectId, // Include dealId in the body
      //             userId: userid // Include userId in the body as well
      //           },
      //         });

      //         // Parse the response and return the line items
      //         const lineItems = JSON.parse(lineItemsResponse.response.body);
      //         console.log("lineItems:", lineItems);

      //         setLineitemProperties(lineItems);
      //       } else {
      //         console.log(
      //           "Object type is not a deal, skipping line item fetch."
      //         );
      //       }
      //     } catch (error) {
      //       console.error("Error fetching line items:", error);
      //     }

    //       // Fetch templates from 'fetchJsonData'
    //       else {
    //         console.error("Error: Missing template link to fetch templates.");

    //         if (marquserinitialized) {
    //           setShowTemplates(true);
    //           setIsLoading(false);
    //         } else {
    //           setShowTemplates(false);
    //           setIsLoading(false);
    //           actions.addAlert({
    //             title: "Error with template sync",
    //             variant: "danger",
    //             message: `There was an error fetching templates. Please try connecting to Marq again`,
    //           });
    //         }
    //       }
    //     } else {
    //       console.error("Failed to load config data:", configDataResponse);
    //     }
    //   } catch (configError) {
    //     console.error(
    //       "Error occurred while fetching config data:",
    //       configError
    //     );
    //   }
    // } catch (error) {
    //   console.error("Error in fetchConfigCrmPropertiesAndTemplates:", error);
    // }


    const filterTemplates = (
      allTemplates,
      searchTerm,
      globalfields,
      globalcategories,
      properties
    ) => {
      let filtered = Array.isArray(allTemplates) ? allTemplates : [];
    
      // Log the inputs
      console.log("Filtering templates with the following criteria:");
      console.log("All Templates: ", allTemplates.length);
      console.log("Search Term: ", searchTerm);
      console.log("Fields Array: ", globalfields);
      console.log("Filters Array: ", globalcategories);
      console.log("Properties: ", properties);
    
      // Dynamically extract filters
      const categoryFilters = extractFiltersFromProperties(globalfields, globalcategories, properties);
    
    
      // Apply category filters with additional logic to include templates without certain filters
      filtered = filtered.filter((template, index) => {
        const templateHasCategories = Array.isArray(template?.categories);
        const matchesFilters = categoryFilters.every(filter => {
          return templateHasCategories && template.categories.some(category => {
            const match = category?.category_name?.toLowerCase() === filter.name?.toLowerCase() &&
                          (category.values?.map(value => value.toLowerCase()).includes(filter.value?.toLowerCase()) || category.values?.length === 0);
            return match;
          });
        });
        return matchesFilters;
      });
    

      setInitialFilteredTemplates(filtered);
    
      // Apply search filter (searching within all templates)
      if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        filtered = filtered.filter((template, index) => {
          const matchesSearchTerm = template?.title?.toLowerCase().includes(lowerCaseSearchTerm);
          return matchesSearchTerm;
        });
      } else {
          console.log("Search term is empty, resetting to initial filtered templates.");
          filtered = Array.isArray(initialFilteredTemplates) ? [...initialFilteredTemplates] : [];
      }
    
    
      // If no templates match, return the full list
      if (filtered.length === 0) {
        console.log("No templates matched the filters. Showing all templates.");
        filtered = allTemplates;

        if (!searchTerm.trim()) {
          console.log("Search term is empty, resetting to initial filtered templates.");
          filtered = Array.isArray(allTemplates) ? [...allTemplates] : [];
        } 
      }
    
      // **Handle Pagination Here**
      const totalPages = Math.ceil(filtered.length / RECORDS_PER_PAGE);
      const paginatedTemplates = filtered.slice(
        (currentPage - 1) * RECORDS_PER_PAGE,
        currentPage * RECORDS_PER_PAGE
      );
    
    
      // Update the state with paginated and filtered templates
      setTemplates(filtered); // Set the entire filtered list for further use if needed
      setPaginatedTemplates(paginatedTemplates); // Set only the paginated results
      setTotalPages(totalPages); // Set the total number of pages
      setCurrentPage(1); // Optionally reset to the first page
    };
    

  const deleteRecord = async (objectId, objectType) => {
    try {

      await hubspot.fetch("https://marqembed.fastgenapp.com/deleterecord", {
        method: "POST",
        body: JSON.stringify({
          recordId: objectId,
          objectType: objectType,
        }), // Include additional parameters if needed
      });


      // Remove the deleted record from the projects state
      setProjects((prevProjects) =>
        prevProjects.filter((project) => project.objectId !== objectId)
      );

      // Add success alert
      actions.addAlert({
        title: "Success",
        message: "Project deleted successfully",
        variant: "success",
      });
    } catch (error) {
      console.error("Error deleting project:", error);

      // Add error alert
      actions.addAlert({
        title: "Error",
        variant: "error",
        message: `Failed to delete project: ${error.message}`,
      });
    }
  };

  function formatDate(dateString) {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    };
    const date = new Date(dateString);
    return date.toLocaleString("en-US", options);
  }

  const fetchAssociatedProjectsAndDetails = useCallback(
    async (objectType) => {
      // console.log("Fetching projects");
      if (!context.crm.objectId) {
        console.error("No object ID available to fetch associated projects.");
        return [];
      }

      try {
        // First API call to fetch associated projects
        const associatedProjectsResponse = await hubspot.fetch("https://marqembed.fastgenapp.com/fetch-projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            objectId: objectId,
            objectType: objectType,
          },
        });
      
        // Check if the first fetch was successful and parse the response
        if (associatedProjectsResponse.ok) {
          const projectsData = await associatedProjectsResponse.json();
      
          if (projectsData?.results?.length > 0) {
            // Collect unique project IDs
            const uniqueProjectIds = new Set(
              projectsData.results.flatMap((p) =>
                p.to ? p.to.map((proj) => proj.id) : []
              )
            );
      
            // Second API call to fetch detailed project data
            const projectDetailsResponse = await fetch("https://marqembed.fastgenapp.com/fetchprojectdetails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: {
                objectIds: Array.from(uniqueProjectIds), // Convert Set to Array if needed
              },
            });
      
            // Check if the second fetch was successful and parse the response
            if (projectDetailsResponse.ok) {
              const projectDetails = await projectDetailsResponse.json();
      
              const uniqueDetailedProjects = new Map();
              projectsData.results.forEach((project) => {
                project.to.forEach((p) => {
                  const detail = projectDetails.find((d) => d.objectId === p.id);
                  if (detail) {
                    uniqueDetailedProjects.set(p.id, { ...p, ...detail });
                  } else {
                    uniqueDetailedProjects.set(p.id, p);
                  }
                });
              });
      
              const detailedProjects = Array.from(uniqueDetailedProjects.values());
              detailedProjects.sort(
                (a, b) =>
                  new Date(b.hs_lastmodifieddate) - new Date(a.hs_lastmodifieddate)
              );
      
              // Update state
              setProjects(detailedProjects);
              const totalPages = Math.ceil(detailedProjects.length / RECORDS_PER_PAGE);
              setTotalPages(totalPages);
              setDataFetched(true);
      
              // Return the detailed projects
              return detailedProjects;
            } else {
              console.error("Failed to fetch project details:", projectDetailsResponse.statusText);
              throw new Error("Failed to fetch project details");
            }
          }
        } else {
          console.error("Failed to fetch associated projects:", associatedProjectsResponse.statusText);
          throw new Error("Failed to fetch associated projects");
        }
      
        return [];
      } catch (error) {
        console.error("Error during fetch:", error);
        setDataFetched(true);
        actions.addAlert({
          title: "API Error",
          variant: "error",
          message: `Error fetching associated projects: ${error.message || "No error message available"}`,
        });
        return [];
      }
      
    },
    [context.crm.objectId, hubspot.fetch, actions]
  );

  const editClick = async (projectId, fileId, encodedoptions) => {
    let editoriframeSrc = "https://info.marq.com/loading";

    // Set iframe to loading
    setIframeUrl(editoriframeSrc);
    actions.openIframeModal({
      uri: editoriframeSrc,
      height: 1500,
      width: 1500,
      title: "Marq",
    });
    setIframeOpen(true);

    try {
      const contactId = context.crm.objectId;

      const createaccounttable = await fetch("https://marqembed.fastgenapp.com/fetchaccounttable", {
        method: "POST", // Assuming it's a POST request
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          objectType: objectType, // Pass objectType as a parameter
        }),
      });

      if (!createaccounttable?.response?.body) {
        console.error(
          "No response body from serverless function. Aborting poll."
        );
        return;
      }

      let accountTableResponseBody = {};
      try {
        accountTableResponseBody = JSON.parse(createaccounttable.response.body);
      } catch (err) {
        console.error("Failed to parse response body as JSON:", err);
        return;
      }

      const accountData = accountTableResponseBody?.dataRow?.values || {};
      const matchedData = accountTableResponseBody?.objectTypeRow?.values || {};

      // console.log('accountData:', accountData);

      // marqaccountinitialized = accountData?.marqaccountinitialized || null;
      marqAccountId = accountData?.accountId || null;
      datasetid = matchedData?.datasetid || null;
      collectionid = matchedData?.collectionid || null;
      const creatorid = context.user.id;
      const portalid = context.portal.id;
      const originobjectType = constobjectType;

      if (!marqAccountId) {
        console.error("marqAccountId is missing, cannot proceed.");
        return;
      }


      await updateData();

      let editorinnerurl = `https://app.marq.com/documents/showIframedEditor/${projectId}/0?embeddedOptions=${processedembedoptions}&creatorid=${creatorid}&contactid=${contactId}&hubid=${portalid}&objecttype=${originobjectType}&fileid=${fileId}`;
      const baseInnerUrl = `https://app.marq.com/documents/iframe?newWindow=false&returnUrl=${encodeURIComponent(editorinnerurl)}`;

      editoriframeSrc =
        "https://info.marq.com/marqembed2?iframeUrl=" +
        encodeURIComponent(baseInnerUrl);

      setIframeUrl(editoriframeSrc);
      actions.openIframeModal({
        uri: editoriframeSrc,
        height: 1500,
        width: 1500,
        title: "Marq Editor",
      });
      setIframeOpen(true);
    } catch (error) {
      console.error("Error in editClick:", error);
    }
  };

  const sendEmail = async (project) => {
    try {
      const response = await hubspot.fetchFunction({
        name: "generateEmailContent",
        parameters: { project },
      });

      if (response && response.emailContent) {
        const emailContent = response.emailContent;
        // Open the email composition window with the generated content
        actions.openEmailComposeWindow({
          to: project.contactEmail,
          subject: `Details for project ${project.name}`,
          body: emailContent,
        });
      }
    } catch (error) {
      console.error("Failed to generate email content:", error);
    }
  };

  const extractFiltersFromProperties = (
    globalfields,
    globalcategories,
    properties
  ) => {
    let filters = [];

    globalfields.forEach((field, index) => {
      if (properties[field]) {
        const fieldValue = properties[field];
        const filterValue = globalcategories[index];
        filters.push({ name: filterValue, value: fieldValue });
      }
    });

    return filters;
  };

  const handleOnSort = (fieldName, currentDirection) => {
    let newDirection = "descending";
    if (currentDirection === "ascending") {
      newDirection = "descending";
    } else if (currentDirection === "descending") {
      newDirection = "none";
    } else {
      newDirection = "ascending";
    }

    setSortConfig({ field: fieldName, direction: newDirection });

    const sortedProjects = [...projects];
    if (newDirection !== "none") {
      sortedProjects.sort((a, b) => {
        if (a[fieldName] < b[fieldName]) {
          return newDirection === "ascending" ? -1 : 1;
        }
        if (a[fieldName] > b[fieldName]) {
          return newDirection === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }

    setProjects(sortedProjects);
  };

  const refreshProjects = async () => {
    // console.log("Calling refresh projects");

    if (!shouldPollForProjects.isPolling) {
      // console.log("Polling stopped: shouldPollForProjects.isPolling is false in refreshProjects");
      return;
    }

    let templateIdToMatch;

    templateIdToMatch = shouldPollForProjects.templateId;

    if (objectType && templateIdToMatch) {
      const projectsList = await fetchAssociatedProjectsAndDetails(objectType);

      // Check for matching project
      const matchingProject = projectsList.find(
        (project) => project.originaltemplateid === templateIdToMatch
      );

      if (matchingProject) {
        // console.log(`Found matching project for template ID: ${templateIdToMatch}`);
        setShouldPollForProjects({ isPolling: false, templateId: null });
        setLoadingTemplateId(null);
        templateIdToMatch = null;

        // Stop polling
        if (pollingTimerRef.current) {
          clearTimeout(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }

        return;
      }

      // Update the state to ensure `projects` reflects the latest data
      setProjects(projectsList);
    } else {
      // console.log("Object type not detected");
    }
  };


  const updateData = async () => {
    console.log("Starting updateData...");
    console.log("dynamicProperties before merge:", dynamicProperties);

    if (marqaccountinitialized) {
      try {
        const properties = {};

        // Merge dynamicProperties into the properties object
        const updatedProperties = {
          ...properties,
          ...dynamicProperties,
        };

        const numberOfLineItems = Math.min(10, lineitemProperties.length); // Allow up to 10 line items
        const updatedSchema = [
          { name: "Id", fieldType: "STRING", isPrimary: true, order: 1 },
          {
            name: "Marq User Restriction",
            fieldType: "STRING",
            isPrimary: false,
            order: 2,
          },
        ];

        // Function to format numbers as currency
        const formatCurrency = (value) => {
          if (!isNaN(value) && value !== "" && value !== "null") {
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
            }).format(value);
          }
          return ""; // Return empty string if not a valid number
        };

        // Function to capitalize the first letter of a string
        const capitalizeFirstLetter = (string) => {
          return string.charAt(0).toUpperCase() + string.slice(1);
        };

        const calculateRecurringBillingEndDate = (
          periodValue,
          startDateValue,
          termYears
        ) => {
          // Parse the start date if provided, else default to today
          const startDate = startDateValue
            ? new Date(startDateValue)
            : new Date();

          // Check if the periodValue is in the expected format and contains "M"
          if (
            periodValue &&
            typeof periodValue === "string" &&
            periodValue.startsWith("P") &&
            periodValue.includes("M")
          ) {
            const months = parseInt(
              periodValue.replace("P", "").replace("M", "")
            );
            if (!isNaN(months)) {
              const endDate = new Date(startDate);
              endDate.setMonth(startDate.getMonth() + months);

              // Check if the day changes due to the month transition and adjust
              if (endDate.getDate() !== startDate.getDate()) {
                endDate.setDate(0); // Move to the last valid day of the previous month if day mismatch occurs
              }

              return endDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
            }
          }

          // If hs_recurring_billing_period is missing or invalid, use term__years_ as backup
          if (termYears && !isNaN(termYears)) {
            const endDate = new Date(startDate);
            endDate.setFullYear(startDate.getFullYear() + parseInt(termYears));
            return endDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
          }

          // Return an empty string if no valid period or term is found
          return "";
        };

        // Only process line items if the objectType is 'DEAL'
        if (objectType === "DEAL") {
          for (let i = 0; i < 10; i++) {
            // Check if the line item exists
            const lineItem = lineitemProperties[i] || null;

            if (lineItem) {
              // If the line item exists, populate the properties with real values
              Object.keys(lineItem.properties).forEach((propertyKey) => {
                const dynamicFieldName = `lineitem${i + 1}.${propertyKey}`;

                // Check if the property is a currency-related field
                if (
                  [
                    "price",
                    "discount",
                    "tax",
                    "amount",
                    "hs_cost_of_goods_sold",
                  ].includes(propertyKey)
                ) {
                  updatedProperties[dynamicFieldName] =
                    !isNaN(lineItem.properties[propertyKey]) &&
                    lineItem.properties[propertyKey] !== null
                      ? formatCurrency(lineItem.properties[propertyKey])
                      : lineItem.properties[propertyKey] || "";
                } else {
                  updatedProperties[dynamicFieldName] =
                    typeof lineItem.properties[propertyKey] === "string"
                      ? capitalizeFirstLetter(lineItem.properties[propertyKey])
                      : lineItem.properties[propertyKey] || "";
                }

                // Add the property to the schema, capitalize the first letter of the propertyKey
                updatedSchema.push({
                  name: dynamicFieldName,
                  fieldType: "STRING",
                  isPrimary: false,
                  order: updatedSchema.length + 1,
                });
              });

              const endDateFieldName = `lineitem${i + 1}.recurring_billing_end_date`;

              // Add calculated recurring_billing_end_date to the properties and schema if hs_recurring_billing_period exists
              if (lineItem.properties.recurringbillingfrequency) {
                const recurringBillingEndDate =
                  calculateRecurringBillingEndDate(
                    lineItem.properties.hs_recurring_billing_period,
                    lineItem.properties.hs_recurring_billing_start_date,
                    lineItem.properties.term__years_
                  );
                updatedProperties[endDateFieldName] = recurringBillingEndDate;
              } else {
                updatedProperties[endDateFieldName] = ""; // Set a blank value if it's missing
              }

              // Check if recurringbillingfrequency exists, if not, set to "One-time"
              if (
                !lineItem.properties.recurringbillingfrequency ||
                lineItem.properties.recurringbillingfrequency.trim() === ""
              ) {
                updatedProperties[
                  `lineitem${i + 1}.recurringbillingfrequency`
                ] = "One-time";
              }

              updatedSchema.push({
                name: endDateFieldName,
                fieldType: "STRING",
                isPrimary: false,
                order: updatedSchema.length + 1,
              });
            } else {
              // If the line item doesn't exist, populate the schema with real property names but set values to ""
              Object.keys(lineitemProperties[0].properties).forEach(
                (propertyKey) => {
                  const dynamicFieldName = `lineitem${i + 1}.${propertyKey}`;

                  // Set value to "" for missing line items
                  updatedProperties[dynamicFieldName] = "";

                  // Add the property to the schema, capitalize the first letter of the propertyKey
                  updatedSchema.push({
                    name: dynamicFieldName,
                    fieldType: "STRING",
                    isPrimary: false,
                    order: updatedSchema.length + 1,
                  });
                }
              );

              // Add a blank recurring_billing_end_date to the properties and schema for missing line items
              const endDateFieldName = `lineitem${i + 1}.recurring_billing_end_date`;
              updatedProperties[endDateFieldName] = ""; // No value as the line item is missing
              updatedSchema.push({
                name: endDateFieldName,
                fieldType: "STRING",
                isPrimary: false,
                order: updatedSchema.length + 1,
              });
            }
          }
        }

        // Iterate over dynamicProperties and add them to updatedSchema
        Object.keys(dynamicProperties).forEach((propertyKey) => {
          const dynamicFieldName = propertyKey; // Use the property key as the field name

          // Update the properties object
          updatedProperties[dynamicFieldName] = dynamicProperties[propertyKey];

          // Add this property to the schema if it's not already present
          const alreadyInSchema = updatedSchema.some(
            (item) => item.name === capitalizeFirstLetter(dynamicFieldName)
          );
          if (!alreadyInSchema) {
            updatedSchema.push({
              name: dynamicFieldName, // Capitalize the first letter
              fieldType: "STRING",
              isPrimary: false,
              order: updatedSchema.length + 1, // Increment the order correctly
            });
          }
        });

        // Append the Id field to the properties object
        updatedProperties["Id"] = context.crm.objectId?.toString() || "";
        updatedProperties["Marq User Restriction"] = context.user.email;

        console.log("updatedProperties", updatedProperties);

        // Call update-data3 function
        console.log("Starting updateData3");
        const updateDataResponse = await hubspot.fetch({
          name: "updateData3",
          parameters: {
            collectionId: collectionid,
            properties: updatedProperties,
            schema: updatedSchema,
            dataSourceId: datasetid,
          },
        });

        // Check if the response was successful
        if (
          updateDataResponse?.response?.statusCode === 200 ||
          updateDataResponse?.response?.statusCode === 201
        ) {
          console.log("Data updated successfully before project creation");

          // **Parse the response body**
          let responseBody = updateDataResponse.response.body;
          if (typeof responseBody === "string") {
            try {
              responseBody = JSON.parse(responseBody);
            } catch (e) {
              console.error("Failed to parse response body as JSON:", e);
              responseBody = {};
            }
          }
        } else {
          console.error(
            "Failed to update data before project creation",
            updateDataResponse?.response?.body
          );
        }
      } catch (error) {
        console.error("Error during update-data3 execution:", error);
      }
    }
  };

  const handleClick = async (template) => {
    let iframeSrc = "https://info.marq.com/loading";

    // Set iframe to loading
    setIframeUrl(iframeSrc);
    actions.openIframeModal({
      uri: iframeSrc,
      height: 1500,
      width: 1500,
      title: "Marq",
    });
    setIframeOpen(true);


      const templateid = template?.id || "";
      const templatetitle = template?.title || "";

      // await updateData();


      try {

        let projectId = "";
        const createProjectResponse = await hubspot.fetch(
          "https://marqembed.fastgenapp.com/create-project2",
          {
            method: "POST",
            body: {
              templateid: templateid,
              templatetitle: templatetitle,
              recordid: context.crm.objectId?.toString(),
            },
          }
        );
      
        if (createProjectResponse.ok) {
          const createProjectResponseBody = await createProjectResponse.json();
          const projectData = createProjectResponseBody.Data;

          try {
            const projectData = JSON.parse(createProjectResponse.response.body.project_info);
            console.log("Project created successfully:", projectData);

            // Ensure projectId is extracted correctly
            projectId = projectData.documentid;
            if (!projectId) {
              console.warn(
                "Failed to create project through the API - reverting to URL method."
              );
              iframeFallback(template.id); // Fallback in case of failure
              return;
            }

            // const encodedOptions = encodeURIComponent(
            //   btoa(
            //     JSON.stringify({
            //       enabledFeatures: configData.enabledFeatures?.map(
            //         (feature) => feature.name
            //       ) || ["share"],
            //       fileTypes: configData.fileTypes?.map(
            //         (fileType) => fileType.name
            //       ) || ["pdf"],
            //       showTabs: configData.showTabs?.map((tab) => tab.name) || [
            //         "templates",
            //       ],
            //     })
            //   )
            // );

            const contactId = context.crm.objectId;
            const returnUrl = `https://app.marq.com/documents/showIframedEditor/${projectId}/0?embeddedOptions=${processedembedoptions}&creatorid=${userid}&contactid=${contactId}&hubid=${hubid}&objecttype=${objectType}&dealstage=${stageName}&templateid=${template.id}`;
            const baseInnerUrl = `https://app.marq.com/documents/iframe?newWindow=false&returnUrl=${encodeURIComponent(returnUrl)}`;

            iframeSrc =
              "https://info.marq.com/marqembed2?iframeUrl=" +
              encodeURIComponent(baseInnerUrl);
          } catch (parseError) {
            console.error(
              "Error parsing project creation response:",
              parseError
            );
            console.error(
              "Raw response body:",
              createProjectResponse.response.body
            );
            iframeFallback(template.id); // Fallback in case of error
            return;
          }
        } else {
      console.error("Error with creating project:", createProjectResponse);
      iframeFallback(template.id); // Fallback in case of failure
      return;
    } 
  }
         catch (error) {
        console.error("Error occurred during project creation:", error);
        if (error.response) {
          console.error("Error response status:", error.response.status);
          console.error("Error response data:", error.response.data);
        }
        iframeFallback(template.id); // Fallback in case of error
        return;
      }

      // Opening the iframe with the appropriate source
      setIframeUrl(iframeSrc);
      actions.openIframeModal({
        uri: iframeSrc,
        height: 1500,
        width: 1500,
        title: "Marq",
      });
      setIframeOpen(true);
      setShouldPollForProjects({ isPolling: true, templateId: template.id });

      // console.error("Error in handleClick:", error);
      // iframeFallback(template.id);

      // setShowTemplates(false);
      // setIsLoading(false);

      // // Show an alert to the user in case of error
      // actions.addAlert({
      //   title: "Error with creating project",
      //   variant: "danger",
      //   message:
      //     "There was an error with creating the project. Please try connecting to Marq again.",
      // });
 
  };

  /**
   * Fallback function to revert to the URL method in case of any failure
   */
  function iframeFallback(templateId) {
    let iframeSrc = "https://info.marq.com/loading";

    // Set iframe to loading
    setIframeUrl(iframeSrc);
    actions.openIframeModal({
      uri: iframeSrc,
      height: 1500,
      width: 1500,
      title: "Marq",
    });
    setIframeOpen(true);

    // const encodedOptions = encodeURIComponent(
    //   btoa(
    //     JSON.stringify({
    //       enabledFeatures: configData.enabledFeatures?.map(
    //         (feature) => feature.name
    //       ) || ["share"],
    //       fileTypes: configData.fileTypes?.map((fileType) => fileType.name) || [
    //         "pdf",
    //       ],
    //       showTabs: configData.showTabs?.map((tab) => tab.name) || [
    //         "templates",
    //       ],
    //     })
    //   )
    // );

    const contactId = context.crm.objectId;
    const creatorid = context.user.id;
    const portalid = context.portal.id;
    const originobjectType = constobjectType;

    const returnUrl = `https://app.marq.com/documents/editNewIframed/${templateId}?embeddedOptions=${processedembedoptions}&creatorid=${creatorid}&contactid=${contactId}&hubid=${portalid}&objecttype=${originobjectType}&dealstage=${stageName}&templateid=${templateId}`;
    const baseInnerUrl = `https://app.marq.com/documents/iframe?newWindow=false&returnUrl=${encodeURIComponent(returnUrl)}`;

    iframeSrc =
      "https://info.marq.com/marqembed2?iframeUrl=" +
      encodeURIComponent(baseInnerUrl);
    setIframeUrl(iframeSrc);
    actions.openIframeModal({
      uri: iframeSrc,
      height: 1500,
      width: 1500,
      title: "Marq",
    });
    setIframeOpen(true);
    setShouldPollForProjects({ isPolling: true, templateId: templateId });
  }

  const startPollingForMarqUser = () => {
    setIsPolling(true); // Start polling when the button is clicked
  };

  const pollForMarqUser = async () => {
    try {
      const marqlookup = await hubspot.fetch(
        "https://marqembed.fastgenapp.com/marq-lookup", 
        {
            method: "POST",
            body: {
              objectTypeId: objectTypeId
            }
        }
    );
    
    if (marqlookup.ok) {
        // Parse the response body as JSON
        const marqlookupResponseBody = await marqlookup.json();
        const usertableresult = marqlookupResponseBody.usertableresult;

        console.log("usertableresult:", usertableresult);

        if (
          usertableresult
        ) {
          setIsPolling(false); // Stop polling
          await fetchandapplytemplates();
          setShowTemplates(true);
          setShowMarqUserButton(false);
          // fetchPropertiesAndLoadConfig(); // Ensure objectType is defined
        } else {
          setShowTemplates(false);
        }
      } else {
      }
    } catch (error) {
      console.error("Error while polling for marq user:", error);
    }
  };

  useEffect(() => {
    let pollInterval;

    if (isPolling) {
      pollInterval = setInterval(pollForMarqUser, 5000); // Poll every 5 seconds
    }

    return () => {
      clearInterval(pollInterval); // Clean up interval when component unmounts or polling stops
    };
  }, [isPolling]);

  // const startPollingForMarqAccount = () => {
  //   setAccountIsPolling(true); // Start polling when the button is clicked
  // };

  // const pollForMarqAccount = async () => {
  //   try {
  //     // Fetch account data using the serverless function
  //     const createaccounttable = await hubspot.fetch({
  //       name: "fetchAccountTable",
  //       parameters: { objectType: objectType, userId: userid }, // Include userId in the parameters
  //     });

  //     if (!createaccounttable?.response?.body) {
  //       console.error(
  //         "No response body from serverless function. Aborting poll."
  //       );
  //       return;
  //     }

  //     try {
  //       accountResponseBody = JSON.parse(createaccounttable.response.body);
  //     } catch (err) {
  //       console.error("Failed to parse response body as JSON:", err);
  //       return;
  //     }

  //     const accountData = accountResponseBody?.dataRow?.values || {};

  //     marqaccountinitialized = accountData?.marqaccountinitialized || null;
  //     marqAccountId = accountData?.accountId || null;

  //     if (!marqaccountinitialized) {
  //       console.warn(
  //         "Marq account not initialized, will continue polling."
  //       );
  //       setShowMarqAccountButton(true); // Optionally allow the user to retry
  //       return;
  //     }

  //     setAccountIsPolling(false);
  //     setShowMarqAccountButton(false);

  //     try {
  //       await createOrUpdateDataset();
  //     } catch (error) {
  //       console.error("Error creating or updating dataset:", error);
  //     }
  //   } catch (error) {
  //     console.error(
  //       "Error while polling for Marq account:",
  //       error.message || error
  //     );
  //   }
  // };

  useEffect(() => {
    let pollAccountInterval;

    // Start polling if the account is set to be polling
    if (isAccountPolling) {
      pollAccountInterval = setInterval(pollForMarqAccount, 5000); // Poll every 5 seconds
    }

    // Cleanup interval when polling stops or component unmounts
    return () => {
      clearInterval(pollAccountInterval);
    };
  }, [isAccountPolling]);

  useEffect(() => {
    const pollingForProjects = async () => {
      if (shouldPollForProjects.isPolling && shouldPollForProjects.templateId) {
        await refreshProjects();
        pollingTimerRef.current = setTimeout(() => {
          pollingForProjects();
        }, 20000);
      } else {
        // Clear the timeout if polling should stop
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };

    // Start polling only if shouldPollForProjects.isPolling is true
    if (shouldPollForProjects.isPolling && shouldPollForProjects.templateId) {
      pollingForProjects();
    }

    // Cleanup on component unmount or when shouldPollForProjects changes
    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [shouldPollForProjects]);


  useEffect(() => {
    // console.log("Filtered Templates Updated:", filteredTemplates);
  }, [filteredTemplates]);

  const handleSearch = useCallback(
    (input) => {
      let searchValue = "";

      // Validate the input
      if (input && input.target && typeof input.target.value === "string") {
        searchValue = input.target.value;
      } else if (typeof input === "string") {
        searchValue = input;
      } else {
        console.error("Unexpected input:", input);
        return; // Exit early if input is invalid
      }

      setSearchTerm(searchValue);

      if (searchValue.trim() === "") {
        // Reset to the initially filtered templates when the search term is cleared
        // setFilteredTemplates([...initialFilteredTemplates]);
        setFilteredTemplates(Array.isArray(initialFilteredTemplates) ? [...initialFilteredTemplates] : []);
        // console.log('Initial Filtered Templates in handleSearch:', initialFilteredTemplates);

        setTitle("Relevant Content");
      } else {
        setTitle("Search Results");
      }
    },
    [initialFilteredTemplates]
  );

  useEffect(() => {
    if (searchTerm.trim() === "") {
      // Ensure we only set the initial filtered templates if it's not already set
      if (filteredTemplates.length !== initialFilteredTemplates.length) {
        // setFilteredTemplates([...initialFilteredTemplates]);
        setFilteredTemplates(Array.isArray(initialFilteredTemplates) ? [...initialFilteredTemplates] : []);
        // console.log('Reset to Initial Filtered Templates:', initialFilteredTemplates);
      }
      setCurrentPage(1); // Reset to first page
    } else {
      const delayDebounceFn = setTimeout(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        const searchResults = fulltemplatelist.filter((template) =>
          template?.title?.toLowerCase().includes(lowerCaseSearchTerm)
        );

        // Update filteredTemplates with the search results
        setFilteredTemplates(searchResults);
        setCurrentPage(1); // Reset to first page on search
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [
    searchTerm,
    fulltemplatelist,
    initialFilteredTemplates,
    filteredTemplates,
  ]);

  useEffect(() => {
    const pages = Math.ceil(filteredTemplates.length / RECORDS_PER_PAGE);
    setTotalPages(pages);
  }, [filteredTemplates]);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // paginatedTemplates = filteredTemplates.slice(
  //   (currentPage - 1) * RECORDS_PER_PAGE,
  //   currentPage * RECORDS_PER_PAGE
  // );

  useEffect(() => {
    console.log('Filtered Templates:', filteredTemplates);
    const initialPaginatedTemplates = Array.isArray(filteredTemplates)
      ? filteredTemplates.slice(
          (currentPage - 1) * RECORDS_PER_PAGE,
          currentPage * RECORDS_PER_PAGE
        )
      : [];
    console.log('Paginated Templates:', initialPaginatedTemplates);
    setPaginatedTemplates(initialPaginatedTemplates);
  }, [filteredTemplates, currentPage]);
  




  // // Separate function to fetch Marq account data
  // const fetchMarqAccountData = async () => {
  //   try {

  //     const createaccounttable = await hubspot.fetch(
  //       "https://marqembed.fastgenapp.com/datatablehandler2", 
  //       {
  //           method: "POST",
  //           body: {
  //             objectType: objectType
  //           }
  //       }
  //   );
    
  //   if (createaccounttable.ok) {
  //       // Parse the response body as JSON
  //       const createaccounttableResponseBody = await createaccounttable.json();
  //       console.log("createaccounttable response body:", createaccounttableResponseBody);

  //       marqaccountinitialized = createaccounttableResponseBody?.Data?.dataRow?.values?.marqaccountinitialized;
  //       datasetid = createaccounttableResponseBody?.Data?.objectTypeRow?.values?.datasetid || null;
  //       marqaccountinitialized = createaccounttableResponseBody?.Data?.objectTypeRow?.values?.collectionid || null;


  //       // datasetid = matchedData.datasetid || null;
  //       // collectionid = matchedData.collectionid || null;

  //       // if (marqaccountinitialized) {
  //       //   setShowMarqAccountButton(false);

  //       //   if (!datasetid || !collectionid) {
  //       //     await createOrUpdateDataset();
  //       //   }
  //       // } else {
  //       //   setShowMarqAccountButton(true);
  //       // }
  //     } else {
  //       console.error("Failed to fetch Marq account data.");
  //       setShowMarqAccountButton(true);
  //     }
  //   } catch (error) {
  //     console.error("Error in fetching Marq account data:", error);
  //   }
  // };


  useEffect(() => {
    // Function to create a mapping from cleaned fields to original fields
    const createFieldMapping = (fields) => {
      return fields.reduce((acc, field) => {
        const parts = field.split(".");
        const cleanedField = parts.length > 1 ? parts[1] : parts[0]; // Clean the field name
        acc[cleanedField] = field; // Map cleaned field to the original
        return acc;
      }, {});
    };

    // Function to strip object name prefixes from fields (e.g., 'deal.amount' -> 'amount')
    const cleanFields = (fields) => {
      return fields.map((field) => {
        const parts = field.split(".");
        console.log('Field:', field, 'Parts:', parts);
        return parts.length > 1 ? parts[1] : parts[0];
      });
    };
    

    // Create mappings for globalfields and dynamicProperties
    const fieldMapping = createFieldMapping(globalfields);
    const dynamicFieldMapping = createFieldMapping(
      Object.keys(dynamicProperties)
    );

    const handlePropertiesUpdate = (updatedProperties) => {
      // Handle updates for globalfields
      if (globalfields && globalfields.length > 0) {
        const hasRelevantChange = globalfields.some(
          (field) => updatedProperties[fieldMapping[field]]
        );
        if (hasRelevantChange) {
          // fetchPropertiesAndLoadConfig();
          if (
            hasInitialized.current &&
            globalcategories.length > 0 &&
            Object.keys(crmProperties).length > 0
          ) {
            filterTemplates(
              fulltemplatelist,
              searchTerm,
              globalfields,
              globalcategories,
              crmProperties
            );
          }
        }
      }

      // Handle updates for dynamicProperties
      const dynamicFieldsToWatch = Object.keys(dynamicProperties);
      const hasDynamicChange = dynamicFieldsToWatch.some(
        (field) => updatedProperties[dynamicFieldMapping[field]]
      );
      if (hasDynamicChange) {
        const updatedDynamicProps = dynamicFieldsToWatch.reduce(
          (acc, field) => {
            const originalField = dynamicFieldMapping[field];
            if (updatedProperties[originalField]) {
              acc[originalField] = updatedProperties[originalField]; // Use original field name
            }
            return acc;
          },
          {}
        );

        setDynamicProperties((prevProperties) => ({
          ...prevProperties,
          ...updatedDynamicProps,
        }));

        console.log("Updated dynamic properties:", updatedDynamicProps);
      }
    };

    // Combine the fields to watch from both arrays
    const cleanedFieldsArray = cleanFields(globalfields);
    console.log("cleanedFieldsArray", cleanedFieldsArray);
    const cleanedDynamicFields = cleanFields(Object.keys(dynamicProperties));
    const fieldsToWatch = [...cleanedFieldsArray, ...cleanedDynamicFields];

    if (fieldsToWatch.length > 0) {
      actions.onCrmPropertiesUpdate(fieldsToWatch, handlePropertiesUpdate);
    }

    return () => {
      actions.onCrmPropertiesUpdate([], null);
    };
  }, [
    context.crm.objectId,
    context.crm.objectTypeId,
    objectType,
    globalfields,
    globalcategories,
    crmProperties,
    fulltemplatelist,
    searchTerm,
    dynamicProperties,
  ]);


  const handleConnectToMarq = async (metadataType) => {
    try {
      const response = await hubspot.fetch("https://marqembed.fastgenapp.com/create-auth-url", {
        method: "POST",
        body: {
          metadataType: metadataType,
        },
      });
  
      if (response.ok) {
        const data = await response.json(); // Parse the JSON response
        // Check if Data exists in the response before accessing authorization_url
        if (data.Data && data.Data.authorization_url) {
          const authorization_url = data.Data.authorization_url;
          return { authorization_url }; // Return as an object
        } else {
          console.error("Data or authorization_url is missing in the response");
          return { authorization_url: null };
        }
      } else {
        const errorBody = await response.text(); // Read the error message if not OK
        console.error("Failed to get the authorization URL", response.status, errorBody);
        return { authorization_url: null };
      }
    } catch (error) {
      console.error("Error during authorization process:", error.message);
      return { authorization_url: null };
    }
  };
  
  
  

  // UPDATED createOrUpdateDataset FUNCTION v3
  const createOrUpdateDataset = async () => {
  
    try {
      // Check if the dataset already exists
      const checkDatasetResponse = await hubspot.fetch({
        name: "fetchAccountTable",
        parameters: { objectType: objectType, userId: userid }, // Include userId in the parameters
      });
  
      accountResponseBody = JSON.parse(checkDatasetResponse.response.body);
  
      const accountData = accountResponseBody?.dataRow?.values || {};
      const matchedData = accountResponseBody?.objectTypeRow?.values || {};
  
      const marqAccountId = accountData?.accountId || null;
      datasetid = matchedData?.datasetid || null;
      collectionid = matchedData?.collectionid || null;
  
      if (datasetid && collectionid) {
        return; // Dataset already exists, exit
      } else {
        // Call the createDataset serverless function
        const createDatasetResponse = await hubspot.fetch({
          name: "createDataset",
          parameters: {
            marqAccountId: marqAccountId,
            objectName: objectType,
            schema: schema.map((item) => ({
              ...item,
              fieldType: item.fieldType.toString(), // Ensure fieldType is a string
            })),
          },
        });
  
        // Handle successful creation of the dataset
        if (createDatasetResponse?.response?.statusCode === 200) {
          const datasetResult = JSON.parse(createDatasetResponse.response.body);
          datasetid = datasetResult.dataSourceId;
          collectionid = datasetResult.collectionId;

          await hubspot.fetch(
            "https://marqembed.fastgenapp.com/update-dataset",
            {
              method: "POST",
              body: {
                objectType: objectType,
                datasetId: datasetid,
                collectionId: collectionid,
                userId: userid,
                    }
            },);
        } else {
          console.error(
            `Failed to create dataset for ${objectType}:`,
            createDatasetResponse?.response?.body
          );
  
          throw new Error("Failed to create dataset.");
        }
      }
    } catch (error) {
      console.error("Error in createOrUpdateDataset:", error.message);
    }
  };
  

  const handleCopy = async (text) => {
    try {
      await actions.copyTextToClipboard(text); // Use navigator.clipboard.writeText
      actions.addAlert({
        type: "success",
        message: "URL copied to clipboard.",
      });
    } catch (error) {
      console.error("Error copying text:", error);
      actions.addAlert({
        type: "warning",
        message: "Couldn't copy the URL.",
      });
    }
  };

  if (iframeLoading || isLoading) {
    return (
      <Flex direction="column" gap="medium" align="center">
        <LoadingSpinner label="Loading projects..." layout="centered" />
      </Flex>
    );
  }

  if (!templates.length && !isLoading && showTemplates) {
    return (
      <EmptyState 
        title="No templates found" 
        layout="vertical" 
        reverseOrder={true}
      >
        <Text>
          Unable to find any templates. Please adjust your filters or add templates to your Marq brand template library.
        </Text>
        <Button onClick={() => fetchandapplytemplates()}>
          Resync templates
        </Button>
      </EmptyState>
    );
  }

  if (showTemplates) {
    return (
      <>
        {/* Marq Account Button
        {ShowMarqAccountButton && (
          <LoadingButton
            href={accountauthURL}
            loading={isLoading} // Use isLoading to control the spinner
            variant="primary"
            onClick={() => {
              startPollingForMarqAccount();
            }}
          >
            {isLoading ? "Syncing..." : "Sync Marq account data"}
          </LoadingButton>
        )} */}

        <Form>
          <Flex direction="row" justify="center" gap="small">
            <Box flex={1}>
              <Input
                type="text"
                placeholder="⌕ Search all templates"
                value={searchTerm}
                onInput={handleSearch}
                style={{ width: "100%" }}
              />
            </Box>
          </Flex>

          <Divider />

          <Flex direction="column" align="start" gap="small">
            <Box />
            <Box>
              <Text format={{ fontWeight: "bold" }}>{title}</Text>
            </Box>
          </Flex>
        </Form>

        <Table
          paginated
          page={currentPage}
          pageCount={totalPages}
          maxVisiblePageButtons={5}
          showButtonLabels
          showFirstLastButtons={false}
          onPageChange={handlePageChange}
        >
          <TableBody>
            {paginatedTemplates.map((template, index) => {
              const matchingProject = projects.find(
                (project) => project.originaltemplateid === template.id
              );

              return matchingProject ? (
                <TableRow key={matchingProject.objectId || index}>
                  <TableCell>
                    <Image
                      alt="File Preview"
                      src={`https://app.marq.com/documents/thumb/${matchingProject.projectid}/0/2048/NULL/400`}
                      onClick={() =>
                        editClick(
                          matchingProject.projectid,
                          matchingProject.fileid,
                          matchingProject.encodedoptions
                        )
                      }
                      preventDefault
                      width={100}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href="#"
                      onClick={() =>
                        editClick(
                          matchingProject.projectid,
                          matchingProject.fileid,
                          matchingProject.encodedoptions
                        )
                      }
                      preventDefault
                      variant="primary"
                    >
                      {matchingProject.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {formatDate(matchingProject.hs_lastmodifieddate)}
                  </TableCell>
                  <TableCell>
                    <ButtonRow disableDropdown={false}>
                      <Button
                        onClick={() =>
                          editClick(
                            matchingProject.projectid,
                            matchingProject.fileid,
                            matchingProject.encodedoptions
                          )
                        }
                      >
                        Open
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          console.log(
                            "URL to be copied:",
                            matchingProject.fileurl
                          ); // Log the URL
                          handleCopy(matchingProject.fileurl);
                        }}
                      >
                        Copy Published URL
                      </Button>
                      <CrmActionButton
                        actionType="EXTERNAL_URL"
                        actionContext={{ href: matchingProject.fileurl }}
                        variant="secondary"
                      >
                        Go to PDF
                      </CrmActionButton>
                      <CrmActionButton
                        actionType="SEND_EMAIL"
                        actionContext={{
                          objectTypeId: context.crm.objectTypeId,
                          objectId: context.crm.objectId,
                        }}
                        variant="secondary"
                        onClick={() => {
                          actions.addAlert({
                            type: "info",
                            message:
                              "You can now send the email with the copied URL.",
                          });
                        }}
                      >
                        Send Email
                      </CrmActionButton>
                      <Button
                        variant="destructive"
                        onClick={() =>
                          deleteRecord(matchingProject.objectId, "projects")
                        }
                      >
                        Delete
                      </Button>
                    </ButtonRow>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow
                  key={template.id || index}
                  onClick={() =>
                    setSelectedRow(selectedRow === index ? null : index)
                  }
                >
                  <TableCell>
                    <Image
                      alt="Template Preview"
                      src={`https://app.marq.com/documents/thumb/${template.id}/0/2048/NULL/400`}
                      onClick={() => handleClick(template)}
                      preventDefault
                      width={100}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href="#"
                      onClick={() => handleClick(template)}
                      preventDefault
                      variant="primary"
                    >
                      {template.title}
                    </Link>
                  </TableCell>
                  <TableCell />
                  <TableCell>
                    <LoadingButton
                      loading={loadingTemplateId === template.id}
                      size="medium"
                      onClick={() => {
                        setLoadingTemplateId(template.id);
                        handleClick(template);
                      }}
                    >
                      {loadingTemplateId === template.id
                        ? "Saving..."
                        : "Create"}
                    </LoadingButton>

                    {/* Cancel Button */}
                    {loadingTemplateId === template.id && (
                      <Button
                        variant="destructive"
                        size="small"
                        onClick={() => {
                          setLoadingTemplateId(null);
                          setShouldPollForProjects({
                            isPolling: false,
                            templateId: null,
                          });
                        }}
                      >
                        X
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </>
    );
  } else {
    if (ShowMarqUserButton) {
      return (
        <Button
          href={userauthURL}
          variant="primary"
          size="medium"
          type="button"
          onClick={startPollingForMarqUser}
        >
          Connect to Marq
        </Button>
      );
    }
  }
};
 
export default Extension;
