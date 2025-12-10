# Quick Start Guide - Admin Page

## Step 1: Populate the Database

Run these SQL files to add pages and sections to your database:

```bash
# Connect to your MariaDB database
mysql -u your_username -p your_database_name

# Then run these commands inside MySQL:
source /Users/ahmed/Desktop/Octopus/OctopusReact/WORKFLOWV2/addToPageTable.sql
source /Users/ahmed/Desktop/Octopus/OctopusReact/WORKFLOWV2/addToPageSections.sql
```

Or directly from the command line:
```bash
mysql -u your_username -p your_database_name < /Users/ahmed/Desktop/Octopus/OctopusReact/WORKFLOWV2/addToPageTable.sql
mysql -u your_username -p your_database_name < /Users/ahmed/Desktop/Octopus/OctopusReact/WORKFLOWV2/addToPageSections.sql
```

## Step 2: Start the Backend

```bash
cd /Users/ahmed/Desktop/Octopus/OctopusReact/backend
npm start
```

Your backend should now be running at `http://192.168.1.13:3007` (or your configured URL).

## Step 3: Start the Frontend

```bash
cd /Users/ahmed/Desktop/Octopus/OctopusReact/WORKFLOWV2
npm run dev
```

Your frontend should now be accessible at `http://localhost:5173` (or your configured port).

## Step 4: Access the Admin Page

1. Open your browser and navigate to: `http://localhost:5173/admin`
2. You should see a beautiful admin page with a list of 11 pages

## Step 5: Test the Functionality

### A. Test Page Permissions
1. Click the **"Settings"** button on any page card
2. A modal will open showing all available roles
3. Check/uncheck roles to grant/revoke page access
4. Click **"Save"** to persist changes

### B. Test Section Editor
1. Click the **"Edit Fields"** button on any page card
2. A modal will open showing a hierarchical tree of sections
3. Click the **▶** arrow to expand/collapse parent sections
4. Click on any section to open the editor

### C. Test Style Customization
1. In the section editor, you'll see:
   - **Theme selector**: Switch between Light and Dark
   - **Background Color**: Click the color picker or type a hex value
   - **Text Color**: Click the color picker or type a hex value
   - **Border Color**: Click the color picker or type a hex value
   - **Border Width**: Enter a number (0-10)
   - **Border Radius**: Enter a number (0-50)
2. Make changes and click **"Save"**

### D. Test Permission Management
1. In the section editor, scroll down to the **"Permissions"** section
2. Check/uncheck roles to grant/revoke access to this section
3. Click **"Save"** to persist changes

## Step 6: Verify Changes on Actual Pages

1. Navigate to one of the actual pages (e.g., `/attributes`)
2. If you've restricted permissions, sections should hide/show based on user role
3. If you've customized styles, they should be applied to the sections

## Troubleshooting

### Backend Not Starting?
- Check if port 3007 is already in use
- Check your `.env` file for correct database credentials
- Check backend logs for errors

### Frontend Not Starting?
- Run `npm install` if you haven't already
- Check if port 5173 is already in use
- Check browser console for errors

### API Calls Failing?
- Verify `VITE_API_BASE_URL` in `WORKFLOWV2/.env` is set to `http://192.168.1.13:3007/api`
- Check browser network tab for failed requests
- Check backend logs for errors

### Sections Not Showing?
- Verify the SQL files ran successfully
- Check database tables: `pages`, `page_sections`
- Run `SELECT * FROM page_sections WHERE page_id = 'attributes';` to verify data

### Styles Not Applying?
- Styles are only applied if you've saved them from the admin page
- Check database table: `section_styles`
- Ensure you're viewing the page with the correct theme

## Database Tables Overview

After running the SQL files, you should have:

- **11 pages** in the `pages` table
- **469 sections** in the `page_sections` table

Pages:
1. `attributes` - Product Attributes
2. `batch` - Batch Transfers
3. `categories` - Product Categories
4. `dashboard` - Dashboard
5. `deliveries` - Transfer Deliveries
6. `delivery-methods` - Delivery Methods
7. `dropship` - Transfer Dropships
8. `internal` - Internal Transfers
9. `inventory` - Warehouse Inventory
10. `landing-costs` - Landed Costs
11. `locations` - Warehouse Locations

## Next Steps

1. ✅ Set up permissions for your roles
2. ✅ Customize section styles to match your brand
3. ✅ Test with different user roles
4. ✅ Integrate wrappers (`SecuredSection`, `StyledSection`) in remaining pages
5. ✅ Set up audit logging monitoring
6. ✅ Add more pages/sections as needed

## Need Help?

Refer to:
- `ADMIN_PAGE_IMPLEMENTATION_SUMMARY.md` - Complete implementation details
- `security.md` - Original security and personalization plan
- Backend logs - For API errors
- Browser console - For frontend errors

---

**Enjoy your new Admin Page!** 🎉

