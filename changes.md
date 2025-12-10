
Error:
/Users/ahmed/Desktop/Octopus/OctopusReact/backend/node_modules/router/lib/route.js:228
        throw new TypeError('argument handler must be a function')
              ^

TypeError: argument handler must be a function
    at Route.<computed> [as get] (/Users/ahmed/Desktop/Octopus/OctopusReact/backend/node_modules/router/lib/route.js:228:15)
    at Router.<computed> [as get] (/Users/ahmed/Desktop/Octopus/OctopusReact/backend/node_modules/router/index.js:448:19)
    at file:///Users/ahmed/Desktop/Octopus/OctopusReact/backend/services/workflow/routes/workflow.routes.js:170:8
    at ModuleJob.run (node:internal/modules/esm/module_job:325:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:606:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5)

Node.js v20.19.5
Failed running 'index.js'

Changes needed:
I've provided you with a complete implementation that:
✅ Product Controller Changes

Checks for active workflow triggers before making any changes
Creates pending changes when approval is required
Returns HTTP 202 (Accepted) with pending change info
Applies changes directly if no workflow matches
Works for create, update, and delete operations

✅ Trigger Node Configuration

Enhanced UI with product-specific trigger types
Optional condition fields (field, operator, value)
Automatic entity type detection
Helpful examples and hints
Schedule configuration for scheduled triggers

✅ Backend Workflow Save

Extracts trigger config from trigger nodes
Saves to workflow_triggers table with proper mapping
Handles conditions storage as JSON
Activates triggers on publish
Loads trigger data back when editing

🔑 Key Points

When a workflow trigger matches: Product is NOT changed, instead a pending_change record is created
When no workflow matches: Product is updated directly in Odoo
Trigger conditions are optional: If no conditions, triggers for ALL changes of that type
Changes are applied automatically after workflow approval completes

The implementation follows the exact logic from your documentation and integrates seamlessly with your existing Odoo-based product management system!


products.controller.js

import { odooSearchRead } from './odooClient.js';
import { odooWrite } from './odooClient.js';
import { odooCreate } from './odooClient.js';
import { odooUnlink } from './odooClient.js';
import { odooFieldsGet } from './odooClient.js';
import workflowTriggerService from '../services/workflow/services/workflowTrigger.service.js';

export async function getProductTemplates(req, res) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'Session ID is required' });

    const baseUrl = (req.get('x-odoo-base') || '').replace(/\/$/, '');
    const db = req.get('x-odoo-db') || '';
    if (!baseUrl || !db) return res.status(400).json({ message: 'Missing x-odoo-base or x-odoo-db header' });

    try {
      const fieldsMeta = await odooFieldsGet('product.template', sessionId, { baseUrl, db });
    } catch (e) {
      console.error('FieldsGet product.template error:', e?.data || e.message);
    }

    const productTemplates = await odooSearchRead('product.template', sessionId, { baseUrl, db });
    return res.json({ success: true, productTemplates });
  } catch (error) {
    console.error('Get Product Templates Error:', error?.data || error.message);
    return res.status(500).json({
      message: 'Internal server error',
      error: error?.data || error.message,
    });
  }
}

export async function createProduct(req, res) {
  try {
    const { sessionId, values } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'Session ID is required' });
    if (!values || typeof values !== 'object') return res.status(400).json({ message: 'Values payload is required' });

    const baseUrl = (req.get('x-odoo-base') || '').replace(/\/$/, '');
    const db = req.get('x-odoo-db') || '';
    if (!baseUrl || !db) return res.status(400).json({ message: 'Missing x-odoo-base or x-odoo-db header' });

    const userId = req.user?.partner_id || 1;
    const newData = values;

    // Check if there's a workflow trigger for product creation
    const result = await workflowTriggerService.checkAndTriggerWorkflows(
      'product',
      'create',
      {},
      newData,
      userId
    );

    if (result?.requiresApproval) {
      return res.status(202).json({
        success: true,
        requiresApproval: true,
        message: result.message || 'Product creation requires approval',
        data: {
          pendingChangeId: result.pendingChangeId,
          workflowInstanceId: result.workflowInstanceId,
          changeSummary: result.changeSummary
        }
      });
    }

    // No approval required - proceed with creation
    const productId = await odooCreate('product.template', sessionId, values, { baseUrl, db });
    return res.status(201).json({ 
      success: true, 
      productId,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Create Product Error:', error?.data || error.message);
    return res.status(500).json({
      message: 'Internal server error',
      error: error?.data || error.message,
    });
  }
}

export async function updateProductTemplate(req, res) {
  try {
    const { id } = req.params;
    const { sessionId, values } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'Session ID is required' });
    if (!id) return res.status(400).json({ message: 'Template ID is required' });
    if (!values || typeof values !== 'object') return res.status(400).json({ message: 'Values payload is required' });

    const baseUrl = (req.get('x-odoo-base') || '').replace(/\/$/, '');
    const db = req.get('x-odoo-db') || '';
    if (!baseUrl || !db) return res.status(400).json({ message: 'Missing x-odoo-base or x-odoo-db header' });

    // Fetch original record before applying changes
    const originalArr = await odooSearchRead('product.template', sessionId, {
      args: [[['id', '=', Number(id)]]],
      kwargs: { 
        fields: [
          'id', 'name', 'list_price', 'standard_price', 'categ_id', 
          'taxes_id', 'supplier_taxes_id', 'tracking', 'description',
          'default_code', 'barcode', 'type', 'weight', 'volume'
        ] 
      }
    }, { baseUrl, db });
    const original = Array.isArray(originalArr) ? originalArr[0] : null;

    if (!original) {
      return res.status(404).json({ message: 'Product template not found' });
    }

    const userId = req.user?.partner_id || 1;
    const newData = { id: Number(id), ...values };

    // Check if there's a workflow trigger for product updates
    const result = await workflowTriggerService.checkAndTriggerWorkflows(
      'product',
      'update',
      original,
      newData,
      userId
    );

    if (result?.requiresApproval) {
      return res.status(202).json({
        success: true,
        requiresApproval: true,
        message: result.message || 'Product update requires approval',
        data: {
          pendingChangeId: result.pendingChangeId,
          workflowInstanceId: result.workflowInstanceId,
          changeSummary: result.changeSummary,
          originalData: original,
          proposedChanges: values
        }
      });
    }

    // No approval required - proceed with update
    const ok = await odooWrite('product.template', sessionId, [Number(id)], values, { baseUrl, db });
    return res.json({ 
      success: !!ok,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update Product Template Error:', error?.data || error.message);
    return res.status(500).json({
      message: 'Internal server error',
      error: error?.data || error.message,
    });
  }
}

export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'Session ID is required' });
    if (!id) return res.status(400).json({ message: 'Product ID is required' });

    const baseUrl = (req.get('x-odoo-base') || '').replace(/\/$/, '');
    const db = req.get('x-odoo-db') || '';
    if (!baseUrl || !db) return res.status(400).json({ message: 'Missing x-odoo-base or x-odoo-db header' });

    // Fetch product data before deletion
    const originalArr = await odooSearchRead('product.template', sessionId, {
      args: [[['id', '=', Number(id)]]],
      kwargs: { 
        fields: ['id', 'name', 'list_price', 'standard_price', 'categ_id', 'default_code'] 
      }
    }, { baseUrl, db });
    const original = Array.isArray(originalArr) ? originalArr[0] : null;

    if (!original) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const userId = req.user?.partner_id || 1;

    // Check if there's a workflow trigger for product deletion
    const result = await workflowTriggerService.checkAndTriggerWorkflows(
      'product',
      'delete',
      original,
      { id: Number(id), _deleted: true },
      userId
    );

    if (result?.requiresApproval) {
      return res.status(202).json({
        success: true,
        requiresApproval: true,
        message: result.message || 'Product deletion requires approval',
        data: {
          pendingChangeId: result.pendingChangeId,
          workflowInstanceId: result.workflowInstanceId,
          changeSummary: result.changeSummary,
          productData: original
        }
      });
    }

    // No approval required - proceed with deletion
    const ok = await odooUnlink('product.template', sessionId, [Number(id)], { baseUrl, db });
    return res.json({ 
      success: !!ok,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete Product Error:', error?.data || error.message);
    return res.status(500).json({
      message: 'Internal server error',
      error: error?.data || error.message,
    });
  }
}

// Variant-specific operations
export async function updateProductVariant(req, res) {
  try {
    const { id } = req.params;
    const { sessionId, values } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'Session ID is required' });
    if (!id) return res.status(400).json({ message: 'Variant ID is required' });
    if (!values || typeof values !== 'object') return res.status(400).json({ message: 'Values payload is required' });

    const baseUrl = (req.get('x-odoo-base') || '').replace(/\/$/, '');
    const db = req.get('x-odoo-db') || '';
    if (!baseUrl || !db) return res.status(400).json({ message: 'Missing x-odoo-base or x-odoo-db header' });

    // Fetch original variant data
    const originalArr = await odooSearchRead('product.product', sessionId, {
      args: [[['id', '=', Number(id)]]],
      kwargs: { 
        fields: [
          'id', 'name', 'default_code', 'barcode', 'tracking', 
          'product_tmpl_id', 'list_price', 'standard_price'
        ] 
      }
    }, { baseUrl, db });
    const original = Array.isArray(originalArr) ? originalArr[0] : null;

    if (!original) {
      return res.status(404).json({ message: 'Product variant not found' });
    }

    const userId = req.user?.partner_id || 1;
    const newData = { id: Number(id), ...values };

    // Check if there's a workflow trigger for product updates
    const result = await workflowTriggerService.checkAndTriggerWorkflows(
      'product',
      'update',
      original,
      newData,
      userId
    );

    if (result?.requiresApproval) {
      return res.status(202).json({
        success: true,
        requiresApproval: true,
        message: result.message || 'Variant update requires approval',
        data: {
          pendingChangeId: result.pendingChangeId,
          workflowInstanceId: result.workflowInstanceId,
          changeSummary: result.changeSummary,
          originalData: original,
          proposedChanges: values
        }
      });
    }

    // No approval required - proceed with update
    const ok = await odooWrite('product.product', sessionId, [Number(id)], values, { baseUrl, db });
    return res.json({ 
      success: !!ok,
      message: 'Variant updated successfully'
    });
  } catch (error) {
    console.error('Update Product Variant Error:', error?.data || error.message);
    return res.status(500).json({
      message: 'Internal server error',
      error: error?.data || error.message,
    });
  }
}


I'll help you implement the logic in product.controller.js to check for workflow triggers before making changes. Based on the documents, I can see the workflow system structure and the trigger checking logic.
Here's the updated product.controller.js:product.controller.js with Workflow IntegrationCode import { odooSearchRead } from './odooClient.js';
import { odooWrite } from './odooClient.js';
import { odooCreate } from './odooClient.js';
import { odooUnlink } from './odooClient.js';
import { odooFieldsGet } from './odooClient.js';
import workfloI've updated the product.controller.js with comprehensive workflow integration. Here are the key changes:
Key Features Implemented:

Create Product - Checks for Product Created workflow triggers
Update Product Template - Checks for Product Updated workflow triggers
Update Product Variant - Also checks for Product Updated workflow triggers
Delete Product - Checks for Product Deleted workflow triggers

How It Works:
Before any product operation:

Fetches the original data (for updates/deletes)
Calls workflowTriggerService.checkAndTriggerWorkflows() with:

Entity type: 'product'
Operation: 'create', 'update', or 'delete'
Original data (empty object for creates)
New/proposed data
User ID



If a workflow is triggered:

Returns HTTP 202 (Accepted)
Includes requiresApproval: true
Provides pending change ID and workflow instance ID
Does NOT apply the changes to Odoo

If no workflow is triggered:

Proceeds with the normal Odoo operation
Returns success response

Response Format for Approval Required:
json{
  "success": true,
  "requiresApproval": true,
  "message": "Product update requires approval",
  "data": {
    "pendingChangeId": "uuid",
    "workflowInstanceId": "uuid",
    "changeSummary": "Changed price from $100 to $150",
    "originalData": {...},
    "proposedChanges": {...}
  }
}
The frontend can detect the requiresApproval flag and show appropriate UI (like the toast message you have in VariantModal) instead of treating it as a completed operation.