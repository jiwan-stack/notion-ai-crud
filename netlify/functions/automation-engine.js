import { Client } from "@notionhq/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

const NOTION_API_VERSION = "2025-09-03";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// Pre-built database templates for quick deployment
const DATABASE_TEMPLATES = {
  project_management: {
    title: "Project Management Hub",
    description:
      "Complete project management system with tasks, timelines, and team collaboration",
    properties: {
      "Project Name": { title: {} },
      Status: {
        select: {
          options: [
            { name: "Planning", color: "gray" },
            { name: "In Progress", color: "blue" },
            { name: "Review", color: "yellow" },
            { name: "Complete", color: "green" },
            { name: "On Hold", color: "red" },
          ],
        },
      },
      Priority: {
        select: {
          options: [
            { name: "Low", color: "gray" },
            { name: "Medium", color: "yellow" },
            { name: "High", color: "orange" },
            { name: "Critical", color: "red" },
          ],
        },
      },
      "Team Lead": { people: {} },
      "Start Date": { date: {} },
      "Due Date": { date: {} },
      Progress: { number: { format: "percent" } },
      Budget: { number: { format: "dollar" } },
      Description: { rich_text: {} },
      Tags: {
        multi_select: {
          options: [
            { name: "Frontend", color: "blue" },
            { name: "Backend", color: "green" },
            { name: "Design", color: "pink" },
            { name: "Research", color: "purple" },
          ],
        },
      },
    },
    sampleData: [
      {
        "Project Name": { title: [{ text: { content: "Website Redesign" } }] },
        Status: { select: { name: "In Progress" } },
        Priority: { select: { name: "High" } },
        Progress: { number: 65 },
        Description: {
          rich_text: [
            {
              text: {
                content:
                  "Complete overhaul of company website with modern design",
              },
            },
          ],
        },
      },
    ],
  },

  customer_crm: {
    title: "Customer Relationship Manager",
    description:
      "Comprehensive CRM system for managing customer relationships and sales pipeline",
    properties: {
      "Company Name": { title: {} },
      "Contact Person": { rich_text: {} },
      Email: { email: {} },
      Phone: { phone_number: {} },
      Status: {
        select: {
          options: [
            { name: "Lead", color: "yellow" },
            { name: "Qualified", color: "blue" },
            { name: "Proposal", color: "orange" },
            { name: "Customer", color: "green" },
            { name: "Lost", color: "red" },
          ],
        },
      },
      Industry: {
        select: {
          options: [
            { name: "Technology", color: "blue" },
            { name: "Finance", color: "green" },
            { name: "Healthcare", color: "red" },
            { name: "Education", color: "purple" },
            { name: "Retail", color: "yellow" },
          ],
        },
      },
      "Deal Value": { number: { format: "dollar" } },
      "Last Contact": { date: {} },
      "Next Follow-up": { date: {} },
      Notes: { rich_text: {} },
      Website: { url: {} },
    },
    sampleData: [
      {
        "Company Name": {
          title: [{ text: { content: "Tech Solutions Inc" } }],
        },
        "Contact Person": {
          rich_text: [{ text: { content: "John Smith, CEO" } }],
        },
        Status: { select: { name: "Qualified" } },
        Industry: { select: { name: "Technology" } },
        "Deal Value": { number: 50000 },
      },
    ],
  },

  content_library: {
    title: "Content Library & Knowledge Base",
    description:
      "Organize articles, resources, documentation, and knowledge assets",
    properties: {
      Title: { title: {} },
      Type: {
        select: {
          options: [
            { name: "Article", color: "blue" },
            { name: "Tutorial", color: "green" },
            { name: "Documentation", color: "gray" },
            { name: "Video", color: "red" },
            { name: "Template", color: "yellow" },
          ],
        },
      },
      Status: {
        select: {
          options: [
            { name: "Draft", color: "gray" },
            { name: "Review", color: "yellow" },
            { name: "Published", color: "green" },
            { name: "Archived", color: "red" },
          ],
        },
      },
      Author: { people: {} },
      Category: {
        multi_select: {
          options: [
            { name: "Development", color: "blue" },
            { name: "Design", color: "pink" },
            { name: "Marketing", color: "orange" },
            { name: "Business", color: "green" },
          ],
        },
      },
      Tags: { multi_select: { options: [] } },
      URL: { url: {} },
      "Created Date": { created_time: {} },
      "Last Updated": { last_edited_time: {} },
      Summary: { rich_text: {} },
      Priority: {
        select: {
          options: [
            { name: "Low", color: "gray" },
            { name: "Medium", color: "yellow" },
            { name: "High", color: "red" },
          ],
        },
      },
    },
  },

  event_planning: {
    title: "Event Planning & Management",
    description:
      "Comprehensive event planning system with timeline, vendors, and attendees",
    properties: {
      "Event Name": { title: {} },
      "Event Type": {
        select: {
          options: [
            { name: "Conference", color: "blue" },
            { name: "Workshop", color: "green" },
            { name: "Webinar", color: "yellow" },
            { name: "Networking", color: "purple" },
            { name: "Launch", color: "red" },
          ],
        },
      },
      Status: {
        select: {
          options: [
            { name: "Planning", color: "gray" },
            { name: "Confirmed", color: "blue" },
            { name: "In Progress", color: "yellow" },
            { name: "Completed", color: "green" },
            { name: "Cancelled", color: "red" },
          ],
        },
      },
      "Event Date": { date: {} },
      Location: { rich_text: {} },
      "Expected Attendees": { number: {} },
      Budget: { number: { format: "dollar" } },
      "Event Manager": { people: {} },
      Vendors: { multi_select: { options: [] } },
      Notes: { rich_text: {} },
    },
  },
};

// Automation workflows
const AUTOMATION_WORKFLOWS = {
  recurring_projects: {
    name: "Monthly Project Setup",
    description: "Automatically create project databases every month",
    trigger: "schedule",
    schedule: "0 0 1 * *", // First day of every month
    action: "create_database",
    template: "project_management",
  },

  quarterly_reviews: {
    name: "Quarterly Business Review",
    description: "Create review databases every quarter",
    trigger: "schedule",
    schedule: "0 0 1 */3 *", // First day of every quarter
    action: "create_database",
    template: "business_review",
  },

  event_followup: {
    name: "Event Follow-up Database",
    description: "Create follow-up database after events",
    trigger: "webhook",
    condition: "event_completed",
    action: "create_database",
    template: "followup_tracker",
  },
};

export async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { action, payload } = JSON.parse(event.body);

    switch (action) {
      case "list_templates":
        return listTemplates();

      case "get_template_schema":
        return getTemplateSchema(payload);

      case "deploy_template":
        return await deployTemplate(payload);

      case "create_workflow":
        return await createWorkflow(payload);

      case "smart_suggest":
        return await smartSuggest(payload);

      case "bulk_create":
        return await bulkCreate(payload);

      case "save_template":
        return await saveTemplate(payload);

      case "update_template":
        return await updateTemplate(payload);

      case "delete_template":
        return await deleteTemplate(payload);

      case "duplicate_template":
        return await duplicateTemplate(payload);

      case "export_templates":
        return exportTemplates(payload);

      case "import_templates":
        return await importTemplates(payload);

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid action" }),
        };
    }
  } catch (error) {
    console.error("Automation engine error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
}

// List available templates
function listTemplates() {
  const templates = Object.entries(DATABASE_TEMPLATES).map(
    ([key, template]) => ({
      id: key,
      title: template.title,
      description: template.description,
      propertyCount: Object.keys(template.properties).length,
      hasSampleData: !!template.sampleData,
      custom: !!template.custom,
    })
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      templates,
      workflows: Object.entries(AUTOMATION_WORKFLOWS).map(
        ([key, workflow]) => ({
          id: key,
          ...workflow,
        })
      ),
    }),
  };
}

// Get template schema for editing
function getTemplateSchema(payload) {
  const { templateId } = payload;

  if (!templateId || !DATABASE_TEMPLATES[templateId]) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Template not found" }),
    };
  }

  const template = DATABASE_TEMPLATES[templateId];

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      template: {
        id: templateId,
        title: template.title,
        description: template.description,
        properties: template.properties,
        sampleData: template.sampleData,
      },
      schema: {
        title: template.title,
        description: template.description,
        dataSources: [
          {
            name: template.title,
            description: template.description,
            properties: template.properties
          }
        ]
      },
    }),
  };
}

// Deploy a template with optional customization
async function deployTemplate(payload) {
  const { templateId, customizations, includeSampleData, parentPageId } =
    payload;

  if (!templateId || !DATABASE_TEMPLATES[templateId]) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid template ID" }),
    };
  }

  const template = { ...DATABASE_TEMPLATES[templateId] };

  // Apply customizations
  if (customizations) {
    if (customizations.title) template.title = customizations.title;
    if (customizations.description)
      template.description = customizations.description;
    if (customizations.properties) {
      template.properties = {
        ...template.properties,
        ...customizations.properties,
      };
    }
  }

  // Create the database
  const notion = new Client({ auth: process.env.NOTION_API_KEY });

  // Ensure we have a valid parent page ID
  const finalParentPageId = parentPageId || process.env.NOTION_PARENT_PAGE_ID;

  if (!finalParentPageId) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Parent page ID not configured",
        message: "NOTION_PARENT_PAGE_ID environment variable is required",
      }),
    };
  }

  const databaseData = {
    parent: {
      type: "page_id",
      page_id: finalParentPageId,
    },
    title: [{ type: "text", text: { content: template.title } }],
    description: template.description
      ? [{ type: "text", text: { content: template.description } }]
      : [],
    properties: formatPropertiesForNotion(template.properties),
  };

  const database = await notion.databases.create(databaseData);

  // Add sample data if requested
  if (includeSampleData && template.sampleData) {
    for (const sampleItem of template.sampleData) {
      await notion.pages.create({
        parent: { database_id: database.id },
        properties: sampleItem,
      });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      database: {
        id: database.id,
        title: template.title,
        url: database.url,
        sampleDataAdded: includeSampleData && template.sampleData?.length > 0,
      },
    }),
  };
}

// Smart template suggestion based on user input
async function smartSuggest(payload) {
  const { userInput } = payload;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Try multiple models with fallback
  const models = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"];
  let model = null;
  let lastError = null;

  for (const modelName of models) {
    try {
      model = genAI.getGenerativeModel({ model: modelName });
      // Test the model with a simple request
      await model.generateContent("test");
      break;
    } catch (error) {
      lastError = error;
      console.log(`Model ${modelName} failed:`, error.message);
      continue;
    }
  }

  if (!model) {
    throw new Error(`No available models. Last error: ${lastError?.message}`);
  }

  const prompt = `
  Analyze this user request and suggest the best database template from these options:
  ${Object.entries(DATABASE_TEMPLATES)
    .map(
      ([key, template]) =>
        `- ${key}: ${template.title} - ${template.description}`
    )
    .join("\n")}

  User request: "${userInput}"

  Respond with JSON: {
    "suggestedTemplate": "template_key",
    "confidence": 0.95,
    "reasoning": "explanation",
    "customizations": {
      "title": "suggested custom title",
      "additionalProperties": {}
    }
  }
  `;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  try {
    const suggestion = JSON.parse(response.match(/\{[\s\S]*\}/)[0]);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(suggestion),
    };
  } catch (error) {
    // Fallback to simple keyword matching
    const lowerInput = userInput.toLowerCase();
    let suggestedTemplate = "project_management"; // default

    if (lowerInput.includes("customer") || lowerInput.includes("crm")) {
      suggestedTemplate = "customer_crm";
    } else if (
      lowerInput.includes("content") ||
      lowerInput.includes("article")
    ) {
      suggestedTemplate = "content_library";
    } else if (lowerInput.includes("event") || lowerInput.includes("meeting")) {
      suggestedTemplate = "event_planning";
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        suggestedTemplate,
        confidence: 0.7,
        reasoning: "Based on keyword matching",
        customizations: { title: userInput },
      }),
    };
  }
}

// Create multiple databases in bulk
async function bulkCreate(payload) {
  const { templates, parentPageId } = payload;
  const results = [];

  for (const templateConfig of templates) {
    try {
      const finalParentPageId =
        parentPageId || process.env.NOTION_PARENT_PAGE_ID;

      if (!finalParentPageId) {
        results.push({
          success: false,
          error: "Parent page ID not configured",
          templateId: templateConfig.templateId,
        });
        continue;
      }

      const result = await deployTemplate({
        ...templateConfig,
        parentPageId: finalParentPageId,
      });

      const data = JSON.parse(result.body);
      results.push({ success: true, ...data });
    } catch (error) {
      results.push({
        success: false,
        error: error.message,
        templateId: templateConfig.templateId,
      });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      results,
      totalCreated: results.filter((r) => r.success).length,
      totalFailed: results.filter((r) => !r.success).length,
    }),
  };
}

// Create workflow automation
async function createWorkflow(payload) {
  // This would integrate with a job scheduler like node-cron or external service
  // For now, we'll return the workflow configuration

  const { workflowId, customSchedule, templateId, customizations } = payload;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      workflow: {
        id: workflowId,
        schedule: customSchedule,
        template: templateId,
        customizations,
        status: "configured",
        nextRun: "Manual trigger required", // Would be calculated based on schedule
      },
    }),
  };
}

// Template editing functions
async function saveTemplate(payload) {
  const { templateId, template } = payload;

  // Validate template structure
  if (!template || !template.title || !template.properties) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid template structure" }),
    };
  }

  // Add to templates (in production, this would save to a database)
  DATABASE_TEMPLATES[templateId] = {
    ...template,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    custom: true,
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      templateId,
      message: "Template saved successfully",
    }),
  };
}

async function updateTemplate(payload) {
  const { templateId, updates } = payload;

  if (!DATABASE_TEMPLATES[templateId]) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Template not found" }),
    };
  }

  // Update template
  DATABASE_TEMPLATES[templateId] = {
    ...DATABASE_TEMPLATES[templateId],
    ...updates,
    updated: new Date().toISOString(),
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      templateId,
      template: DATABASE_TEMPLATES[templateId],
      message: "Template updated successfully",
    }),
  };
}

async function deleteTemplate(payload) {
  const { templateId } = payload;

  if (!DATABASE_TEMPLATES[templateId]) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Template not found" }),
    };
  }

  // Prevent deletion of system templates
  if (!DATABASE_TEMPLATES[templateId].custom) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: "Cannot delete system templates" }),
    };
  }

  delete DATABASE_TEMPLATES[templateId];

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: "Template deleted successfully",
    }),
  };
}

async function duplicateTemplate(payload) {
  const { templateId, newTemplateId, customizations } = payload;

  if (!DATABASE_TEMPLATES[templateId]) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Template not found" }),
    };
  }

  if (DATABASE_TEMPLATES[newTemplateId]) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ error: "Template ID already exists" }),
    };
  }

  // Create duplicate with customizations
  const originalTemplate = DATABASE_TEMPLATES[templateId];
  const newTemplate = {
    ...originalTemplate,
    title: customizations?.title || `${originalTemplate.title} (Copy)`,
    description: customizations?.description || originalTemplate.description,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    custom: true,
    originalTemplate: templateId,
  };

  // Apply property customizations if provided
  if (customizations?.properties) {
    newTemplate.properties = {
      ...newTemplate.properties,
      ...customizations.properties,
    };
  }

  DATABASE_TEMPLATES[newTemplateId] = newTemplate;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      templateId: newTemplateId,
      template: newTemplate,
      message: "Template duplicated successfully",
    }),
  };
}

function exportTemplates(payload) {
  const includeSystem = !!(payload && payload.includeSystem);

  const allTemplates = Object.entries(DATABASE_TEMPLATES).reduce(
    (acc, [key, template]) => {
      acc[key] = template;
      return acc;
    },
    {}
  );

  const customTemplates = Object.entries(DATABASE_TEMPLATES)
    .filter(([_, template]) => template.custom)
    .reduce((acc, [key, template]) => {
      acc[key] = template;
      return acc;
    }, {});

  const toExport = includeSystem ? allTemplates : customTemplates;

  return {
    statusCode: 200,
    headers: {
      ...headers,
      "Content-Disposition": "attachment; filename=notion-templates.json",
    },
    body: JSON.stringify({
      templates: toExport,
      exportDate: new Date().toISOString(),
      version: "1.0",
    }),
  };
}

async function importTemplates(payload) {
  const { templates, overwrite = false, duplicateIfExists = false } = payload;

  if (!templates || typeof templates !== "object") {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid templates format" }),
    };
  }

  const results = {
    imported: [],
    skipped: [],
    errors: [],
  };

  for (const [templateId, template] of Object.entries(templates)) {
    try {
      // Normalize incoming template shape to ensure properties exist
      const inferredProperties =
        (template && template.properties) ||
        (template && template.schema && Array.isArray(template.schema.dataSources) && template.schema.dataSources[0] && template.schema.dataSources[0].properties) ||
        (template && template.asDataSource && template.asDataSource.properties) ||
        null;

      if (!inferredProperties || typeof inferredProperties !== 'object') {
        results.errors.push({ templateId, error: 'Template missing properties' });
        continue;
      }

      const normalizedTemplate = {
        ...template,
        properties: inferredProperties,
      };

      // Skip if template exists and overwrite is false
      if (DATABASE_TEMPLATES[templateId] && !overwrite) {
        if (duplicateIfExists) {
          // Create a unique ID by appending a counter
          let counter = 1;
          let newId = `${templateId}_copy`;
          while (DATABASE_TEMPLATES[newId]) {
            counter++;
            newId = `${templateId}_copy_${counter}`;
          }

          DATABASE_TEMPLATES[newId] = {
            ...normalizedTemplate,
            title: `${template.title || templateId} (Copy ${counter > 1 ? counter : ''})`.trim(),
            custom: true,
            imported: new Date().toISOString(),
            originalTemplate: templateId,
          };

          results.imported.push(newId);
          continue;
        } else {
          results.skipped.push(templateId);
          continue;
        }
      }

      // Validate template structure
      if (!template.title || !template.properties) {
        results.errors.push({
          templateId,
          error: "Invalid template structure",
        });
        continue;
      }

      // Import template
      DATABASE_TEMPLATES[templateId] = {
        ...normalizedTemplate,
        imported: new Date().toISOString(),
        custom: true,
      };

      results.imported.push(templateId);
    } catch (error) {
      results.errors.push({
        templateId,
        error: error.message,
      });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      results,
      message: `Imported ${results.imported.length} templates`,
    }),
  };
}

// Helper function to format properties for Notion API
function formatPropertiesForNotion(properties) {
  const formatted = {};

  for (const [name, config] of Object.entries(properties)) {
    formatted[name] = formatPropertyForNotion(config);
  }

  return formatted;
}

// Helper function to format individual property configurations for Notion API
function formatPropertyForNotion(propertyConfig) {
  // Handle both old format (with type field) and new format (direct Notion API format)
  if (propertyConfig.type) {
    // Old format with type field
    const { type, ...config } = propertyConfig;

    switch (type) {
      case "title":
        return { title: {} };

      case "rich_text":
        return { rich_text: {} };

      case "number":
        return {
          number: {
            format: config.number?.format || "number",
          },
        };

      case "select":
        return {
          select: {
            options: config.select?.options || [],
          },
        };

      case "multi_select":
        return {
          multi_select: {
            options: config.multi_select?.options || [],
          },
        };

      case "date":
        return { date: {} };

      case "people":
        return { people: {} };

      case "files":
        return { files: {} };

      case "checkbox":
        return { checkbox: {} };

      case "url":
        return { url: {} };

      case "email":
        return { email: {} };

      case "phone_number":
        return { phone_number: {} };

      case "formula":
        return {
          formula: {
            expression: config.formula?.expression || "1",
          },
        };

      case "relation":
        return {
          relation: {
            data_source_id:
              config.relation?.database_id ||
              config.relation?.data_source_id ||
              "",
            type: config.relation?.type || "single_property",
          },
        };

      case "rollup":
        return {
          rollup: {
            relation_property_name: config.rollup?.relation_property_name || "",
            rollup_property_name: config.rollup?.rollup_property_name || "",
            function: config.rollup?.function || "count",
          },
        };

      case "created_time":
        return { created_time: {} };

      case "created_by":
        return { created_by: {} };

      case "last_edited_time":
        return { last_edited_time: {} };

      case "last_edited_by":
        return { last_edited_by: {} };

      default:
        // Default to rich_text for unknown types
        return { rich_text: {} };
    }
  } else {
    // New format - direct Notion API format (current DATABASE_TEMPLATES format)
    // The propertyConfig is already in the correct Notion API format
    return propertyConfig;
  }
}
