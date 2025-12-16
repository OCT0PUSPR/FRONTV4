import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { useAuth } from '../context/auth.tsx'
import { SidebarProvider, useSidebar } from '../context/sidebar.tsx'
import { DataProvider } from '../context/data.tsx'
import { ThemeProvider } from '../context/theme'
import { SecurityProvider } from '../context/security.tsx'
import { PersonalizationProvider } from '../context/personalization.tsx'
import { CaslProvider } from '../context/casl.tsx'
import { Route, Routes, useNavigate, Navigate, useLocation } from "react-router"
import Lottie from 'lottie-react'
import loadingAnimation from './assets/Loading.json'
import Signin from './signin.tsx'
import { EnhancedSidebar } from '../@/components/EnhancedSidebar.tsx'
import { ChatBot } from './components/ChatBot.tsx'
import Products from './products.tsx'
import PhysicalInventory from './physical-inventory.tsx'
import LandingPage from './overview.tsx'
import Stocks from './stocks.tsx'
import MovesHistoryPage from './movesHistory.tsx'
import ValuationPage from './valuation.tsx'
import LocationsPage from './locations.tsx'
import WarehousesPage from './warehouse.tsx'
import OperationTypesPage from './operations.tsx'
import RoutesPage from './routes.tsx'
import RulesPage from './rules.tsx'
import SettingsPage from './settings.tsx'
import SetupPage from './setup.tsx'
import ProtectedSetupRoute from './components/ProtectedSetupRoute.tsx'
import TenantCheck from './components/TenantCheck.tsx'
import StorageCategoriesPage from './storage.tsx'
import PutawaysRulesPage from './putaway.tsx'
import ProductCategoriesPage from './categories.tsx'
import AttributesPage from './attributes.tsx'
import UnitsOfMeasurePage from './uom.tsx'
import DeliveryMethodsPage from './deliveryMethods.tsx'
import PackageTypesPage from './package-types.tsx'
import ProductPackagingsPage from './product-packaging.tsx'
import MovesAnalysisPage from './moves-analysis.tsx'
import ProductVariantsPage from './product-variants.tsx'
import LotsSerialNumbersPage from './serial-numbers.tsx'
import PackagesPage from './product-packages.tsx'
import TransferReceiptsPage from './receipts.tsx'
import TransferDeliveriesPage from './deliveries.tsx'
import InternalTransfersPage from './internal.tsx'
import ManufacturingPage from './manufacturing.tsx'
import DropshipsPage from './dropship.tsx'
import LicensePage from './License2.tsx'
import BatchTransfersPage from './batch.tsx'
import WaveTransfersPage from './wave.tsx'
import ScrapOrdersPage from './scrap.tsx'
import WarehouseManager from './warehouse-view.tsx'
import LandedCostsPage from './landed-costs.tsx'
import { useTranslation } from 'react-i18next'
import ReportingLocationConst from './reporting-location.tsx'
import FieldsTesterPage from './fields-tester.tsx'
import { Dashboard } from './dashboard.tsx'
import { ReactFlowProvider } from 'reactflow'
import Workflows from './workflows.tsx'
import ApprovalPage from './pages/ApprovalPage.tsx'
import SurveyCreator from './form'
import WorkflowV2 from './workflowV2.tsx'
import UserManagementPage from './user-management.tsx'
import PolicyEditorPage from './policy-editor.tsx'
import UsersPage from './users.tsx'
import RolesPage from './roles.tsx'
import PoliciesPage from './policies.tsx'
import { Toaster } from "sonner"
import HeaderNavbar from './components/HeaderNavbar.tsx'
import { WarehouseManagement } from './WarehouseManagement.tsx'
import { WAREHOUSES, INBOUND_SHIPMENTS } from './components/warehouse/constants';
import { TimeRange } from './components/warehouse/types';
import { API_CONFIG } from './config/api';
import OrgChart from './orgChart.tsx'
import FleetManagementPage from './FleetManagement.tsx'
import AllVehicles from './AllVehicles.tsx'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { ROUTE_TO_PAGE_ID, getPageIdFromRoute } from './config/pageRoutes'
import Error500Page from './error500.tsx'
import { DynamicRecordPage } from './pages/DynamicRecordPage'
import { FieldManagement } from './pages/FieldManagement'
import FieldLayoutEditor from './pages/FieldLayoutEditor'
import { WarehouseConfigurationPage } from './pages/WarehouseConfigurationPage'
import ReportTemplatesPage from './pages/ReportTemplatesPage'
import ReportTemplateEditorPage from './pages/ReportTemplateEditorPage'
import GeneratedReportsPage from './pages/GeneratedReportsPage'
import ReportRulesPage from './pages/ReportRulesPage'
import IntegrationsPage from './pages/IntegrationsPage'
import EmailTemplatesPage from './pages/EmailTemplatesPage'
import EmailTemplateEditorPage from './pages/EmailTemplateEditorPage'
import SendEmailPage from './pages/SendEmailPage'

function AppContent() {
  const { isAuthenticated, isLoading, signOut } = useAuth()
  const { isCollapsed } = useSidebar()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(WAREHOUSES[0].id);
  const [timeRange, setTimeRange] = useState<TimeRange>('Week');
  const [isCheckingLicense, setIsCheckingLicense] = useState(true);
  const [isLicenseValid, setIsLicenseValid] = useState<boolean | null>(null);
  

  const currentWarehouse = useMemo(() =>
    WAREHOUSES.find(w => w.id === selectedWarehouseId) || WAREHOUSES[0]
    , [selectedWarehouseId]);

  // Route to title key mapping (static object) - memoized to prevent recreating on every render
  const routeTitleKeys = useMemo<Record<string, string>>(() => ({
    '/signin': 'Sign In',
    '/setup': 'Setup',
    '/inventory': 'Inventory',
    '/products': 'Products',
    '/overview': 'Overview',
    '/stocks': 'Stocks',
    '/receipts': 'Receipts',
    '/deliveries': 'Deliveries',
    '/internal': 'Internal Transfers',
    '/dropships': 'Dropships',
    '/batch': 'Batch Transfers',
    '/wave': 'Wave Transfers',
    '/moves-history': 'Moves History',
    '/valuation': 'Valuation',
    '/locations': 'Locations',
    '/physical-inventory': 'Physical Inventory',
    '/warehouse': 'Warehouses',
    '/operations': 'Operations',
    '/rules': 'Rules',
    '/routes': 'Routes',
    '/storage': 'Storage Categories',
    '/putaway': 'Putaway Rules',
    '/categories': 'Categories',
    '/attributes': 'Attributes',
    '/uom-categories': 'Units of Measure',
    '/delivery-methods': 'Delivery Methods',
    '/package-types': 'Package Types',
    '/product-packagings': 'Product Packagings',
    '/moves-analysis': 'Moves Analysis',
    '/product-variants': 'Product Variants',
    '/lots-serial': 'Lots & Serial Numbers',
    '/product-packages': 'Product Packages',
    '/settings': 'Settings',
    '/manufacturing': 'Manufacturing',
    '/scrap': 'Scrap Orders',
    '/warehouse-view': 'Warehouse View',
    '/landed-costs': 'Landed Costs',
    '/warehouse-locations': 'Warehouse Locations',
    '/reporting-location': 'Reporting Location',
    '/testing': 'Testing',
    '/dashboard': 'Dashboard',
    '/workflows': 'Workflows',
    '/workflow-builder': 'Workflow Builder',
    '/workflow-v2': 'Workflow V2',
    '/approval': 'Approval',
    '/form': 'Form Creator',
    '/warehouse-management': 'Warehouse Management',
    '/user-management': 'User Management',
    '/license': 'License',
    '/fleet-management': 'Fleet Management',
    '/all-vehicles': 'All Vehicles',
    '/field-management': 'Field Management',
    '/field-layout-editor': 'Field Layout Editor',
    '/warehouse-configuration': 'Warehouse Configuration',
    '/report-templates': 'Report Templates',
    '/report-template-editor': 'Report Template Editor',
    '/generated-reports': 'Generated Reports',
    '/report-rules': 'Auto Rules',
    '/integrations': 'Integrations',
    '/email-templates': 'Email Templates',
    '/email-template-editor': 'Template Editor',
  }), []);


  // Update document title when route changes
  useEffect(() => {
    const pathname = location.pathname;

    // Handle dynamic routes (e.g., /builder/:id, /workflow-v2/:id, /approval/:taskId)
    let title = 'Octopus';

    if (pathname.startsWith('/builder/')) {
      title = t('Workflow Builder') + ' - Octopus';
    } else if (pathname.startsWith('/workflow-v2/')) {
      title = t('Workflow V2') + ' - Octopus';
    } else if (pathname.startsWith('/approval/')) {
      title = t('Approval') + ' - Octopus';
    } else if (routeTitleKeys[pathname]) {
      title = t(routeTitleKeys[pathname]) + ' - Octopus';
    } else if (pathname === '/') {
      title = t('Overview') + ' - Octopus';
    }

    document.title = title;
  }, [location.pathname, t, routeTitleKeys]);


  // Check license status globally
  useEffect(() => {
    const checkLicenseStatus = async () => {
      // Don't check license on public routes
      const publicRoutes = ['/license', '/signin', '/setup', '/error500', '/testing', '/approval']
      const isPublicRoute = publicRoutes.some(route => location.pathname === route || location.pathname.startsWith('/approval/'))
      
      if (isPublicRoute) {
        setIsCheckingLicense(false)
        return
      }

      try {
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/license/check`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!res.ok && (res.status === 0 || res.status >= 500)) {
          // Backend connection failed, allow access (will show error page if needed)
          setIsLicenseValid(true)
          setIsCheckingLicense(false)
          return
        }

        const data = await res.json()

        if (res.ok && data?.success) {
          if (data?.valid) {
            setIsLicenseValid(true)
          } else {
            // License not verified, redirect to license page
            setIsLicenseValid(false)
            navigate('/license', { replace: true })
          }
        } else {
          // If check fails, assume license needs activation
          setIsLicenseValid(false)
          navigate('/license', { replace: true })
        }
      } catch (err) {
        // Network error - allow access (will show error if needed)
        console.error('License check error:', err)
        setIsLicenseValid(true)
      } finally {
        setIsCheckingLicense(false)
      }
    }

    checkLicenseStatus()
  }, [location.pathname, navigate])

  // Define public routes
  const publicRoutes = ['/license', '/signin', '/setup', '/error500', '/testing', '/approval', '/settings']
  const isPublicRoute = publicRoutes.some(route => location.pathname === route || location.pathname.startsWith('/approval/'))

  // Show loading while checking auth or license (but allow public routes)
  // Don't show loading screen on signin page - let the signin page handle its own loading state
  const isSigninPage = location.pathname === '/signin'
  if ((isLoading || (isCheckingLicense && !isPublicRoute)) && !isSigninPage) {
    // We need to access theme here, but ThemeProvider wraps AppContent
    // So we'll use a simple approach - check localStorage for theme
    const savedTheme = localStorage.getItem('theme_mode') || 'light'
    const isDark = savedTheme === 'dark'
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: isDark ? '#09090b' : '#ffffff'
      }}>
        <div style={{
          width: '300px',
          height: '300px',
          maxWidth: '90vw',
          maxHeight: '90vh'
        }}>
          <Lottie
            animationData={loadingAnimation}
            loop={true}
            style={{
              width: '100%',
              height: '100%'
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes - accessible without authentication or license */}
      <Route path="/signin" element={<Signin />} />
      <Route 
        path="/setup" 
        element={
          <ProtectedSetupRoute>
            <SetupPage />
          </ProtectedSetupRoute>
        } 
      />
      <Route path="/error500" element={<Error500Page />} />
      <Route path="/testing" element={<FieldsTesterPage />} />
      <Route path="/approval/:taskId" element={<ApprovalPage />} />

      {/* License page - only accessible when backend is connected */}
      <Route path="/license" element={<LicensePage />} />

      {/* Settings page - accessible without authentication but with layout */}
      <Route
        path="/settings"
        element={
          <div className="flex h-screen overflow-hidden">
            <EnhancedSidebar />
            <main className={`flex-1 overflow-hidden transition-all duration-300 ${isCollapsed ? (isRTL ? 'mr-20' : 'ml-20') : (isRTL ? 'mr-64' : 'ml-64')}`}>
              <div className="flex flex-col h-full">
                <HeaderNavbar />
                <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                  <SettingsPage />
                </div>
              </div>
            </main>
            {location.pathname !== '/landing' && <ChatBot />}
          </div>
        }
      />

      {/* Protected routes with global layout */}
      <Route
        path="/*"
        element={
          isAuthenticated ? (
            <div className="flex h-screen overflow-hidden">
              <EnhancedSidebar />
              <main className={`flex-1 overflow-hidden transition-all duration-300 ${isCollapsed ? (isRTL ? 'mr-20' : 'ml-20') : (isRTL ? 'mr-64' : 'ml-64')}`}>
                <div className="flex flex-col h-full">
                  <HeaderNavbar />
                  <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                    <Routes>
                      <Route path="/products" element={<ProtectedRoute pageId={getPageIdFromRoute('/products') || 'products'}><Products /></ProtectedRoute>} />
                      <Route path="/products/edit/:id" element={<ProtectedRoute pageId="products"><DynamicRecordPage modelName="product.template" pageTitle="Product" backRoute="/products" /></ProtectedRoute>} />
                      <Route path="/products/create" element={<ProtectedRoute pageId="products"><DynamicRecordPage modelName="product.template" pageTitle="Product" backRoute="/products" /></ProtectedRoute>} />
                      <Route path="/overview" element={<ProtectedRoute pageId={getPageIdFromRoute('/overview') || 'overview'}><LandingPage /></ProtectedRoute>} />
                      <Route path="/stocks" element={<ProtectedRoute pageId={getPageIdFromRoute('/stocks') || 'stocks'}><Stocks /></ProtectedRoute>} />
                      <Route path="/receipts" element={<ProtectedRoute pageId={getPageIdFromRoute('/receipts') || 'receipts'}><TransferReceiptsPage /></ProtectedRoute>} />
                      <Route path="/receipts/edit/:id" element={<ProtectedRoute pageId="receipts"><DynamicRecordPage modelName="stock.picking" pageTitle="Receipt" backRoute="/receipts" /></ProtectedRoute>} />
                      <Route path="/receipts/view/:id" element={<ProtectedRoute pageId="receipts"><DynamicRecordPage modelName="stock.picking" pageTitle="Receipt" backRoute="/receipts" /></ProtectedRoute>} />
                      <Route path="/receipts/create" element={<ProtectedRoute pageId="receipts"><DynamicRecordPage modelName="stock.picking" pageTitle="Receipt" backRoute="/receipts" /></ProtectedRoute>} />
                      <Route path="/deliveries" element={<ProtectedRoute pageId="deliveries"><TransferDeliveriesPage /></ProtectedRoute>} />
                      <Route path="/deliveries/edit/:id" element={<ProtectedRoute pageId="deliveries"><DynamicRecordPage modelName="stock.picking" pageTitle="Delivery" backRoute="/deliveries" /></ProtectedRoute>} />
                      <Route path="/deliveries/view/:id" element={<ProtectedRoute pageId="deliveries"><DynamicRecordPage modelName="stock.picking" pageTitle="Delivery" backRoute="/deliveries" /></ProtectedRoute>} />
                      <Route path="/deliveries/create" element={<ProtectedRoute pageId="deliveries"><DynamicRecordPage modelName="stock.picking" pageTitle="Delivery" backRoute="/deliveries" /></ProtectedRoute>} />
                      <Route path="/internal" element={<ProtectedRoute pageId="internal"><InternalTransfersPage /></ProtectedRoute>} />
                      <Route path="/internal/edit/:id" element={<ProtectedRoute pageId="internal"><DynamicRecordPage modelName="stock.picking" pageTitle="Internal Transfer" backRoute="/internal" /></ProtectedRoute>} />
                      <Route path="/internal/view/:id" element={<ProtectedRoute pageId="internal"><DynamicRecordPage modelName="stock.picking" pageTitle="Internal Transfer" backRoute="/internal" /></ProtectedRoute>} />
                      <Route path="/internal/create" element={<ProtectedRoute pageId="internal"><DynamicRecordPage modelName="stock.picking" pageTitle="Internal Transfer" backRoute="/internal" /></ProtectedRoute>} />
                      <Route path="/dropships" element={<ProtectedRoute pageId="dropship"><DropshipsPage /></ProtectedRoute>} />
                      <Route path="/dropships/edit/:id" element={<ProtectedRoute pageId="dropship"><DynamicRecordPage modelName="stock.picking" pageTitle="Dropship" backRoute="/dropships" /></ProtectedRoute>} />
                      <Route path="/dropships/view/:id" element={<ProtectedRoute pageId="dropship"><DynamicRecordPage modelName="stock.picking" pageTitle="Dropship" backRoute="/dropships" /></ProtectedRoute>} />
                      <Route path="/dropships/create" element={<ProtectedRoute pageId="dropship"><DynamicRecordPage modelName="stock.picking" pageTitle="Dropship" backRoute="/dropships" /></ProtectedRoute>} />
                      <Route path="/batch" element={<ProtectedRoute pageId="batch"><BatchTransfersPage /></ProtectedRoute>} />
                      <Route path="/batch/edit/:id" element={<ProtectedRoute pageId="batch"><DynamicRecordPage modelName="stock.picking.batch" pageTitle="Batch" backRoute="/batch" /></ProtectedRoute>} />
                      <Route path="/batch/view/:id" element={<ProtectedRoute pageId="batch"><DynamicRecordPage modelName="stock.picking.batch" pageTitle="Batch" backRoute="/batch" /></ProtectedRoute>} />
                      <Route path="/batch/create" element={<ProtectedRoute pageId="batch"><DynamicRecordPage modelName="stock.picking.batch" pageTitle="Batch" backRoute="/batch" /></ProtectedRoute>} />
                      <Route path="/wave" element={<ProtectedRoute pageId={getPageIdFromRoute('/wave') || 'wave'}><WaveTransfersPage /></ProtectedRoute>} />
                      <Route path="/wave/edit/:id" element={<ProtectedRoute pageId="wave"><DynamicRecordPage modelName="stock.picking.batch" pageTitle="Wave" backRoute="/wave" /></ProtectedRoute>} />
                      <Route path="/wave/view/:id" element={<ProtectedRoute pageId="wave"><DynamicRecordPage modelName="stock.picking.batch" pageTitle="Wave" backRoute="/wave" /></ProtectedRoute>} />
                      <Route path="/wave/create" element={<ProtectedRoute pageId="wave"><DynamicRecordPage modelName="stock.picking.batch" pageTitle="Wave" backRoute="/wave" /></ProtectedRoute>} />
                      <Route path='/moves-history' element={<ProtectedRoute pageId={getPageIdFromRoute('/moves-history') || 'moves-history'}><MovesHistoryPage /></ProtectedRoute>} />
                      <Route path='/moves-history/view/:id' element={<ProtectedRoute pageId="moves-history"><DynamicRecordPage modelName="stock.move" pageTitle="Move" backRoute="/moves-history" /></ProtectedRoute>} />
                      <Route path='/valuation' element={<ProtectedRoute pageId={getPageIdFromRoute('/valuation') || 'valuation'}><ValuationPage /></ProtectedRoute>} />
                      <Route path='/valuation/view/:id' element={<ProtectedRoute pageId="valuation"><DynamicRecordPage modelName="stock.quant" pageTitle="Valuation" backRoute="/valuation" /></ProtectedRoute>} />
                      <Route path='/locations' element={<ProtectedRoute pageId="locations"><LocationsPage /></ProtectedRoute>} />
                      <Route path='/locations/view/:id' element={<ProtectedRoute pageId="locations"><DynamicRecordPage modelName="stock.location" pageTitle="Location" backRoute="/locations" /></ProtectedRoute>} />
                      <Route path='/locations/edit/:id' element={<ProtectedRoute pageId="locations"><DynamicRecordPage modelName="stock.location" pageTitle="Location" backRoute="/locations" /></ProtectedRoute>} />
                      <Route path='/locations/create' element={<ProtectedRoute pageId="locations"><DynamicRecordPage modelName="stock.location" pageTitle="Location" backRoute="/locations" /></ProtectedRoute>} />
                      <Route path="/physical-inventory" element={<ProtectedRoute pageId={getPageIdFromRoute('/physical-inventory') || 'physical-inventory'}><PhysicalInventory /></ProtectedRoute>} />
                      <Route path="/physical-inventory/view/:id" element={<ProtectedRoute pageId="physical-inventory"><DynamicRecordPage modelName="stock.inventory" pageTitle="Physical Inventory" backRoute="/physical-inventory" /></ProtectedRoute>} />
                      <Route path="/warehouse" element={<ProtectedRoute pageId={getPageIdFromRoute('/warehouse') || 'warehouse'}><WarehousesPage /></ProtectedRoute>} />
                      <Route path="/operations" element={<ProtectedRoute pageId={getPageIdFromRoute('/operations') || 'operations'}><OperationTypesPage /></ProtectedRoute>} />
                      <Route path="/operations/view/:id" element={<ProtectedRoute pageId="operations"><DynamicRecordPage modelName="stock.picking.type" pageTitle="Operation Type" backRoute="/operations" /></ProtectedRoute>} />
                      <Route path="/rules" element={<ProtectedRoute pageId={getPageIdFromRoute('/rules') || 'rules'}><RulesPage /></ProtectedRoute>} />
                      <Route path="/rules/view/:id" element={<ProtectedRoute pageId="rules"><DynamicRecordPage modelName="stock.rule" pageTitle="Rule" backRoute="/rules" /></ProtectedRoute>} />
                      <Route path="/rules/edit/:id" element={<ProtectedRoute pageId="rules"><DynamicRecordPage modelName="stock.rule" pageTitle="Rule" backRoute="/rules" /></ProtectedRoute>} />
                      <Route path="/rules/create" element={<ProtectedRoute pageId="rules"><DynamicRecordPage modelName="stock.rule" pageTitle="Rule" backRoute="/rules" /></ProtectedRoute>} />
                      <Route path="/routes" element={<ProtectedRoute pageId={getPageIdFromRoute('/routes') || 'routes'}><RoutesPage /></ProtectedRoute>} />
                      <Route path="/routes/view/:id" element={<ProtectedRoute pageId="routes"><DynamicRecordPage modelName="stock.route" pageTitle="Route" backRoute="/routes" /></ProtectedRoute>} />
                      <Route path="/routes/edit/:id" element={<ProtectedRoute pageId="routes"><DynamicRecordPage modelName="stock.route" pageTitle="Route" backRoute="/routes" /></ProtectedRoute>} />
                      <Route path="/routes/create" element={<ProtectedRoute pageId="routes"><DynamicRecordPage modelName="stock.route" pageTitle="Route" backRoute="/routes" /></ProtectedRoute>} />
                      <Route path="/storage" element={<ProtectedRoute pageId={getPageIdFromRoute('/storage') || 'storage'}><StorageCategoriesPage /></ProtectedRoute>} />
                      <Route path="/storage/edit/:id" element={<ProtectedRoute pageId="storage"><DynamicRecordPage modelName="stock.storage.category" pageTitle="Storage Category" backRoute="/storage" /></ProtectedRoute>} />
                      <Route path="/storage/create" element={<ProtectedRoute pageId="storage"><DynamicRecordPage modelName="stock.storage.category" pageTitle="Storage Category" backRoute="/storage" /></ProtectedRoute>} />
                      <Route path="/storage/view/:id" element={<ProtectedRoute pageId="storage"><DynamicRecordPage modelName="stock.storage.category" pageTitle="Storage Category" backRoute="/storage" /></ProtectedRoute>} />
                      <Route path="/putaway" element={<ProtectedRoute pageId={getPageIdFromRoute('/putaway') || 'putaway'}><PutawaysRulesPage /></ProtectedRoute>} />
                      <Route path="/putaway/edit/:id" element={<ProtectedRoute pageId="putaway"><DynamicRecordPage modelName="stock.putaway.rule" pageTitle="Putaway Rule" backRoute="/putaway" /></ProtectedRoute>} />
                      <Route path="/putaway/create" element={<ProtectedRoute pageId="putaway"><DynamicRecordPage modelName="stock.putaway.rule" pageTitle="Putaway Rule" backRoute="/putaway" /></ProtectedRoute>} />
                      <Route path="/putaway/view/:id" element={<ProtectedRoute pageId="putaway"><DynamicRecordPage modelName="stock.putaway.rule" pageTitle="Putaway Rule" backRoute="/putaway" /></ProtectedRoute>} />
                      <Route path="/categories" element={<ProtectedRoute pageId="categories"><ProductCategoriesPage /></ProtectedRoute>} />
                      <Route path="/categories/edit/:id" element={<ProtectedRoute pageId="categories"><DynamicRecordPage modelName="product.category" pageTitle="Category" backRoute="/categories" /></ProtectedRoute>} />
                      <Route path="/categories/create" element={<ProtectedRoute pageId="categories"><DynamicRecordPage modelName="product.category" pageTitle="Category" backRoute="/categories" /></ProtectedRoute>} />
                      <Route path="/attributes" element={<ProtectedRoute pageId="attributes"><AttributesPage /></ProtectedRoute>} />
                      <Route path="/attributes/edit/:id" element={<ProtectedRoute pageId="attributes"><DynamicRecordPage modelName="product.attribute" pageTitle="Attribute" backRoute="/attributes" /></ProtectedRoute>} />
                      <Route path="/attributes/create" element={<ProtectedRoute pageId="attributes"><DynamicRecordPage modelName="product.attribute" pageTitle="Attribute" backRoute="/attributes" /></ProtectedRoute>} />
                      <Route path="/attributes/view/:id" element={<ProtectedRoute pageId="attributes"><DynamicRecordPage modelName="product.attribute" pageTitle="Attribute" backRoute="/attributes" /></ProtectedRoute>} />
                      <Route path="/uom-categories" element={<ProtectedRoute pageId={getPageIdFromRoute('/uom-categories') || 'uom-categories'}><UnitsOfMeasurePage /></ProtectedRoute>} />
                      <Route path="/delivery-methods" element={<ProtectedRoute pageId="delivery-methods"><DeliveryMethodsPage /></ProtectedRoute>} />
                      <Route path="/delivery-methods/view/:id" element={<ProtectedRoute pageId="delivery-methods"><DynamicRecordPage modelName="delivery.carrier" pageTitle="Delivery Method" backRoute="/delivery-methods" /></ProtectedRoute>} />
                      <Route path="/delivery-methods/edit/:id" element={<ProtectedRoute pageId="delivery-methods"><DynamicRecordPage modelName="delivery.carrier" pageTitle="Delivery Method" backRoute="/delivery-methods" /></ProtectedRoute>} />
                      <Route path="/delivery-methods/create" element={<ProtectedRoute pageId="delivery-methods"><DynamicRecordPage modelName="delivery.carrier" pageTitle="Delivery Method" backRoute="/delivery-methods" /></ProtectedRoute>} />
                      <Route path="/package-types" element={<ProtectedRoute pageId={getPageIdFromRoute('/package-types') || 'package-types'}><PackageTypesPage /></ProtectedRoute>} />
                      <Route path="/package-types/view/:id" element={<ProtectedRoute pageId="package-types"><DynamicRecordPage modelName="stock.package.type" pageTitle="Package Type" backRoute="/package-types" /></ProtectedRoute>} />
                      <Route path="/package-types/edit/:id" element={<ProtectedRoute pageId="package-types"><DynamicRecordPage modelName="stock.package.type" pageTitle="Package Type" backRoute="/package-types" /></ProtectedRoute>} />
                      <Route path="/package-types/create" element={<ProtectedRoute pageId="package-types"><DynamicRecordPage modelName="stock.package.type" pageTitle="Package Type" backRoute="/package-types" /></ProtectedRoute>} />
                      <Route path="/product-packagings" element={<ProtectedRoute pageId={getPageIdFromRoute('/product-packagings') || 'product-packagings'}><ProductPackagingsPage /></ProtectedRoute>} />
                      <Route path="/moves-analysis" element={<ProtectedRoute pageId={getPageIdFromRoute('/moves-analysis') || 'moves-analysis'}><MovesAnalysisPage /></ProtectedRoute>} />
                      <Route path="/product-variants" element={<ProtectedRoute pageId={getPageIdFromRoute('/product-variants') || 'product-variants'}><ProductVariantsPage /></ProtectedRoute>} />
                      <Route path="/product-variants/edit/:id" element={<ProtectedRoute pageId="product-variants"><DynamicRecordPage modelName="product.product" pageTitle="Product Variant" backRoute="/product-variants" /></ProtectedRoute>} />
                      <Route path="/product-variants/create" element={<ProtectedRoute pageId="product-variants"><DynamicRecordPage modelName="product.product" pageTitle="Product Variant" backRoute="/product-variants" /></ProtectedRoute>} />
                      <Route path="/lots-serial" element={<ProtectedRoute pageId={getPageIdFromRoute('/lots-serial') || 'lots-serial'}><LotsSerialNumbersPage /></ProtectedRoute>} />
                      <Route path="/lots-serial/edit/:id" element={<ProtectedRoute pageId="lots-serial"><DynamicRecordPage modelName="stock.lot" pageTitle="Lot/Serial Number" backRoute="/lots-serial" /></ProtectedRoute>} />
                      <Route path="/lots-serial/create" element={<ProtectedRoute pageId="lots-serial"><DynamicRecordPage modelName="stock.lot" pageTitle="Lot/Serial Number" backRoute="/lots-serial" /></ProtectedRoute>} />
                      <Route path="/product-packages" element={<ProtectedRoute pageId={getPageIdFromRoute('/product-packages') || 'product-packages'}><PackagesPage /></ProtectedRoute>} />
                      <Route path="/product-packages/edit/:id" element={<ProtectedRoute pageId="product-packages"><DynamicRecordPage modelName="product.package" pageTitle="Package" backRoute="/product-packages" /></ProtectedRoute>} />
                      <Route path="/product-packages/create" element={<ProtectedRoute pageId="product-packages"><DynamicRecordPage modelName="product.package" pageTitle="Package" backRoute="/product-packages" /></ProtectedRoute>} />
                      <Route path="/product-packages/view/:id" element={<ProtectedRoute pageId="product-packages"><DynamicRecordPage modelName="product.package" pageTitle="Package" backRoute="/product-packages" /></ProtectedRoute>} />
                      <Route path="/manufacturing" element={<ProtectedRoute pageId={getPageIdFromRoute('/manufacturing') || 'manufacturing'}><ManufacturingPage /></ProtectedRoute>} />
                      <Route path="/manufacturing/edit/:id" element={<ProtectedRoute pageId="manufacturing"><DynamicRecordPage modelName="mrp.production" pageTitle="Manufacturing Order" backRoute="/manufacturing" /></ProtectedRoute>} />
                      <Route path="/manufacturing/view/:id" element={<ProtectedRoute pageId="manufacturing"><DynamicRecordPage modelName="mrp.production" pageTitle="Manufacturing Order" backRoute="/manufacturing" /></ProtectedRoute>} />
                      <Route path="/manufacturing/create" element={<ProtectedRoute pageId="manufacturing"><DynamicRecordPage modelName="mrp.production" pageTitle="Manufacturing Order" backRoute="/manufacturing" /></ProtectedRoute>} />
                      <Route path="/scrap" element={<ProtectedRoute pageId={getPageIdFromRoute('/scrap') || 'scrap'}><ScrapOrdersPage /></ProtectedRoute>} />
                      <Route path="/scrap/edit/:id" element={<ProtectedRoute pageId="scrap"><DynamicRecordPage modelName="stock.scrap" pageTitle="Scrap Order" backRoute="/scrap" /></ProtectedRoute>} />
                      <Route path="/scrap/create" element={<ProtectedRoute pageId="scrap"><DynamicRecordPage modelName="stock.scrap" pageTitle="Scrap Order" backRoute="/scrap" /></ProtectedRoute>} />
                      <Route path="/landed-costs" element={<ProtectedRoute pageId={getPageIdFromRoute('/landed-costs') || 'landed-costs'}><LandedCostsPage /></ProtectedRoute>} />
                      <Route path="/landed-costs/edit/:id" element={<ProtectedRoute pageId="landed-costs"><DynamicRecordPage modelName="stock.landed.cost" pageTitle="Landed Cost" backRoute="/landed-costs" /></ProtectedRoute>} />
                      <Route path="/landed-costs/create" element={<ProtectedRoute pageId="landed-costs"><DynamicRecordPage modelName="stock.landed.cost" pageTitle="Landed Cost" backRoute="/landed-costs" /></ProtectedRoute>} />
                      <Route path="/warehouse-view" element={<ProtectedRoute pageId={getPageIdFromRoute('/warehouse-view') || 'warehouse-view'}><WarehouseManager /></ProtectedRoute>} />
                      <Route path="/warehouse-locations" element={<ProtectedRoute pageId={getPageIdFromRoute('/warehouse-locations') || 'warehouse-locations'}><WarehousesPage /></ProtectedRoute>} />
                      <Route path="/reporting-location" element={<ProtectedRoute pageId={getPageIdFromRoute('/reporting-location') || 'reporting-location'}><ReportingLocationConst /></ProtectedRoute>} />
                      <Route path="/reporting-location/view/:id" element={<ProtectedRoute pageId="reporting-location"><DynamicRecordPage modelName="stock.quant" pageTitle="Reporting Location" backRoute="/reporting-location" /></ProtectedRoute>} />
                      <Route path="/" element={<Navigate to="/overview" replace />} />
                      <Route path="/dashboard" element={<ProtectedRoute pageId="dashboard"><Dashboard /></ProtectedRoute>} />
                      <Route path="/workflows" element={<ProtectedRoute pageId={getPageIdFromRoute('/workflows') || 'workflows'}><ReactFlowProvider><Workflows /></ReactFlowProvider></ProtectedRoute>} />
                      <Route path="/workflow-v2" element={<ProtectedRoute pageId={getPageIdFromRoute('/workflow-v2') || 'workflow-v2'}><WorkflowV2 /></ProtectedRoute>} />
                      <Route path="/workflow-v2/:id" element={<ProtectedRoute pageId={getPageIdFromRoute('/workflow-v2') || 'workflow-v2'}><WorkflowV2 /></ProtectedRoute>} />
                      <Route path="/form" element={<ProtectedRoute pageId={getPageIdFromRoute('/form') || 'form'}><SurveyCreator /></ProtectedRoute>} />
                      <Route path="/user-management" element={<ProtectedRoute pageId={getPageIdFromRoute('/user-management') || 'user-management'}><UserManagementPage /></ProtectedRoute>} />
                      <Route path="/users" element={<ProtectedRoute pageId="users"><UsersPage /></ProtectedRoute>} />
                      <Route path="/roles" element={<ProtectedRoute pageId="roles"><RolesPage /></ProtectedRoute>} />
                      <Route path="/policies" element={<ProtectedRoute pageId="policies"><PoliciesPage /></ProtectedRoute>} />
                      <Route path="/policy-editor" element={<ProtectedRoute pageId={getPageIdFromRoute('/policy-editor') || 'policy-editor'}><PolicyEditorPage /></ProtectedRoute>} />
                      <Route path='warehouse-management' element={<ProtectedRoute pageId={getPageIdFromRoute('/warehouse-management') || 'warehouse-management'}><WarehouseManagement inboundShipments={INBOUND_SHIPMENTS} /></ProtectedRoute>} />
                      <Route path='/org-chart' element={<ProtectedRoute pageId="org-chart"><OrgChart /></ProtectedRoute>} />
                      <Route path='/fleet-management' element={<ProtectedRoute pageId="fleet-management"><FleetManagementPage /></ProtectedRoute>} />
                      <Route path='/all-vehicles' element={<ProtectedRoute pageId="all-vehicles"><AllVehicles onBack={() => window.history.back()} onSelectVehicle={(id) => console.log('Selected vehicle:', id)} /></ProtectedRoute>} />
                      <Route path='/field-management' element={<ProtectedRoute pageId="field-management"><FieldManagement /></ProtectedRoute>} />
                      <Route path='/field-layout-editor' element={<ProtectedRoute pageId="field-layout-editor"><FieldLayoutEditor /></ProtectedRoute>} />
                      <Route path='/warehouse-configuration/:warehouseId' element={<ProtectedRoute pageId="warehouse-configuration"><WarehouseConfigurationPage /></ProtectedRoute>} />
                      {/* Reports Routes */}
                      <Route path='/report-templates' element={<ProtectedRoute pageId="report-templates"><ReportTemplatesPage /></ProtectedRoute>} />
                      <Route path='/report-template-editor' element={<ProtectedRoute pageId="report-templates"><ReportTemplateEditorPage /></ProtectedRoute>} />
                      <Route path='/report-template-editor/:id' element={<ProtectedRoute pageId="report-templates"><ReportTemplateEditorPage /></ProtectedRoute>} />
                      <Route path='/generated-reports' element={<ProtectedRoute pageId="generated-reports"><GeneratedReportsPage /></ProtectedRoute>} />
                      <Route path='/report-rules' element={<ProtectedRoute pageId="report-rules"><ReportRulesPage /></ProtectedRoute>} />
                      {/* Email Templates Routes */}
                      <Route path='/email-templates' element={<ProtectedRoute pageId="email-templates"><EmailTemplatesPage /></ProtectedRoute>} />
                      <Route path='/email-templates/create' element={<ProtectedRoute pageId="email-templates"><EmailTemplateEditorPage /></ProtectedRoute>} />
                      <Route path='/email-templates/:id' element={<ProtectedRoute pageId="email-templates"><EmailTemplateEditorPage /></ProtectedRoute>} />
                      {/* Integrations Route */}
                      <Route path='/integrations' element={<ProtectedRoute pageId="integrations"><IntegrationsPage /></ProtectedRoute>} />
                      {/* Send Email Route */}
                      <Route path='/send-email' element={<ProtectedRoute pageId="send-email"><SendEmailPage /></ProtectedRoute>} />
                    </Routes>
                  </div>
                </div>
              </main>
              {location.pathname !== '/landing' && <ChatBot />}
            </div>
          ) : (
            <Navigate to="/signin" replace />
          )
        }
      />

      {/* Default redirect */}
      <Route path="*" element={
        isAuthenticated ? (
          <Navigate to="/overview" replace />
        ) : (
          <Navigate to="/signin" replace />
        )
      } />
    </Routes>
  )
}

function App() {  
  return (
    <ThemeProvider>
      <DataProvider>
        <SecurityProvider>
          <CaslProvider>
            <PersonalizationProvider>
              <SidebarProvider>
                <TenantCheck>
                  <AppContent />
                </TenantCheck>
                <Toaster position="top-right" richColors />
              </SidebarProvider>
            </PersonalizationProvider>
          </CaslProvider>
        </SecurityProvider>
      </DataProvider>
    </ThemeProvider>
  )
}

export default App
