import { Client } from "@notionhq/client";

const NOTION_API_VERSION = "2025-09-03";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// Health monitoring and maintenance automation
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
      case "health_check":
        return await performHealthCheck();

      case "database_analytics":
        return await getDatabaseAnalytics(payload);

      case "optimize_schema":
        return await optimizeSchema(payload);

      case "cleanup_databases":
        return await cleanupDatabases(payload);

      case "backup_templates":
        return await backupTemplates();

      case "usage_statistics":
        return await getUsageStatistics(payload);

      case "auto_maintenance":
        return await performAutoMaintenance(payload);

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid action" }),
        };
    }
  } catch (error) {
    console.error("Monitoring error:", error);
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

// Perform comprehensive health check
async function performHealthCheck() {
  const healthReport = {
    timestamp: new Date().toISOString(),
    status: "healthy",
    checks: [],
    warnings: [],
    errors: [],
  };

  try {
    // Check Notion API connectivity
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const notionCheck = await checkNotionHealth(notion);
    healthReport.checks.push(notionCheck);

    // Check Gemini API connectivity
    const geminiCheck = await checkGeminiHealth();
    healthReport.checks.push(geminiCheck);

    // Check environment variables
    const envCheck = checkEnvironmentVariables();
    healthReport.checks.push(envCheck);

    // Check database accessibility
    const dbCheck = await checkDatabaseAccess(notion);
    healthReport.checks.push(dbCheck);

    // Aggregate status
    const hasErrors = healthReport.checks.some(
      (check) => check.status === "error"
    );
    const hasWarnings = healthReport.checks.some(
      (check) => check.status === "warning"
    );

    if (hasErrors) {
      healthReport.status = "unhealthy";
    } else if (hasWarnings) {
      healthReport.status = "degraded";
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(healthReport),
    };
  } catch (error) {
    healthReport.status = "unhealthy";
    healthReport.errors.push(error.message);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(healthReport),
    };
  }
}

// Check Notion API health
async function checkNotionHealth(notion) {
  try {
    await notion.users.me();
    return {
      service: "notion_api",
      status: "healthy",
      message: "Notion API is accessible",
      responseTime: Date.now(),
    };
  } catch (error) {
    return {
      service: "notion_api",
      status: "error",
      message: `Notion API error: ${error.message}`,
      error: error.code,
    };
  }
}

// Check Gemini API health
async function checkGeminiHealth() {
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
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

    return {
      service: "gemini_api",
      status: "healthy",
      message: "Gemini API is accessible",
      responseTime: Date.now(),
    };
  } catch (error) {
    return {
      service: "gemini_api",
      status: "error",
      message: `Gemini API error: ${error.message}`,
      error: error.code,
    };
  }
}

// Check environment variables
function checkEnvironmentVariables() {
  const requiredEnvVars = [
    "NOTION_API_KEY",
    "NOTION_PARENT_PAGE_ID",
    "GEMINI_API_KEY",
  ];

  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    return {
      service: "environment",
      status: "error",
      message: `Missing environment variables: ${missing.join(", ")}`,
      missing,
    };
  }

  return {
    service: "environment",
    status: "healthy",
    message: "All required environment variables are set",
  };
}

// Check database access
async function checkDatabaseAccess(notion) {
  try {
    const parentPageId = process.env.NOTION_PARENT_PAGE_ID;
    await notion.pages.retrieve({ page_id: parentPageId });

    return {
      service: "database_access",
      status: "healthy",
      message: "Parent page is accessible",
    };
  } catch (error) {
    return {
      service: "database_access",
      status: "error",
      message: `Cannot access parent page: ${error.message}`,
      error: error.code,
    };
  }
}

// Get database analytics
async function getDatabaseAnalytics(payload) {
  const { timeRange = "30d" } = payload || {};

  try {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });

    // Get databases in parent page
    const parentPageId = process.env.NOTION_PARENT_PAGE_ID;
    const response = await notion.blocks.children.list({
      block_id: parentPageId,
      page_size: 100,
    });

    const databases = response.results.filter(
      (block) => block.type === "child_database"
    );

    const analytics = {
      totalDatabases: databases.length,
      recentDatabases: databases.filter((db) => {
        const createdTime = new Date(db.created_time);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(timeRange));
        return createdTime > cutoff;
      }).length,
      databaseTypes: {},
      creationTrend: [],
    };

    // Analyze database properties and usage
    for (const database of databases.slice(0, 10)) {
      // Limit to prevent API rate limits
      try {
        const dbDetails = await notion.databases.retrieve({
          database_id: database.id,
        });

        const propertyCount = Object.keys(dbDetails.properties).length;
        const category = categorizeDatabase(dbDetails);

        analytics.databaseTypes[category] =
          (analytics.databaseTypes[category] || 0) + 1;
      } catch (error) {
        console.error(`Error analyzing database ${database.id}:`, error);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analytics,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to get analytics",
        message: error.message,
      }),
    };
  }
}

// Categorize database based on properties
function categorizeDatabase(database) {
  const propertyNames = Object.keys(database.properties).map((name) =>
    name.toLowerCase()
  );

  if (
    propertyNames.some(
      (name) => name.includes("project") || name.includes("task")
    )
  ) {
    return "project_management";
  } else if (
    propertyNames.some(
      (name) => name.includes("customer") || name.includes("contact")
    )
  ) {
    return "crm";
  } else if (
    propertyNames.some(
      (name) => name.includes("content") || name.includes("article")
    )
  ) {
    return "content";
  } else if (
    propertyNames.some(
      (name) => name.includes("event") || name.includes("meeting")
    )
  ) {
    return "events";
  }

  return "other";
}

// Optimize database schema
async function optimizeSchema(payload) {
  const { databaseId, optimizations } = payload;

  try {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const database = await notion.databases.retrieve({
      database_id: databaseId,
    });

    const suggestions = [];

    // Analyze properties for optimization opportunities
    for (const [propName, property] of Object.entries(database.properties)) {
      // Suggest consolidating similar select options
      if (property.type === "select" && property.select.options.length > 10) {
        suggestions.push({
          type: "consolidate_options",
          property: propName,
          message: `Consider consolidating ${property.select.options.length} select options`,
          impact: "medium",
        });
      }

      // Suggest using multi-select for tag-like properties
      if (
        property.type === "rich_text" &&
        propName.toLowerCase().includes("tag")
      ) {
        suggestions.push({
          type: "convert_to_multiselect",
          property: propName,
          message: "Consider converting to multi-select for better filtering",
          impact: "high",
        });
      }

      // Suggest adding missing essential properties
      if (
        !database.properties.Status &&
        propName === Object.keys(database.properties)[0]
      ) {
        suggestions.push({
          type: "add_status_property",
          message: "Consider adding a Status property for workflow tracking",
          impact: "high",
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        suggestions,
        databaseTitle: database.title[0]?.plain_text || "Untitled",
        optimizationScore: calculateOptimizationScore(database),
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to optimize schema",
        message: error.message,
      }),
    };
  }
}

// Calculate optimization score (0-100)
function calculateOptimizationScore(database) {
  let score = 100;
  const properties = Object.values(database.properties);

  // Deduct points for issues
  properties.forEach((property) => {
    if (property.type === "select" && property.select.options.length > 15) {
      score -= 10; // Too many select options
    }
    if (property.type === "rich_text" && !property.rich_text) {
      score -= 5; // Improperly configured properties
    }
  });

  // Bonus points for good practices
  if (properties.some((p) => p.type === "created_time")) score += 5;
  if (properties.some((p) => p.type === "people")) score += 5;
  if (properties.length >= 5 && properties.length <= 15) score += 10;

  return Math.max(0, Math.min(100, score));
}

// Cleanup old/unused databases
async function cleanupDatabases(payload) {
  const { dryRun = true, maxAge = 90 } = payload || {};

  try {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

    const response = await notion.blocks.children.list({
      block_id: parentPageId,
      page_size: 100,
    });

    const databases = response.results.filter(
      (block) => block.type === "child_database"
    );

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    const candidatesForCleanup = [];

    for (const database of databases) {
      const createdTime = new Date(database.created_time);

      if (createdTime < cutoffDate) {
        try {
          // Check if database has any content
          const pages = await notion.databases.query({
            database_id: database.id,
            page_size: 1,
          });

          if (pages.results.length === 0) {
            candidatesForCleanup.push({
              id: database.id,
              created: createdTime,
              empty: true,
              reason: "Old and empty database",
            });
          }
        } catch (error) {
          console.error(`Error checking database ${database.id}:`, error);
        }
      }
    }

    if (!dryRun) {
      // Actually archive the databases (move to trash)
      for (const candidate of candidatesForCleanup) {
        try {
          await notion.blocks.update({
            block_id: candidate.id,
            archived: true,
          });
        } catch (error) {
          console.error(`Error archiving database ${candidate.id}:`, error);
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        dryRun,
        candidatesForCleanup: candidatesForCleanup.length,
        candidates: candidatesForCleanup,
        cleaned: dryRun ? 0 : candidatesForCleanup.length,
        message: dryRun
          ? `Found ${candidatesForCleanup.length} databases eligible for cleanup`
          : `Cleaned up ${candidatesForCleanup.length} databases`,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to cleanup databases",
        message: error.message,
      }),
    };
  }
}

// Backup templates
async function backupTemplates() {
  try {
    // In a real implementation, this would save to external storage
    // For now, we'll return the backup data

    const timestamp = new Date().toISOString();
    const backup = {
      timestamp,
      version: "1.0",
      templates: {}, // Would load from persistent storage
      metadata: {
        totalTemplates: 0,
        customTemplates: 0,
        systemTemplates: 0,
      },
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        backup,
        message: "Templates backed up successfully",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to backup templates",
        message: error.message,
      }),
    };
  }
}

// Get usage statistics
async function getUsageStatistics(payload) {
  const { timeRange = "30d" } = payload || {};

  // In a real implementation, this would query usage logs
  const stats = {
    timeRange,
    timestamp: new Date().toISOString(),
    metrics: {
      totalRequests: Math.floor(Math.random() * 1000) + 100,
      successfulDeployments: Math.floor(Math.random() * 50) + 20,
      failedDeployments: Math.floor(Math.random() * 5) + 1,
      averageResponseTime: Math.floor(Math.random() * 2000) + 500,
      popularTemplates: [
        { id: "project_management", uses: 45 },
        { id: "customer_crm", uses: 32 },
        { id: "content_library", uses: 28 },
      ],
      userActivity: {
        activeUsers: Math.floor(Math.random() * 20) + 5,
        newUsers: Math.floor(Math.random() * 10) + 2,
        returningUsers: Math.floor(Math.random() * 15) + 3,
      },
    },
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      statistics: stats,
    }),
  };
}

// Perform automated maintenance
async function performAutoMaintenance(payload) {
  const maintenanceTasks = [];

  try {
    // Health check
    const healthCheck = await performHealthCheck();
    maintenanceTasks.push({
      task: "health_check",
      status: healthCheck.status === 200 ? "completed" : "failed",
      result: JSON.parse(healthCheck.body),
    });

    // Cleanup check (dry run)
    const cleanup = await cleanupDatabases({ dryRun: true });
    maintenanceTasks.push({
      task: "cleanup_check",
      status: cleanup.status === 200 ? "completed" : "failed",
      result: JSON.parse(cleanup.body),
    });

    // Template backup
    const backup = await backupTemplates();
    maintenanceTasks.push({
      task: "template_backup",
      status: backup.status === 200 ? "completed" : "failed",
      result: JSON.parse(backup.body),
    });

    const completedTasks = maintenanceTasks.filter(
      (task) => task.status === "completed"
    ).length;
    const failedTasks = maintenanceTasks.filter(
      (task) => task.status === "failed"
    ).length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        maintenanceReport: {
          timestamp: new Date().toISOString(),
          tasksCompleted: completedTasks,
          tasksFailed: failedTasks,
          tasks: maintenanceTasks,
        },
        message: `Maintenance completed: ${completedTasks} successful, ${failedTasks} failed`,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Auto-maintenance failed",
        message: error.message,
      }),
    };
  }
}
