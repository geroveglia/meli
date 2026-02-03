import React, { useState, useMemo } from 'react';
import { useLumbaStore, Order, SalesState } from '../../stores/lumbaStore';
import { OrderDetailModal } from '../../components/lumba/OrderDetailModal';
import { PageLayout } from '../../components/PageLayout';
import { SearchAndFilters } from '../../components/SearchAndFilters';
import { useSearchParams } from 'react-router-dom';
import { faUsersGear } from '@fortawesome/free-solid-svg-icons';

export const VentasPage: React.FC = () => {
    const { 
        orders, 
        selectedAccount, 
        searchQuery, 
        dateFrom, 
        dateTo,
        setSelectedAccount,
        setSearchQuery,
        setDateRange,
        updateOrderSalesStatus,
        simulateMeliUpdates
    } = useLumbaStore();

    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('status') || 'TODAS';
    
    // Derived state for filter options (mocked for now, similar to Logistica)
    const filters = [
        {
            key: 'account',
            label: 'Cuenta',
            options: ['Todas', 'Cuenta 1', 'Cuenta 2'], // Example options
            value: selectedAccount,
            onChange: (val: string) => setSelectedAccount(val)
        }
    ];

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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
                break;
            case 'FACTURAR_MANUAL':
                updateOrderSalesStatus(order.id, 'facturada', 'manual');
                break;
            case 'CANCELAR':
                updateOrderSalesStatus(order.id, 'venta_cancelada');
                break;
            case 'GENERAR_NC':
                updateOrderSalesStatus(order.id, 'nota_credito');
                break;
            case 'VER':
                setSelectedOrder(order);
                break;
        }
    };

    const renderActions = (order: Order, isModal: boolean = false) => {
        const buttons = [];

        if (order.salesStatus === 'pendiente_facturacion') {
            buttons.push(
                <button key="auto" onClick={() => handleAction(order, 'FACTURAR_AUTO')} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-300">
                    Facturar Auto
                </button>
            );
            buttons.push(
                <button key="manual" onClick={() => handleAction(order, 'FACTURAR_MANUAL')} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300">
                    Facturar Manual
                </button>
            );
            buttons.push(
                <button key="cancel" onClick={() => handleAction(order, 'CANCELAR')} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-300">
                    Cancelar
                </button>
            );
        }

        if (order.salesStatus === 'facturada') {
            buttons.push(
                <button key="nc" onClick={() => handleAction(order, 'GENERAR_NC')} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300">
                    Generar NC
                </button>
            );
        }
        
        // Common "Ver" button
        if (!isModal) {
            buttons.push(
                <button key="ver" onClick={() => handleAction(order, 'VER')} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">
                    Ver
                </button>
            );
        }

        return <div className="flex gap-2 flex-wrap items-center justify-end">{buttons}</div>;
    };


    return (
        <PageLayout
            title="Ventas"
            subtitle="Gestión de ventas y facturación"
            faIcon={{ icon: faUsersGear }}
            headerActions={
                <button 
                  onClick={simulateMeliUpdates}
                  className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 shadow-sm transition-colors"
                >
                    Simular Update MELI
                </button>
            }
            searchAndFilters={
                <SearchAndFilters
                    searchTerm={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Buscar por ID, nombre..."
                    filters={filters}
                    dateFilter={{
                        dateFrom,
                        dateTo,
                        onDateChange: setDateRange
                    }}
                />
            }
        >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cuenta / ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Comprador</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado Venta</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado MELI</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No se encontraron pedidos
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{order.account}</div>
                                            <div className="text-xs text-gray-500">{order.meliOrderId}</div>
                                            <div className="text-xs text-gray-400">{new Date(order.date).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">{order.buyerName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">${order.total.toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                                    order.salesStatus === 'facturada' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                    order.salesStatus === 'venta_cancelada' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                                    order.salesStatus === 'nota_credito' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                                                    'bg-blue-50 text-blue-700 ring-blue-700/10'
                                                }`}>
                                                    {order.salesStatus.replace('_', ' ')}
                                                </span>
                                                {/* Badge for manual/auto billing */}
                                                {order.salesStatus === 'facturada' && order.billingType && (
                                                     <span className={`text-[10px] px-1 rounded border ${
                                                         order.billingType === 'auto' ? 'border-blue-200 text-blue-600' : 'border-gray-300 text-gray-600'
                                                     }`}>
                                                         {order.billingType.toUpperCase()}
                                                     </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                                 order.meliStatus === 'cancelled' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                                 order.meliStatus === 'delivered' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                                            }`}>
                                                {order.meliStatus}
                                            </span>
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

            <OrderDetailModal 
                isOpen={!!selectedOrder} 
                onClose={() => setSelectedOrder(null)} 
                order={selectedOrder}
                renderActions={(order) => renderActions(order, true)}
            />
        </PageLayout>
    );
};
