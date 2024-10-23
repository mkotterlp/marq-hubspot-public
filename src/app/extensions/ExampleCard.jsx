import { useState, useEffect, useCallback, useRef } from "react"; 
import { LoadingButton, EmptyState, Flex, Box, Image, Input, Link, Button, ButtonRow, Table, Form, TableCell, TableBody, TableRow, Text, Divider, LoadingSpinner, hubspot, } from "@hubspot/ui-extensions";
import { CrmActionButton } from "@hubspot/ui-extensions/crm";

hubspot.extend((extensionContext) => {
  return (
    <Extension 
      context={extensionContext.context} 
      actions={extensionContext.actions}
    />
  );
});

const Extension = ({ context, actions }) => {
  const [constobjectType, setconstobjectType] = useState("");
  const [processedembedoptions, setprocessedembedoptions] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState(null);
  const [ShowMarqUserButton, setShowMarqUserButton] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [userauthURL, setuserauthurl] = useState("");
  const [templates, setTemplates] = useState([]);
  const [GlobalWatchFields, setGlobalWatchFields] = useState([]);
  const [GlobalCategoryFilters, setGlobalCategoryFilters] = useState([]);
  const [paginatedTemplates, setPaginatedTemplates] = useState([]);
  const [allTemplates, setAllTemplates] = useState([]);
  const [createdProjects, setCreatedProjects] = useState({});
  const [fulltemplatelist, setfullTemplates] = useState([]);
  const [dynamicProperties, setDynamicProperties] = useState({});
  const [lineitemProperties, setLineitemProperties] = useState([]);
  const [title, setTitle] = useState("Relevant Content");
  const [stageName, setStage] = useState("");
  const [initialFilteredTemplates, setInitialFilteredTemplates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: "none",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);
  const hasInitialized = useRef(false);
  const RECORDS_PER_PAGE = 10;
  const [shouldPollForProjects, setShouldPollForProjects] = useState({
    isPolling: false,
    templateId: null,
  });
  const pollingTimerRef = useRef(null);

  let objectId = "";
  let objectTypeId = "";
  let objectType = "";
  let userid = "";
  let hubid = "";
  let lasttemplatesyncdate = "";
  let templatesfeed = "";
  let marquserinitialized = false;
  let globalcategories = [];
  let globalfields = [];
  let propertiesBody = {};
  let collectionid = "";
  let datasetid = "";
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
            const usertableresult = marqlookupResponseBody.usertableresult;

            // Take actions based on the value of marquserinitialized
    if (usertableresult) {
      lasttemplatesyncdate = usertableresult.lasttemplatesyncdate ?? null;
      templatesfeed = usertableresult.templatesfeed ?? null;
      marquserinitialized = true;
      await fetchAssociatedProjectsAndDetails();
      await fetchandapplytemplates();
      fetchembedoptions();
      fetchcustomdatafields();
      setShowTemplates(true);  // Trigger to show templates
  } else {
      console.log("User is not initialized. Hiding templates...");
      setIsLoading(false);
      setShowMarqUserButton(true);
      setShowTemplates(false);  // Hide templates or take other actions
  } 
        
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
            globalcategories
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


const fetchcustomdatafields = async () => {
  try {

    if (!objectType) {
      const fetchedObjectType = await fetchObjectType();
      if (fetchedObjectType) {
        objectType = fetchedObjectType; // Assign the fetched objectType
      } else {
        console.error("Failed to fetch Object Type.");
      }
    }
    

    const customdatafieldslookup = await hubspot.fetch(
      "https://marqembed.fastgenapp.com/marq-custom-data-lookup",
      {
        method: "POST",
        body: {
          objecttype: objectType,
        }
      }
    );

    if (customdatafieldslookup.ok) {
      // Parse the response body as JSON
      const customdatafieldslookupResponseBody = await customdatafieldslookup.json();
      const customdatafields = customdatafieldslookupResponseBody.response;
      console.log("customdatafields", customdatafields);
      setDynamicProperties(customdatafields);

      if (customdatafields.length > 0) {
        await updateData();
      }

    } else {
      console.error(`Error fetching custom data fields table: ${customdatafieldslookup.status} - ${customdatafieldslookup.statusText}`);
    }
  } catch (error) {
    console.error("Error in fetching custom data fields:", error);
  }
};


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
          objectTypeId: context.crm.objectTypeId
        },
      }
    );

    if (objectTypeResponse.ok) {
      const objectTypeResponseBody = await objectTypeResponse.json();
      
      // Accessing the objectType within the body -> Data -> body
      objectType = objectTypeResponseBody.Data?.body?.objectType;

      if (objectType) {
        setconstobjectType(objectType); // Set the state if necessary
        return objectType; // Return the fetched objectType
      } else {
        console.error("Object Type not found in response.");
        return null;
      }
    } else {
      console.error("Error fetching object type:", objectTypeResponse);
      return null;
    }
  } catch (error) {
    console.error("Error fetching object type:", error);
    return null;
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

      // Check if the response and mapping are present
      if (templatefilterslookupResponseBody && templatefilterslookupResponseBody.response && templatefilterslookupResponseBody.response.mapping) {
        // Parse the 'mapping' field which is a JSON string
        const templatefilterslookupresult = JSON.parse(templatefilterslookupResponseBody.response.mapping);
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
          objectId: context.crm.objectId,       
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

const applytemplates = async (fetchedTemplates) => {
  try {
    setfullTemplates(fetchedTemplates || []);

    if (fetchedTemplates && fetchedTemplates.length > 0) {

      // Await the result of fetchtemplatefilters and store it locally
      const templatefilterslookupresult = await fetchtemplatefilters();

      // Check if templatefilterslookupresult is valid
      if (templatefilterslookupresult && typeof templatefilterslookupresult === 'object') {
        // Validate objectType (either passed or set globally)
        if (!objectType) {
          const fetchedObjectType = await fetchObjectType();
          if (fetchedObjectType) {
            objectType = fetchedObjectType; // Assign the fetched objectType
          } else {
            console.error("Failed to fetch Object Type.");
          }
        }        

        const pluralObjectType = `${objectType.toLowerCase()}s`; // e.g., "deal" -> "deals"
        const filterEntries = templatefilterslookupresult[pluralObjectType] || [];
        if (!filterEntries.length) {
          console.warn(`No entries found for objectType: ${objectType}`);
        }

        globalfields = filterEntries.map(entry => entry.formField); // Get formFields (e.g., 'industry', 'dealstage')
        setGlobalWatchFields(globalfields);
        globalcategories = filterEntries.map(entry => entry.categoryField.toLowerCase()); // Get categoryField (e.g., 'Industry', 'HS deal stage')
        setGlobalCategoryFilters(globalcategories);

        // Now, fetch the properties based on the fields
        const propertiesBody = await fetchObjectPropertiesFromFields(globalfields);
        console.log("propertiesBody", propertiesBody);

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
  
        if (fetchedTemplates) {

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
      console.log("fetchedTemplates", fetchedTemplates);
      setAllTemplates(fetchedTemplates);
      await applytemplates(fetchedTemplates);
      } else {
        console.error("Error with applying templates:", fetchjsonResponse);
      }
    } 
  setIsLoading(false); // Stop loading regardless of success or error
};

    const filterTemplates = (
      allTemplates,
      searchTerm,
      globalfields,
      globalcategories,
      properties
    ) => {
      let filtered = Array.isArray(allTemplates) ? allTemplates : [];
      const categoryFilters = extractFiltersFromProperties(globalfields, globalcategories, properties);
    
    
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
          filtered = Array.isArray(initialFilteredTemplates) ? [...initialFilteredTemplates] : [];
      }
    
    
      // If no templates match, return the full list
      if (filtered.length === 0) {
        filtered = allTemplates;

        if (!searchTerm.trim()) {
          filtered = Array.isArray(allTemplates) ? [...allTemplates] : [];
        } 
      }
    

  setTemplates(filtered); 
  setFilteredTemplates(filtered);
  setTotalPages(Math.ceil(filtered.length / RECORDS_PER_PAGE));
  setCurrentPage(1); 
    };
    

  const deleteRecord = async (projectid) => {
    try {

      await hubspot.fetch("https://marqembed.fastgenapp.com/delete-project", {
        method: "POST",
        body: {
          projectid: projectid
        }, 
      });


      setProjects((prevProjects) =>
        prevProjects.filter((project) => project.projectid !== projectid)
      );      


      actions.addAlert({
        title: "Success",
        message: "Project deleted successfully",
        variant: "success",
      });
    } catch (error) {
      console.error("Error deleting project:", error);

      actions.addAlert({
        title: "Error",
        variant: "error",
        message: `Failed to delete project: ${error.message}`,
      });
    }
  };

  function formatDate(dateString) {
    if (!dateString) {
      return "Invalid Date"; // Return a default message or handle appropriately
    }
  
    
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
    
    if (isNaN(date.getTime())) {
      return "Invalid Date"; // Return a default message or handle appropriately
    }
  
    const formattedDate = date.toLocaleString("en-US", options);
  
    return formattedDate;
  }
  
  

  const cleanAndGroupProjectDetails = (projectDetails) => {
    const groupedProjects = {};
  
    projectDetails.forEach(project => {
      // Destructure only the relevant fields
      const { dealstage, hubid, name, originaltemplateid, projectid, recordid, fileurl, hs_lastmodifieddate, fileid } = project;
  
      // Ensure projectid exists and group by it
      if (projectid) {
        groupedProjects[projectid] = { 
          dealstage, 
          hubid, 
          name, 
          originaltemplateid, 
          projectid, 
          recordid, 
          fileurl, 
          hs_lastmodifieddate,
          fileid,
        };
      }
    });
  
    return groupedProjects;
  };
  

  const fetchAssociatedProjectsAndDetails = useCallback(
    async () => {
      
      if (!context.crm.objectId) {
        console.error("No object ID available to fetch associated projects.");
        return [];
      }
  
      try {
        console.log("Fetching projects");
        const associatedProjectsResponse = await hubspot.fetch("https://marqembed.fastgenapp.com/fetch-projects2", {
          method: "POST",
          body: {
            recordid: context.crm.objectId
          },
        });
  
        if (associatedProjectsResponse.ok) {
          const projectsData = await associatedProjectsResponse.json();
          const projectDetails = projectsData.Data;
  
          if (projectDetails?.length > 0) {
            // Group and clean the project details by projectid
            const groupedProjects = cleanAndGroupProjectDetails(projectDetails);
            
            const detailedProjects = Object.values(groupedProjects);
            detailedProjects.sort(
              (a, b) => new Date(b.hs_lastmodifieddate) - new Date(a.hs_lastmodifieddate)
            );
  
            // Update state
            setProjects(detailedProjects);
            const totalPages = Math.ceil(detailedProjects.length / RECORDS_PER_PAGE);
            setTotalPages(totalPages);
            console.log("detailedProjects", detailedProjects);

            return detailedProjects;
          }
        } else {
          console.error("Failed to fetch associated projects:", associatedProjectsResponse.statusText);
          throw new Error("Failed to fetch associated projects");
        }
  
        return [];
      } catch (error) {
        console.error("Error during fetch:", error);
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
  

  const editClick = async (projectId, fileId, templateId) => {

    let editoriframeSrc = "https://info.marq.com/loading";
    actions.openIframeModal({
      uri: editoriframeSrc,
      height: 1500,
      width: 1500,
      title: "Marq",
    });
    
      const contactId = context.crm.objectId;
      const creatorid = context.user.id;
      const portalid = context.portal.id;
      const originobjectType = constobjectType;

      let editorinnerurl = `https://app.marq.com/documents/showIframedEditor/${projectId}/0?embeddedOptions=${processedembedoptions}&creatorid=${creatorid}&contactid=${contactId}&hubid=${portalid}&objecttype=${originobjectType}&fileid=${fileId}&templateid=${templateId}`;
      const baseInnerUrl = `https://app.marq.com/documents/iframe?newWindow=false&returnUrl=${encodeURIComponent(editorinnerurl)}`;

      editoriframeSrc =
        "https://info.marq.com/marqembed2?iframeUrl=" +
        encodeURIComponent(baseInnerUrl);
      actions.openIframeModal({
        uri: editoriframeSrc,
        height: 1500,
        width: 1500,
        title: "Marq Editor",
      });
      setShouldPollForProjects({ isPolling: true, templateId: templateId });
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



  const refreshProjects = async () => {
    console.log("Calling refresh projects");
  
    if (!shouldPollForProjects.isPolling) {
      console.log("Polling stopped: shouldPollForProjects.isPolling is false in refreshProjects");
      return;
    }
  
    const templateIdToMatch = shouldPollForProjects.templateId;
  
    if (templateIdToMatch) {
      const projectsList = await fetchAssociatedProjectsAndDetails();
      console.log("fetched projectsList from poll", projectsList);
  
      // Check for matching project
      const matchingProject = projectsList.find(
        (project) => project.originaltemplateid === templateIdToMatch
      );
  
      if (matchingProject) {
        console.log(`Found matching project for template ID: ${templateIdToMatch}`);
  
        // Stop polling and clear interval
        setShouldPollForProjects({ isPolling: false, templateId: null });
        setLoadingTemplateId(null);
  
        if (pollingTimerRef.current) {
          clearTimeout(pollingTimerRef.current);
          pollingTimerRef.current = null;  // Clear timer reference
        }
  
        return; // Exit early after finding a match
      }
  
      // Update the state to ensure `projects` reflects the latest data
      setProjects(projectsList);
    }
  };
  
  

  useEffect(() => {
    const pollingForProjects = async () => {
      // Stop polling if isPolling is set to false
      if (!shouldPollForProjects.isPolling) {
        if (pollingTimerRef.current) {
          clearTimeout(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }
        return; // Exit polling loop
      }
  
      if (shouldPollForProjects.isPolling && shouldPollForProjects.templateId) {
        await refreshProjects();
        
        // Check again if polling should continue
        if (shouldPollForProjects.isPolling) {  
          pollingTimerRef.current = setTimeout(() => {
            pollingForProjects();
          }, 20000);
        }
      }
    };
  
    if (shouldPollForProjects.isPolling && shouldPollForProjects.templateId) {
      pollingForProjects();
    }
  
    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [shouldPollForProjects]);
  
  

  const fetchLineItemProperties = async () => {
    try {
      const response = await hubspot.fetch('https://marqembed.fastgenapp.com/fetch-line-items', {
        method: 'POST',
        body: {
          objectId: context.crm.objectId,
        },
      });
  
      if (response.ok) {
        const data = await response.json();
        setLineitemProperties(data.lineItems || []);
      } else {
        console.error('Failed to fetch line item properties:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching line item properties:', error);
    }
  };
  
 


  const updateData = async () => {
    console.log("Starting updateData...");

    


    console.log("dynamicProperties before merge:", dynamicProperties);

   
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


        if (!objectType) {
          const fetchedObjectType = await fetchObjectType();
          if (fetchedObjectType) {
            objectType = fetchedObjectType; // Assign the fetched objectType
          } else {
            console.error("Failed to fetch Object Type.");
          }
        }


        // Only process line items if the objectType is 'DEAL'
        if (objectType === "DEAL") {

          console.log("ObjectType is DEAL. Fetching line item properties...");

          // Fetch line item properties directly within updateData
          await fetchLineItemProperties();
          console.log("Fetched line item properties:", lineitemProperties);
      
          const numberOfLineItems = Math.min(10, lineitemProperties.length); // Allow up to 10 line items
          console.log("Number of line items to process:", numberOfLineItems);

          if (lineitemProperties.length > 0) {
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
        console.log("Starting updateData4");

        try {
 
          const updatedataset = await hubspot.fetch(
            "https://marqembed.fastgenapp.com/update-data4",
            {
              method: "POST",
              body: {
                properties: updatedProperties,
                schema: updatedSchema,
                objecttype: objectType
              }
            }
          );
      
          if (updatedataset.ok) {
            // Parse the response body as JSON
            const updatedatasetresponsebody = await updatedataset.json();
            const updatedatasetresponse = updatedatasetresponsebody.response;
          } else {
            console.error(`Error updating dataset: ${updatedataset.status} - ${updatedataset.statusText}`);
          }
        } catch (error) {
          console.error("Error in updating the dataset:", error);
        }  
  };



  const handleClick = async (template) => {
    let iframeSrc = "https://info.marq.com/loading";
    actions.openIframeModal({
      uri: iframeSrc,
      height: 1500,
      width: 1500,
      title: "Marq",
    });
    
      const templateid = template?.id || "";
      const templatetitle = template?.title || "";

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
            const projectData = createProjectResponseBody?.project_info || {};
                        console.log("Project created successfully:", projectData);

            // Ensure projectId is extracted correctly
            projectId = projectData.id;

const timestamp = new Date().toISOString();

setCreatedProjects((prevProjects = {}) => ({
  ...prevProjects,
  [template.id]: {
    projectId: projectId,
    createdAt: timestamp,
  },
}));


            if (!projectId) {
              console.warn(
                "Failed to create project through the API - reverting to URL method."
              );
              iframeFallback(template.id); // Fallback in case of failure
              return;
            }

            const contactId = context.crm.objectId;
            const portalid = context.portal.id;
            const returnUrl = `https://app.marq.com/documents/showIframedEditor/${projectId}/0?embeddedOptions=${processedembedoptions}&creatorid=${userid}&contactid=${contactId}&hubid=${portalid}&objecttype=${objectType}&dealstage=${stageName}&templateid=${template.id}`;
            const baseInnerUrl = `https://app.marq.com/documents/iframe?newWindow=false&returnUrl=${encodeURIComponent(returnUrl)}`;

            iframeSrc =
              "https://info.marq.com/marqembed2?iframeUrl=" +
              encodeURIComponent(baseInnerUrl);
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
      actions.openIframeModal({
        uri: iframeSrc,
        height: 1500,
        width: 1500,
        title: "Marq",
      });
      
      setShouldPollForProjects({ isPolling: true, templateId: template.id });
 
  };

  /**
   * Fallback function to revert to the URL method in case of any failure
   */
  function iframeFallback(templateId) {
    let iframeSrc = "https://info.marq.com/loading";
    actions.openIframeModal({
      uri: iframeSrc,
      height: 1500,
      width: 1500,
      title: "Marq",
    });

    const contactId = context.crm.objectId;
    const creatorid = context.user.id;
    const portalid = context.portal.id;
    const originobjectType = constobjectType;

    const returnUrl = `https://app.marq.com/documents/editNewIframed/${templateId}?embeddedOptions=${processedembedoptions}&creatorid=${creatorid}&contactid=${contactId}&hubid=${portalid}&objecttype=${originobjectType}&dealstage=${stageName}&templateid=${templateId}`;
    const baseInnerUrl = `https://app.marq.com/documents/iframe?newWindow=false&returnUrl=${encodeURIComponent(returnUrl)}`;

    iframeSrc =
      "https://info.marq.com/marqembed2?iframeUrl=" +
      encodeURIComponent(baseInnerUrl);
    actions.openIframeModal({
      uri: iframeSrc,
      height: 1500,
      width: 1500,
      title: "Marq",
    });
    
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
        setFilteredTemplates(Array.isArray(initialFilteredTemplates) ? [...initialFilteredTemplates] : []);
        setTitle("Relevant Content");
      } else {
        setTitle("Search Results");
      }
    },
    [initialFilteredTemplates]
  );

  useEffect(() => {
    if (searchTerm.trim() === "") {
      if (filteredTemplates.length !== initialFilteredTemplates.length) {
        setFilteredTemplates(Array.isArray(initialFilteredTemplates) ? [...initialFilteredTemplates] : []);
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

useEffect(() => {
  // This will update the total number of pages whenever filteredTemplates change
  const pages = Math.ceil(filteredTemplates.length / RECORDS_PER_PAGE);
  
  // Reset current page if it's greater than totalPages
  if (currentPage > pages) {
    setCurrentPage(1);
  } else {
    setTotalPages(pages); // Update total pages first
    const newPaginatedTemplates = filteredTemplates.slice(
      (currentPage - 1) * RECORDS_PER_PAGE,
      currentPage * RECORDS_PER_PAGE
    );
    setPaginatedTemplates(newPaginatedTemplates); // Update paginated templates for display
  }
}, [filteredTemplates, currentPage]);


  useEffect(() => {
    const dynamicFieldMapping = Object.keys(dynamicProperties).reduce((acc, field) => {
      acc[field] = field;
      return acc;
    }, {});
    const handlePropertiesUpdate = (updatedProperties) => {
      // Handle updates for GlobalWatchFields
      if (GlobalWatchFields && GlobalWatchFields.length > 0) {
        const hasRelevantChange = GlobalWatchFields.some(
          (field) => updatedProperties[field] !== undefined
        );
        if (hasRelevantChange && hasInitialized.current) {
          if (GlobalCategoryFilters.length > 0) {
            console.log('Applying filterTemplates due to change in GlobalWatchFields');
            const processtemplates = async () => {
              setIsLoading(true); 
              await applytemplates(allTemplates);
              setIsLoading(false); 
            };
            processtemplates();
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
  
        // setDynamicProperties((prevProperties) => ({
        //   ...prevProperties,
        //   ...updatedDynamicProps,
        // }));
        }
    };
  
    // Combine the fields to watch from both GlobalWatchFields and dynamicProperties
    const fieldsToWatch = [...GlobalWatchFields, ...Object.keys(dynamicProperties)];  
    if (fieldsToWatch.length > 0) {
      actions.onCrmPropertiesUpdate(fieldsToWatch, handlePropertiesUpdate);
    }
  
    return () => {
      actions.onCrmPropertiesUpdate([], null);
    };
  }, [
    context.crm.objectId,
    context.crm.objectTypeId,
    GlobalWatchFields, 
    GlobalCategoryFilters,
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

  if (isLoading) {
    return (
      <Flex direction="column" gap="medium" align="center">
        <LoadingSpinner label="Loading projects..." layout="centered" />
      </Flex>
    );
  }

  if (!filteredTemplates.length && !isLoading && showTemplates) {
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
                          matchingProject.originaltemplateid                        
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
                          matchingProject.originaltemplateid                        
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
    {matchingProject.projectid && matchingProject.originaltemplateid && (
      <Button
        onClick={() =>
          editClick(
            matchingProject.projectid,
            matchingProject.fileid,
            matchingProject.originaltemplateid
          )
        }
      >
        Edit
      </Button>
    )}
    
    {matchingProject.fileurl && (
      <>
        <Button
          variant="secondary"
          onClick={() => {
            console.log("URL to be copied:", matchingProject.fileurl);
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
      </>
    )}
    {matchingProject.fileurl && (

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
          message: "You can now send the email with the copied URL.",
        });
      }}
    >
      Send Email
    </CrmActionButton>
     )}

    {matchingProject.projectid && (
      <Button
        variant="destructive"
        onClick={() => deleteRecord(matchingProject.projectid)}
      >
        Delete
      </Button>
    )}
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
                      src={`https://app.marq.com/documents/thumb/${
                        createdProjects[template.id]?.projectId || template.id
                      }/0/2048/NULL/400`}
                        onClick={() => {
                        if (createdProjects[template.id]) {
                          editClick(createdProjects[template.id].projectId, template.id, template.id);
                        } else {
                          handleClick(template).then(() => {
                            // setShouldPollForProjects({ isPolling: true, templateId: template.id });
                          });
                        }
                      }}
                      preventDefault
                      width={100}
                    />
                    </TableCell>
                    <TableCell>
                      <Link
                        href="#"
                        onClick={() => {
                          if (createdProjects[template.id]) {
                            editClick(createdProjects[template.id].projectId, template.id, template.id);
                          } else {
                            handleClick(template).then(() => {
                              // setShouldPollForProjects({ isPolling: true, templateId: template.id });
                            });
                          }
                        }}
                        preventDefault
                        variant="primary"
                      >
                        {template.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                    {createdProjects[template.id]?.createdAt 
  ? formatDate(createdProjects[template.id].createdAt) 
  : ""}
</TableCell>
                  <TableCell>
  {createdProjects[template.id] ? (
    <ButtonRow disableDropdown={false}>
      <Button
        size="medium"
        onClick={() => {
          // If the project is already created, call editClick
          editClick(createdProjects[template.id].projectId, template.id, template.id);
        }}
      >
        Edit
      </Button>
        
      <Button
        variant="destructive"
        onClick={() => {
          // Call deleteRecord and remove it from createdProjects state
          deleteRecord(template.id);
          setCreatedProjects((prevProjects) => {
            const updatedProjects = { ...prevProjects };
            delete updatedProjects[template.id]; // Remove from state
            return updatedProjects;
          });
        }}
      >
        Delete
      </Button>
    </ButtonRow>
  ) : (
    <Button
      size="medium"
      onClick={() => {
        // Create the project and then poll for it
        setLoadingTemplateId(template.id);
        handleClick(template).then(() => {
          // setShouldPollForProjects({
          //   isPolling: true,
          //   templateId: template.id,
          // });
        });
      }}
    >
      Create
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
