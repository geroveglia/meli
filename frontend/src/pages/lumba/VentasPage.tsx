import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLumbaStore, Order, SalesState } from '../../stores/lumbaStore';
import { OrderDetailModal } from '../../components/lumba/OrderDetailModal';
import { PageLayout } from '../../components/PageLayout';
import { SearchAndFilters } from '../../components/SearchAndFilters';
import { useSearchParams } from 'react-router-dom';
import { faFilePen, faBan, faFileInvoiceDollar, faUsersGear, faEye, faTable, faGrip } from "@fortawesome/free-solid-svg-icons";
import { Badge } from "../../components/Badge";
import { sweetAlert } from '../../utils/sweetAlert';
import { Card } from '../../components/Card';

export const VentasPage: React.FC = () => {
    const { 
        orders, 
        selectedAccount, 
        searchQuery, 
        dateFrom, 
        dateTo,
        setAccount,
        setSearchQuery,
        setDateRange,
        updateOrderSalesStatus,

    } = useLumbaStore();

    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('status') || 'TODAS';
    
    // Derived state for filter options (mocked for now, similar to Logistica)
    const filters = [
        {
            value: selectedAccount,
            onChange: (val: string) => setAccount(val as any),
            options: [
                { value: 'Todas', label: 'Todas las Cuentas' },
                { value: 'Cuenta 1', label: 'Cuenta 1' },
                { value: 'Cuenta 2', label: 'Cuenta 2' },
                { value: 'Cuenta 3', label: 'Cuenta 3' }
            ]
        }
    ];

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
        const saved = localStorage.getItem('ventas_view_mode');
        return (saved === 'table' || saved === 'cards') ? saved : 'cards';
    });

    // Save preference
    React.useEffect(() => {
        localStorage.setItem('ventas_view_mode', viewMode);
    }, [viewMode]);

    // Force cards view on mobile
    React.useEffect(() => {
        const handleResize = () => {
             if (window.innerWidth < 768) {
                 setViewMode('cards');
             }
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Derived Data / Filtering ---

    const filteredOrders = useMemo(() => {
        let result = orders;

        // 1. Filter by Account
        if (selectedAccount !== 'Todas') {
            result = result.filter(o => o.account === selectedAccount);
        }

        // 2. Filter by Search Query
        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            result = result.filter(o => 
                o.meliOrderId.toLowerCase().includes(lowerQ) || 
                o.buyerName.toLowerCase().includes(lowerQ) ||
                o.id.toLowerCase().includes(lowerQ)
            );
        }

        // 3. Filter by Date Range
        if (dateFrom) {
            result = result.filter(o => new Date(o.date) >= new Date(dateFrom));
        }
        if (dateTo) {
            result = result.filter(o => new Date(o.date) <= new Date(dateTo));
        }

        // 4. Filter by Tab (State)
        const tabMap: Record<string, SalesState[]> = {
            'PENDIENTE_FACTURACION': ['pendiente_facturacion'],
            'FACTURADAS': ['facturada'],
            'VENTAS_CANCELADAS': ['venta_cancelada'],
            'NOTAS_DE_CREDITO': ['nota_credito'],
        };

        if (activeTab !== 'TODAS') {
            const allowedStates = tabMap[activeTab];
            if (allowedStates) {
                result = result.filter(o => allowedStates.includes(o.salesStatus));
            }
        }

        return result;
    }, [orders, selectedAccount, searchQuery, dateFrom, dateTo, activeTab]);

    // --- Actions ---

    const handleAction = (order: Order, action: string) => {
        switch (action) {
            case 'FACTURAR_AUTO':
                updateOrderSalesStatus(order.id, 'facturada', 'auto');
                sweetAlert.success('Facturado', 'La venta ha sido facturada automáticamente');
                break;
            case 'FACTURAR_MANUAL':
                updateOrderSalesStatus(order.id, 'facturada', 'manual');
                sweetAlert.success('Facturado', 'La venta ha sido marcada como facturada manualmente');
                break;
            case 'CANCELAR':
                updateOrderSalesStatus(order.id, 'venta_cancelada');
                sweetAlert.success('Cancelado', 'La venta ha sido cancelada');
                break;
            case 'GENERAR_NC':
                updateOrderSalesStatus(order.id, 'nota_credito');
                sweetAlert.success('Nota de Crédito', 'Se ha generado la nota de crédito');
                break;
            case 'VER':
                setSelectedOrder(order);
                break;
        }
    };

    const renderActions = (order: Order, isModal: boolean = false, isCard: boolean = false) => {
        const buttons = [];

        // 1. Primary Actions (Invoice, NC) - Left
        if (order.salesStatus === 'pendiente_facturacion') {
            buttons.push(
                <button key="manual" onClick={() => handleAction(order, 'FACTURAR_MANUAL')} className="text-blue-600 hover:text-blue-800 p-1.5 transition-colors" title="Facturar Manual">
                    <FontAwesomeIcon icon={faFilePen} className="h-4 w-4" />
                </button>
            );
        }

        if (order.salesStatus === 'facturada') {
            buttons.push(
                <button key="nc" onClick={() => handleAction(order, 'GENERAR_NC')} className="text-blue-600 hover:text-blue-800 p-1.5 transition-colors" title="Generar Nota de Crédito">
                    <FontAwesomeIcon icon={faFileInvoiceDollar} className="h-4 w-4" />
                </button>
            );
        }

        // 2. View - Middle
        if (!isModal && !isCard) {
            buttons.push(
                <button key="ver" onClick={(e) => { e.stopPropagation(); handleAction(order, 'VER'); }} className="text-blue-600 hover:text-blue-800 p-1.5 transition-colors" title="Ver Detalle">
                     <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                </button>
            );
        }

        // 3. Destructive/Cancel - Right (Last)
        if (order.salesStatus === 'pendiente_facturacion') {
            buttons.push(
                <button key="cancel" onClick={() => handleAction(order, 'CANCELAR')} className="text-blue-600 hover:text-blue-800 p-1.5 transition-colors" title="Cancelar">
                    <FontAwesomeIcon icon={faBan} className="h-4 w-4" />
                </button>
            );
        }

        return (
            <div 
                className="flex gap-2 flex-nowrap items-center justify-end" 
                onClick={(e) => e.stopPropagation()}
            >
                {buttons}
            </div>
        );
    };


    const titleMap: Record<string, string> = {
        'TODAS': 'Ventas: Todos los pedidos',
        'PENDIENTE_FACTURACION': 'Pendiente Facturación',
        'FACTURADAS': 'Facturadas',
        'VENTAS_CANCELADAS': 'Ventas Canceladas',
        'NOTAS_DE_CREDITO': 'Notas de Crédito'
    };

    const currentTitle = titleMap[activeTab] || activeTab.replace(/_/g, ' ');

    const renderCards = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOrders.length === 0 ? (
                <div className="col-span-full text-center py-10 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500">
                    No se encontraron pedidos
                </div>
            ) : (
                filteredOrders.map(order => (
                    <Card
                        key={order.id}
                        header={{
                            title: order.id,
                            subtitle: order.meliOrderId,
                            icon: faUsersGear,
                            badges: [
                                {
                                    text: order.meliStatus,
                                    variant: order.meliStatus === 'cancelled' ? 'warning' : order.meliStatus === 'delivered' ? 'success' : 'info'
                                }
                            ]
                        }}
                        footer={{
                            leftContent: (
                                <div className="w-full">
                                    {renderActions(order, false, true)}
                                </div>
                            )
                        }}
                        onClick={() => handleAction(order, 'VER')}
                    >
                         <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Total:</span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">${order.total.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Comprador:</span>
                                <span className="text-gray-900 dark:text-gray-100 truncate max-w-[150px]" title={order.buyerName}>{order.buyerName}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Fecha:</span>
                                <span className="text-gray-900 dark:text-gray-100">{new Date(order.date).toLocaleDateString()}</span>
                            </div>
                            
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-750 p-2 rounded">
                                    <span className="text-xs text-gray-500">Gestión:</span>
                                    <Badge>
                                        {order.salesStatus.replace(/_/g, ' ')}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-750 p-2 rounded">
                                    <span className="text-xs text-gray-500">Factura:</span>
                                    <Badge>
                                        {order.invoiceStatus === 'invoiced' ? 'Facturada' : 
                                         order.invoiceStatus === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                                    </Badge>
                                </div>
                            </div>
                         </div>
                    </Card>
                ))
            )}
        </div>
    );

    return (
        <PageLayout
            title={currentTitle}
            subtitle="Gestión de ventas y facturación"
            faIcon={{ icon: faUsersGear }}
            searchAndFilters={
                <SearchAndFilters
                    searchTerm={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Buscar por ID, nombre..."
                    filters={filters}
                    dateFilter={{
                        startDate: dateFrom,
                        endDate: dateTo,
                        onStartDateChange: (val) => setDateRange(val, dateTo),
                        onEndDateChange: (val) => setDateRange(dateFrom, val)
                    }}
                >
                    <div className="hidden md:flex items-center bg-accent-3 border border-accent-4 rounded-lg p-1 gap-1">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                                viewMode === 'table' 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'text-accent-4 hover:text-accent-5 hover:bg-accent-2'
                            }`}
                            title="Ver como tabla"
                        >
                            <FontAwesomeIcon icon={faTable} />
                            <span className="hidden sm:inline">Tabla</span>
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                                viewMode === 'cards' 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'text-accent-4 hover:text-accent-5 hover:bg-accent-2'
                            }`}
                            title="Ver como tarjetas"
                        >
                            <FontAwesomeIcon icon={faGrip} />
                            <span className="hidden sm:inline">Cards</span>
                        </button>
                    </div>
                </SearchAndFilters>
            }
        >
            {viewMode === 'table' ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-750">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Acciones</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Id venta RTSS</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Pack Id ML</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Id venta ML</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Fecha pedido ML</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Estado pedido ML</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Gestión Interna Pedido</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Estado Factura</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Publicación</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Total pagado</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Comprador</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Tipo Doc</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Nro Doc</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Última modificación</th>

                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={14} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                            No se encontraron pedidos
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                {renderActions(order)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {order.id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                                {order.packId || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                                                {order.meliOrderId}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                                {new Date(order.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <Badge>
                                                    {order.meliStatus}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Badge>
                                                        {order.salesStatus.replace(/_/g, ' ')}
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <Badge>
                                                    {order.invoiceStatus === 'invoiced' ? 'Facturada' : 
                                                     order.invoiceStatus === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-gray-900 dark:text-white line-clamp-2" title={order.items.length > 0 ? order.items[0].title : ''}>
                                                    {order.items.length > 0 ? order.items[0].title : '-'}
                                                    {order.items.length > 1 && <span className="text-gray-400 ml-1">(+{order.items.length - 1})</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">${order.total.toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white">{order.buyerName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-500">
                                                {order.docType || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                                                {order.docNumber || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                                {new Date(order.lastUpdated).toLocaleString()}
                                            </td>

                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                renderCards()
            )}

            <OrderDetailModal 
                isOpen={!!selectedOrder} 
                onClose={() => setSelectedOrder(null)} 
                order={selectedOrder}
                renderActions={(order) => renderActions(order, true)}
            />
        </PageLayout>
    );
};
