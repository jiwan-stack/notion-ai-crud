# Notion CRUD - Dynamic Talent Pool & Job Board

A powerful, dynamic CRUD application that automatically adapts to your Notion database schema. Perfect for managing talent pools, job boards, and any other structured data in Notion.

## 🌟 Key Features

- **🔄 Dynamic Schema Detection**: Forms automatically adapt to your Notion database columns
- **⚡ Full CRUD Operations**: Create, Read, Update, Delete with a beautiful UI
- **🎯 Smart Field Types**: Automatic field type detection (email, phone, URL, multi-select, etc.)
- **📱 Responsive Design**: Works perfectly on desktop and mobile
- **🚀 Real-time Updates**: Changes in Notion database reflect immediately
- **✅ Built-in Validation**: Client-side validation based on field types
- **🔧 Netlify Functions**: Serverless proxy for secure API access
- **📁 File Upload Support**: Upload and manage files with Netlify Blobs
- **🔍 Advanced Search & Filtering**: Search across all fields with boolean filters
- **📊 Multiple View Modes**: Card view and table view for different preferences
- **🎨 Modern UI**: Beautiful gradient designs with PrimeVue components
- **⚡ Performance Optimized**: Caching, lazy loading, and parallel data fetching

## 🚀 Quick Start

1. **Set up your Notion database** with any columns you need
2. **Create a Notion integration** and get your API key
3. **Configure environment variables**
4. **Deploy to Netlify** or run locally

👉 **[Complete Setup Guide](./TALENT_POOL_SETUP.md)**

## 🎯 Perfect For

- **Talent Pools & Recruitment**: Manage candidates with custom fields
- **Job Boards**: Track applications and opportunities
- **Contact Management**: Store and organize contacts
- **Project Management**: Track tasks and resources
- **Any Notion Database**: The app adapts to YOUR schema!

## 🛠 Tech Stack

- **Frontend**: Vue.js 3.5.17, Vite 7.0.0, Pinia 3.0.3
- **UI Components**: PrimeVue 4.3.6, PrimeIcons 7.0.0
- **Styling**: Tailwind CSS 4.1.12, Custom gradient designs
- **Backend**: Netlify Functions (Serverless)
- **File Storage**: Netlify Blobs 9.1.6
- **Database**: Notion API
- **Hosting**: Netlify
- **Development**: ESLint, Prettier, Vue DevTools

## 📋 Example Use Cases

### Talent Pool Management

- **Personal Info**: Name, Email, Phone, Location
- **Professional**: Skills (multi-select), Experience Level, Portfolio Link
- **Status**: Available for hire (checkbox), Salary expectations, Verified status
- **Files**: Resume, Portfolio samples, Certificates

### Job Board

- **Job Details**: Position Title, Company, Location, Salary Range
- **Requirements**: Job Type (select), Experience Required, Skills Needed
- **Timeline**: Application Deadline, Status, Notes
- **Files**: Job descriptions, Company logos, Application materials

### Contact Database

- **Contact Info**: Name, Email, Phone, Company, Position
- **Organization**: Tags (multi-select), Last Contact Date, Notes
- **Follow-up**: Follow-up Required (checkbox), Priority Level
- **Files**: Business cards, Contracts, Meeting notes

### Project Management

- **Project Details**: Project Name, Description, Status, Priority
- **Team**: Assignee, Stakeholders (multi-select), Due Date
- **Resources**: Budget, Time tracking, Dependencies
- **Files**: Project briefs, Mockups, Documentation

**The beauty is: just change your Notion database columns and the app automatically updates!**

## 🚀 Advanced Features

### Smart Field Detection

- **Automatic Icon Mapping**: Icons assigned based on field names
- **Type-specific Validation**: Email, phone, URL validation
- **Currency Formatting**: Automatic number formatting with symbols
- **Rich Text Support**: Bold, italic, underline formatting

### Search & Filtering

- **Global Search**: Search across all text fields
- **Boolean Filters**: Filter by verified status, availability
- **Dynamic Labels**: Filter labels adapt to your field names
- **Real-time Results**: Instant search as you type

### File Management

- **Drag & Drop Upload**: Easy file upload interface
- **Multiple File Types**: Support for documents, images, videos
- **Secure Storage**: Files stored securely with Netlify Blobs
- **Public URLs**: Direct links to uploaded files

### Performance Features

- **Smart Caching**: 5-minute cache for faster loading
- **Parallel Loading**: Schema and data loaded simultaneously
- **Lazy Loading**: Components loaded on demand
- **Responsive Design**: Optimized for all screen sizes
