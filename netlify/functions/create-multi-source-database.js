import { Client } from "@notionhq/client";

const NOTION_API_VERSION = "2022-06-28";

// CORS headers - defined at top so all functions can access
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// Helper functions for generating sample data
const getSampleTitle = (dataSourceName, propertyName) => {
  const samples = {
    Products: {
      Name: "Wireless Bluetooth Headphones",
      Title: "Wireless Bluetooth Headphones",
      Product: "Wireless Bluetooth Headphones",
    },
    Orders: {
      Order_ID: "ORD-2025-001",
      Title: "Order #ORD-2025-001",
      Name: "Order #ORD-2025-001",
    },
    Customers: {
      Name: "John Smith",
      Title: "John Smith",
      Customer: "John Smith",
    },
  };
  return samples[dataSourceName]?.[propertyName] || `${dataSourceName} Sample`;
};

const getSampleText = (dataSourceName, propertyName) => {
  const samples = {
    Products: {
      Description: "High-quality wireless headphones with noise cancellation",
      Category: "Electronics",
      Brand: "TechBrand",
    },
    Orders: {
      Status: "Processing",
      Payment_Method: "Credit Card",
      Notes: "Customer requested express shipping",
    },
    Customers: {
      Email: "john.smith@email.com",
      Phone: "+1-555-0123",
      Address: "123 Main St, City, State 12345",
    },
  };
  return samples[dataSourceName]?.[propertyName] || "Sample text";
};

const getSampleNumber = (dataSourceName, propertyName) => {
  const samples = {
    Products: {
      Price: 199.99,
      Stock: 50,
      Weight: 0.5,
    },
    Orders: {
      Total: 199.99,
      Quantity: 1,
      Tax: 15.99,
    },
    Customers: {
      Age: 35,
      Orders_Count: 5,
      Credit_Score: 750,
    },
  };
  return samples[dataSourceName]?.[propertyName] || 0;
};

const getSampleSelect = (dataSourceName, propertyName) => {
  const samples = {
    Products: {
      Category: "Electronics",
      Status: "Active",
      Condition: "New",
    },
    Orders: {
      Status: "Processing",
      Priority: "Normal",
      Payment_Status: "Paid",
    },
    Customers: {
      Type: "Premium",
      Status: "Active",
      Tier: "Gold",
    },
  };
  return samples[dataSourceName]?.[propertyName] || "Default";
};

const getSampleCheckbox = (dataSourceName, propertyName) => {
  const samples = {
    Products: {
      In_Stock: true,
      Featured: false,
      Available: true,
    },
    Orders: {
      Shipped: false,
      Paid: true,
      Completed: false,
    },
    Customers: {
      Verified: true,
      Newsletter: true,
      VIP: false,
    },
  };
  return samples[dataSourceName]?.[propertyName] || false;
};

// Test function to check if database has expected columns
async function testDatabaseColumns(notion, databaseId, expectedProperties) {
  console.log(`\n🧪 TESTING DATABASE COLUMNS`);
  console.log(
    `Expected Properties: ${Object.keys(expectedProperties).join(", ")}`
  );
  console.log("-".repeat(50));

  try {
    console.log(
      "🔍 DEBUG: About to call notion.databases.retrieve with ID:",
      databaseId
    );

    // Create a fresh Notion client to ensure it's properly initialized
    const notionToken = process.env.NOTION_API_KEY;
    const freshNotion = new Client({
      auth: notionToken,
      notionVersion: NOTION_API_VERSION,
    });


    // Test if the Notion client is working by trying a simple call
    let database;
    try {
      console.log(
        "🔍 DEBUG: Testing fresh Notion client with a simple call..."
      );
      console.log(
        "🔍 DEBUG: About to call freshNotion.databases.retrieve with:",
        databaseId
      );

      // Try to retrieve the database with explicit error handling
      // Let's try calling it with explicit parameters to see if that helps
      const retrieveParams = { database_id: databaseId };

      database = await freshNotion.databases.retrieve(retrieveParams);
    } catch (apiError) {
      throw apiError;
    }

    if (!database.properties) {
      console.log(
        "🔍 DEBUG: Database object:",
        JSON.stringify(database, null, 2)
      );
      return {
        success: false,
        error: "No properties found",
        databaseInfo: database,
      };
    }

    const actualProperties = database.properties;
    const actualPropertyNames = Object.keys(actualProperties);


    // Compare expected vs actual properties
    const expectedPropertyNames = Object.keys(expectedProperties);
    const missingProperties = expectedPropertyNames.filter(
      (name) => !actualPropertyNames.includes(name)
    );
    const extraProperties = actualPropertyNames.filter(
      (name) => !expectedPropertyNames.includes(name)
    );

    console.log("\n📋 PROPERTY COMPARISON:");
    console.log(`   Expected: ${expectedPropertyNames.length} properties`);
    console.log(`   Actual: ${actualPropertyNames.length} properties`);

    if (missingProperties.length > 0) {
    } else {
      console.log(`✅ All expected properties present`);
    }

    if (extraProperties.length > 0) {
    }

    // Check property types
    console.log("\n🔍 PROPERTY TYPE ANALYSIS:");
    expectedPropertyNames.forEach((propName) => {
      if (actualProperties[propName]) {
        const actualType = actualProperties[propName].type;
        const expectedType = Object.keys(expectedProperties[propName])[0];
        const typeMatch = actualType === expectedType;
        console.log(
          `   ${propName}: ${actualType} ${
            typeMatch ? "✅" : "❌"
          } (expected: ${expectedType})`
        );
      }
    });

    const testResult = {
      success: true,
      expectedCount: expectedPropertyNames.length,
      actualCount: actualPropertyNames.length,
      missingProperties,
      extraProperties,
      allPropertiesPresent: missingProperties.length === 0,
    };

    console.log(
      `\n🎯 TEST RESULT: ${testResult.allPropertiesPresent ? "PASS" : "FAIL"}`
    );
    console.log("-".repeat(50));

    return testResult;
  } catch (error) {
    console.log(`❌ ERROR retrieving database: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Function to ensure color variation in select/multi_select options
function ensureColorVariation(properties) {
  const availableColors = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
  
  Object.keys(properties).forEach(propName => {
    const propType = Object.keys(properties[propName])[0];
    
    if (propType === 'select' || propType === 'multi_select') {
      const options = properties[propName][propType].options;
      if (options && options.length > 0) {
        // Check if all options have the same color
        const firstColor = options[0].color;
        const allSameColor = options.every(option => option.color === firstColor);
        
        if (allSameColor && options.length > 1) {
          console.log(`🎨 Fixing color variation for ${propName} - all options were ${firstColor}`);
          
          // Assign varied colors
          options.forEach((option, index) => {
            option.color = availableColors[index % availableColors.length];
          });
          
          console.log(`   ✅ Assigned varied colors: ${options.map(o => `${o.name}(${o.color})`).join(', ')}`);
        }
      }
    }
  });
  
  return properties;
}

// Function to test data source columns (adapted for 2025-09-03 API)
async function testDataSourceColumns(notion, dataSourceId, expectedProperties) {
  console.log(`\n🧪 TESTING DATA SOURCE COLUMNS`);
  console.log(
    `Expected Properties: ${Object.keys(expectedProperties).join(", ")}`
  );
  console.log("-".repeat(50));

  try {
    console.log(
      "🔍 DEBUG: About to call notion.dataSources.retrieve with ID:",
      dataSourceId
    );

    // Create a fresh Notion client to ensure it's properly initialized
    const notionToken = process.env.NOTION_API_KEY;
    const freshNotion = new Client({
      auth: notionToken,
      notionVersion: NOTION_API_VERSION,
    });

    // Test if the Notion client is working by trying a simple call
    let dataSource;
    try {
      console.log(
        "🔍 DEBUG: Testing fresh Notion client with data source call..."
      );
      console.log(
        "🔍 DEBUG: About to call freshNotion.dataSources.retrieve with:",
        dataSourceId
      );

      // Try to retrieve the data source with explicit error handling
      const retrieveParams = { data_source_id: dataSourceId };
      dataSource = await freshNotion.dataSources.retrieve(retrieveParams);
    } catch (apiError) {
      throw apiError;
    }

    if (!dataSource.properties) {
      console.log(
        "🔍 DEBUG: Data source object:",
        JSON.stringify(dataSource, null, 2)
      );
      return {
        success: false,
        error: "No properties found",
        dataSourceInfo: dataSource,
      };
    }

    const actualProperties = dataSource.properties;
    const actualPropertyNames = Object.keys(actualProperties);

    // Compare expected vs actual properties
    const expectedPropertyNames = Object.keys(expectedProperties);
    const missingProperties = expectedPropertyNames.filter(
      (name) => !actualPropertyNames.includes(name)
    );
    const extraProperties = actualPropertyNames.filter(
      (name) => !expectedPropertyNames.includes(name)
    );

    console.log("\n📋 PROPERTY COMPARISON:");
    console.log(`   Expected: ${expectedPropertyNames.length} properties`);
    console.log(`   Actual: ${actualPropertyNames.length} properties`);

    if (missingProperties.length > 0) {
      console.log(`❌ Missing properties: ${missingProperties.join(", ")}`);
    } else {
      console.log(`✅ All expected properties present`);
    }

    if (extraProperties.length > 0) {
      console.log(`ℹ️  Extra properties: ${extraProperties.join(", ")}`);
    }

    // Check property types
    console.log("\n🔍 PROPERTY TYPE ANALYSIS:");
    expectedPropertyNames.forEach((propName) => {
      if (actualProperties[propName]) {
        const actualType = actualProperties[propName].type;
        const expectedType = Object.keys(expectedProperties[propName])[0];
        const typeMatch = actualType === expectedType;
        console.log(
          `   ${propName}: ${actualType} ${
            typeMatch ? "✅" : "❌"
          } (expected: ${expectedType})`
        );
      }
    });

    const testResult = {
      success: true,
      expectedCount: expectedPropertyNames.length,
      actualCount: actualPropertyNames.length,
      missingProperties,
      extraProperties,
      allPropertiesPresent: missingProperties.length === 0,
    };

    console.log("\n✅ DATA SOURCE TEST COMPLETED");
    console.log(`   Success: ${testResult.success}`);
    console.log(`   Properties Match: ${testResult.allPropertiesPresent}`);

    return testResult;
  } catch (error) {
    console.log(`❌ ERROR testing data source: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Function to create separate databases for each data source
async function createSeparateDatabases(schema, databaseId) {
  // Initialize Notion client
  const notionToken = process.env.NOTION_API_KEY;
  const parentPageId = databaseId || process.env.NOTION_PARENT_PAGE_ID;

  if (!notionToken) {
    console.error("NOTION_API_KEY is not configured");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Notion API token not configured" }),
    };
  }

  if (!parentPageId) {
    console.error("No parent page ID provided and no default configured");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error:
          "Parent page ID is required. Please provide a page ID or set NOTION_PARENT_PAGE_ID in your environment variables.",
      }),
    };
  }

  const notion = new Client({
    auth: notionToken,
    notionVersion: NOTION_API_VERSION,
  });

  console.log("=".repeat(60));

  // STEP 1: CREATE ALL DATABASES
  console.log("📋 STEP 1: CREATING ALL DATABASES");
  console.log("-".repeat(40));
  console.log(`Found ${schema.dataSources.length} data sources to create:`);
  schema.dataSources.forEach((ds, index) => {
    console.log(`  ${index + 1}. ${ds.name} - ${ds.description}`);
  });
  console.log("-".repeat(40));

  // Create separate databases for each data source
  const createdDatabases = [];
  const sampleData = [];

  if (schema.dataSources && schema.dataSources.length > 0) {
    for (const dataSource of schema.dataSources) {
      try {
        console.log(
          `\n📊 Creating database ${createdDatabases.length + 1}/${
            schema.dataSources.length
          }: ${dataSource.name}`
        );
        console.log(`   Description: ${dataSource.description}`);

        // Use properties from the schema instead of hardcoded ones
        const properties = dataSource.properties || {};
        
        // Ensure color variation in select/multi_select options
        ensureColorVariation(properties);
        
        Object.keys(properties).forEach(propName => {
          const propType = Object.keys(properties[propName])[0];
          console.log(`     - ${propName}: ${propType}`);
          
          // Log select/multi_select options to verify colors
          if (propType === 'select' || propType === 'multi_select') {
            const options = properties[propName][propType].options;
            if (options && options.length > 0) {
              console.log(`       Options: ${options.map(o => `${o.name}(${o.color || 'no-color'})`).join(', ')}`);
            }
          }
        });

        // Create a separate database for this data source
        const databaseData = {
          parent: {
            type: "page_id",
            page_id: parentPageId,
          },
          title: [
            {
              type: "text",
              text: {
                content: `${schema.title} - ${dataSource.name}`,
              },
            },
          ],
          description: dataSource.description
            ? [
                {
                  type: "text",
                  text: {
                    content: dataSource.description,
                  },
                },
              ]
            : [],
          properties: properties,
        };

        // Debug: Log the exact data being sent to Notion API
        console.log(`🔍 DEBUG: Database data being sent to Notion API:`, JSON.stringify(databaseData, null, 2));
        
        let createdDatabase;
        try {
          createdDatabase = await notion.databases.create(databaseData);
          console.log(`Successfully created database: ${dataSource.name}`);
        } catch (createError) {
          console.error(
            `Database creation failed for ${dataSource.name}:`,
            createError
          );
          throw new Error(
            `Database creation failed for ${dataSource.name}: ${createError.message}`
          );
        }

        // Check if database was created successfully and has an ID
        if (!createdDatabase || !createdDatabase.id) {
          throw new Error(
            `Database creation failed for ${dataSource.name}: No ID returned`
          );
        }

        // Database created successfully with properties
        console.log(
          `✅ Database ${dataSource.name} created successfully with properties:`,
          Object.keys(properties)
        );

        // Test the database to verify columns were created
        const testResult = await testDatabaseColumns(
          notion,
          createdDatabase.id,
          properties
        );
        if (!testResult.success) {
          console.log(
            `⚠️  WARNING: Database test failed for ${dataSource.name}`
          );
        }

        createdDatabases.push({
          name: dataSource.name,
          description: dataSource.description,
          title: createdDatabase.title?.[0]?.plain_text || dataSource.name,
          url: createdDatabase.url,
          id: createdDatabase.id,
          properties: Object.keys(properties),
          status: "success",
        });
      } catch (error) {
        console.error(`Error creating database for ${dataSource.name}:`, error);

        // Still add to createdDatabases with error status so the process continues
        createdDatabases.push({
          name: dataSource.name,
          description: dataSource.description,
          error: error.message,
          status: "error",
        });
      }
    }
  }

  // STEP 1 COMPLETION
  console.log("-".repeat(40));
  console.log("✅ STEP 1 COMPLETED: DATABASE CREATION");
  console.log(
    `Successfully created ${
      createdDatabases.filter((db) => !db.status || db.status !== "error")
        .length
    } databases`
  );
  console.log(
    `Failed to create ${
      createdDatabases.filter((db) => db.status === "error").length
    } databases`
  );
  console.log("-".repeat(40));

  // Build response object with sanitized data (no circular references)
  const sanitizedDatabases = createdDatabases.map(db => ({
    name: db.name,
    description: db.description,
    title: db.title,
    url: db.url,
    id: db.id,
    properties: Array.isArray(db.properties) ? db.properties : (db.properties ? Object.keys(db.properties) : []),
    status: db.status || 'success',
    error: db.error
  }));

  const responseData = {
    success: true,
    databases: sanitizedDatabases,
    sampleData: sampleData,
    message: `${schema.title} created successfully with ${createdDatabases.length} separate databases`,
    errors: sanitizedDatabases.filter((db) => db.status === "error"),
    hasErrors: sanitizedDatabases.some((db) => db.status === "error"),
  };

  
  console.log(`\n✅ Returning success response with ${createdDatabases.length} databases`);
  
  // Test JSON.stringify works properly
  let responseBody;
  try {
    responseBody = JSON.stringify(responseData);
    console.log('✅ Response body stringified successfully. Length:', responseBody.length);
  } catch (e) {
    console.error('❌ Failed to stringify response:', e);
    responseBody = JSON.stringify({ 
      success: false, 
      error: 'Failed to serialize response',
      message: e.message 
    });
  }
  
  return {
    statusCode: 201,
    headers,
    body: responseBody,
  };
}

export async function handler(event, context) {
  console.log(
    "🔍 DEBUG: Query string parameters:",
    event.queryStringParameters
  );

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
    };
  }

  // Handle test requests
  if (event.httpMethod === "GET" && event.queryStringParameters?.test) {
    const databaseUrl = event.queryStringParameters.url;
    if (!databaseUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Database URL required for testing" }),
      };
    }

    // Extract database ID from URL and format as UUID
    const rawId = databaseUrl.split("/").pop();
    // If the ID already has hyphens, use it as is, otherwise format it
    const databaseId = rawId.includes("-")
      ? rawId
      : rawId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");

    const notionToken = process.env.NOTION_API_KEY;
    if (!notionToken) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Notion token not configured" }),
      };
    }

    const notion = new Client({
      auth: notionToken,
      notionVersion: NOTION_API_VERSION,
    });

    // Test with expected properties for different database types
    const expectedProperties = {
      Products: {
        Name: { title: {} },
        Description: { rich_text: {} },
        Category: { select: {} },
        Price: { number: {} },
        SKU: { rich_text: {} },
        "Image URL": { url: {} },
        "Is Featured": { checkbox: {} },
        "Created Date": { created_time: {} },
      },
      Orders: {
        "Order ID": { title: {} },
        "Customer Name": { rich_text: {} },
        "Order Date": { date: {} },
        Status: { select: {} },
        Items: { rich_text: {} },
        "Total Amount": { number: {} },
        "Shipping Address": { rich_text: {} },
        "Billing Address": { rich_text: {} },
        "Payment Method": { select: {} },
      },
      Customers: {
        "Customer Name": { title: {} },
        Email: { email: {} },
        "Phone Number": { phone_number: {} },
        "Billing Address": { rich_text: {} },
        "Shipping Address": { rich_text: {} },
        "Registration Date": { created_time: {} },
        "Loyalty Points": { number: {} },
      },
      Inventory: {
        "Product Name": { title: {} },
        SKU: { rich_text: {} },
        "Quantity on Hand": { number: {} },
        "Reorder Point": { number: {} },
        Supplier: { rich_text: {} },
        "Last Updated": { last_edited_time: {} },
      },
    };

    console.log(`🧪 STANDALONE DATABASE TEST`);

    // Try to determine database type from URL or test with all types
    const testResults = {};

    for (const [dbType, properties] of Object.entries(expectedProperties)) {
      console.log(`\n🔍 Testing against ${dbType} schema...`);
      const result = await testDatabaseColumns(notion, databaseId, properties);
      testResults[dbType] = result;

      // Add debug info to the result
      testResults[dbType].debug = {
        databaseId: databaseId,
        databaseIdType: typeof databaseId,
        isUndefined: databaseId === undefined,
        notionClientExists: !!notion,
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        databaseUrl,
        databaseId,
        testResults,
        message: "Database column test completed",
      }),
    };
  }

  // Handle POST requests for database creation
  if (event.httpMethod === "POST") {
    try {
      // Parse request body with better error handling
      let parsedBody;
      try {
        parsedBody = JSON.parse(event.body);
      } catch (parseError) {
        console.error("JSON parse error:", parseError.message);
        console.error("Request body:", event.body?.substring(0, 500)); // Log first 500 chars
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: "Invalid JSON in request body",
            message: parseError.message,
            hint: "Check that all property names and values are properly formatted"
          }),
        };
      }

      const {
        schema,
        databaseId,
        mode = "multi-source",
      } = parsedBody;

    if (!schema) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Schema is required" }),
      };
    }

      // Check if we should create separate databases instead of multi-source
      if (mode === "separate") {
        return await createSeparateDatabases(schema, databaseId);
      }

    // Initialize Notion client
    const notionToken = process.env.NOTION_API_KEY;
    const parentPageId = databaseId || process.env.NOTION_PARENT_PAGE_ID;

    if (!notionToken) {
      console.error("NOTION_API_KEY is not configured");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Notion API token not configured" }),
      };
    }

    if (!parentPageId) {
      console.error("No parent page ID provided and no default configured");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error:
            "Parent page ID is required. Please provide a page ID or set NOTION_PARENT_PAGE_ID in your environment variables.",
        }),
      };
    }

    const notion = new Client({
      auth: notionToken,
      notionVersion: NOTION_API_VERSION,
    });

      // Create the main database with properties from the first data source
      const firstDataSource =
        schema.dataSources && schema.dataSources.length > 0
          ? schema.dataSources[0]
          : null;

    const databaseData = {
      parent: {
        type: "page_id",
        page_id: parentPageId,
      },
      title: [
        {
          type: "text",
          text: {
            content: schema.title,
          },
        },
      ],
      description: schema.description
        ? [
            {
              type: "text",
              text: {
                content: schema.description,
              },
            },
          ]
        : [],
        properties: firstDataSource ? ensureColorVariation(firstDataSource.properties) : {},
      };

    const createdDatabase = await notion.databases.create(databaseData);

      // Create additional data sources using the proper Notion API
    const createdDatabases = [];
    if (schema.dataSources && schema.dataSources.length > 1) {
      for (let i = 1; i < schema.dataSources.length; i++) {
        const dataSource = schema.dataSources[i];

        try {
            console.log(`Creating data source: ${dataSource.name}`);
            console.log(`Data source properties:`, dataSource.properties);

            // Try using the Notion client to update the database with additional properties
            // Since the /v1/data_sources endpoint might not exist, let's try updating the database
            const updatedProperties = { ...createdDatabase.properties };

            // Add properties from this data source with a prefix
            Object.entries(ensureColorVariation(dataSource.properties)).forEach(([key, value]) => {
              const prefixedKey = `${dataSource.name}_${key}`;
              updatedProperties[prefixedKey] = value;
            });

            console.log(
              `Updating database with properties for ${dataSource.name}`
            );

            // Update the database with additional properties
            const updateResponse = await notion.databases.update({
              database_id: createdDatabase.id,
              properties: updatedProperties,
            });

            console.log(
              `Successfully updated database with ${dataSource.name} properties`
            );

            createdDatabases.push({
              name: dataSource.name,
              description: dataSource.description,
              properties: dataSource.properties,
              status: "created",
            });
          } catch (error) {
            console.error(
              `Error creating data source ${dataSource.name}:`,
              error
            );

            // If updating fails, still add to createdDatabases with error status
            createdDatabases.push({
            name: dataSource.name,
            description: dataSource.description,
            properties: dataSource.properties,
              status: "error",
              error: error.message,
            });
          }
        }
      }

      // Add sample data for each data source
      const sampleData = [];
      if (schema.dataSources && schema.dataSources.length > 0) {
        for (const dataSource of schema.dataSources) {
          try {
            // Create a sample page for this data source
            const samplePageData = {
              parent: {
                database_id: createdDatabase.id,
              },
              properties: {},
            };

            let hasTitle = false;

            // Add sample data based on data source type
            Object.entries(dataSource.properties).forEach(([key, value]) => {
              const prefixedKey = `${dataSource.name}_${key}`;

              if (value.title && !hasTitle) {
                // Only add one title property per page
                samplePageData.properties[prefixedKey] = {
                  title: [
                    {
                      text: {
                        content: getSampleTitle(dataSource.name, key),
                      },
                    },
                  ],
                };
                hasTitle = true;
              } else if (value.rich_text) {
                samplePageData.properties[prefixedKey] = {
                  rich_text: [
                    {
                      text: {
                        content: getSampleText(dataSource.name, key),
                      },
                    },
                  ],
                };
              } else if (value.number) {
                samplePageData.properties[prefixedKey] = {
                  number: getSampleNumber(dataSource.name, key),
                };
              } else if (value.select) {
                samplePageData.properties[prefixedKey] = {
                  select: {
                    name: getSampleSelect(dataSource.name, key),
                  },
                };
              } else if (value.checkbox) {
                samplePageData.properties[prefixedKey] = {
                  checkbox: getSampleCheckbox(dataSource.name, key),
                };
              } else if (value.date) {
                samplePageData.properties[prefixedKey] = {
                  date: {
                    start: new Date().toISOString().split("T")[0],
                  },
                };
              }
            });

            // Ensure we have at least one property
            if (Object.keys(samplePageData.properties).length === 0) {
              // Add a default title if no properties were added
              const firstProperty = Object.keys(dataSource.properties)[0];
              if (firstProperty) {
                samplePageData.properties[
                  `${dataSource.name}_${firstProperty}`
                ] = {
                  title: [
                    {
                      text: {
                        content: `${dataSource.name} Sample Entry`,
                      },
                    },
                  ],
                };
              }
            }

            console.log(
              `Creating sample page for ${dataSource.name}:`,
              samplePageData
            );
            const samplePage = await notion.pages.create(samplePageData);
            sampleData.push({
              dataSource: dataSource.name,
              pageId: samplePage.id,
              url: samplePage.url,
            });
            console.log(
              `Successfully created sample page for ${dataSource.name}`
            );
          } catch (error) {
            console.error(
              `Failed to create sample data for ${dataSource.name}:`,
              error
            );
        }
      }
    }

    // Build response object with sanitized data
    const sanitizedDatabases = createdDatabases.map(db => ({
      name: ds.name,
      description: ds.description,
      status: ds.status,
      error: ds.error
    }));

    const sanitizedSampleData = sampleData.map(sd => ({
      dataSource: sd.dataSource,
      pageId: sd.pageId,
      url: sd.url
    }));

    // Sanitize schema.dataSources to only include basic info
    const sanitizedSchemaDataSources = (schema.dataSources || []).map(ds => ({
      name: ds.name,
      description: ds.description
    }));

    const responseData = {
      success: true,
      database: {
        id: createdDatabase.id,
        url: createdDatabase.url,
        title: createdDatabase.title?.[0]?.plain_text || schema.title,
      },
      dataSources: sanitizedSchemaDataSources,
      databases: sanitizedDatabases,
      sampleData: sanitizedSampleData,
      message: `Multi-source database "${
        schema.title
      }" created successfully with ${
        schema.dataSources?.length || 1
      } data source(s) and sample data`,
    };

    // Test JSON.stringify works properly
    let responseBody;
    try {
      responseBody = JSON.stringify(responseData);
      console.log('✅ Multi-source response body stringified successfully. Length:', responseBody.length);
    } catch (e) {
      console.error('❌ Failed to stringify multi-source response:', e);
      responseBody = JSON.stringify({ 
        success: false, 
        error: 'Failed to serialize response',
        message: e.message 
      });
    }

    return {
      statusCode: 201,
      headers,
      body: responseBody,
    };
  } catch (error) {
    console.error("Error creating multi-source database:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to create multi-source database",
        message: error.message,
      }),
    };
  }
  }

  // Method not allowed
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: "Method not allowed" }),
  };
}
