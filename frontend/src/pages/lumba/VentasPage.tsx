import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLumbaStore, Order, SalesState } from '../../stores/lumbaStore';
import { OrderDetailModal } from '../../components/lumba/OrderDetailModal';
import { PageLayout } from '../../components/PageLayout';
import { SearchAndFilters } from '../../components/SearchAndFilters';
import { useSearchParams } from 'react-router-dom';
import { faUsersGear, faTable, faGrip, faCheck, faEye, faBan, faFileInvoiceDollar, faBolt, faFilePen } from '@fortawesome/free-solid-svg-icons';
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
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

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

        if (order.salesStatus === 'pendiente_facturacion') {
            buttons.push(
                <button key="auto" onClick={() => handleAction(order, 'FACTURAR_AUTO')} className="text-gray-400 hover:text-green-600 p-1.5 transition-colors" title="Facturar Auto">
                    <FontAwesomeIcon icon={faBolt} className="h-4 w-4" />
                </button>
            );
            buttons.push(
                <button key="manual" onClick={() => handleAction(order, 'FACTURAR_MANUAL')} className="text-gray-400 hover:text-blue-600 p-1.5 transition-colors" title="Facturar Manual">
                    <FontAwesomeIcon icon={faFilePen} className="h-4 w-4" />
                </button>
            );
            buttons.push(
                <button key="cancel" onClick={() => handleAction(order, 'CANCELAR')} className="text-gray-400 hover:text-red-600 p-1.5 transition-colors" title="Cancelar">
                    <FontAwesomeIcon icon={faBan} className="h-4 w-4" />
                </button>
            );
        }

        if (order.salesStatus === 'facturada') {
            buttons.push(
                <button key="nc" onClick={() => handleAction(order, 'GENERAR_NC')} className="text-gray-400 hover:text-orange-600 p-1.5 transition-colors" title="Generar Nota de Crédito">
                    <FontAwesomeIcon icon={faFileInvoiceDollar} className="h-4 w-4" />
                </button>
            );
        }
        
        // Common "Ver" button
        if (!isModal && !isCard) {
            buttons.push(
                <button key="ver" onClick={(e) => { e.stopPropagation(); handleAction(order, 'VER'); }} className="text-gray-400 hover:text-blue-600 p-1.5 transition-colors" title="Ver Detalle">
                     <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
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
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-100">
                                        {order.salesStatus.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-750 p-2 rounded">
                                    <span className="text-xs text-gray-500">Factura:</span>
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-100">
                                        {order.invoiceStatus === 'invoiced' ? 'Facturada' : 
                                         order.invoiceStatus === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                                    </span>
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
            headerActions={
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
                        title={viewMode === 'table' ? 'Ver como tarjetas' : 'Ver como tabla'}
                    >
                        <FontAwesomeIcon icon={viewMode === 'table' ? faGrip : faTable} />
                        {viewMode === 'table' ? 'Cards' : 'Tabla'}
                    </button>

                </div>
            }
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
                />
            }
        >
            {viewMode === 'table' ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-750">
                                <tr>
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
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Acciones</th>
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
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-100">
                                                    {order.meliStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-100">
                                                        {order.salesStatus.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-100">
                                                    {order.invoiceStatus === 'invoiced' ? 'Facturada' : 
                                                     order.invoiceStatus === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 cursor-pointer line-clamp-2" title={order.items.length > 0 ? order.items[0].title : ''}>
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
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {renderActions(order)}
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
