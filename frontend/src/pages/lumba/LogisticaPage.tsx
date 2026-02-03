import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLumbaStore, Order, LogisticsState, MeliAccount } from '../../stores/lumbaStore';
import { OrderDetailModal } from '../../components/lumba/OrderDetailModal';
import { toast } from 'sonner';
import { PageLayout } from '../../components/PageLayout';
import { SearchAndFilters } from '../../components/SearchAndFilters';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruck, faBox, faCheck, faEye, faPrint } from '@fortawesome/free-solid-svg-icons';

export const LogisticaPage: React.FC = () => {
    const { 
        orders, 
        selectedAccount, 
        setAccount,
        searchQuery, 
        setSearchQuery,
        dateFrom, 
        dateTo,
        setDateRange,
        updateOrderLogisticsStatus,
        simulateMeliUpdates
    } = useLumbaStore();

    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('status') || 'TODAS';

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

        // 4. Filter by Tab (State) - Derived from URL
        const tabMap: Record<string, LogisticsState[]> = {
          'PENDIENTE_PREPARACION': ['pendiente_preparacion'],
          'LISTO_PARA_ENTREGAR': ['listo_para_entregar'],
          'DESPACHADO_MELI': ['despachado_meli'],
          'RETIRO_EN_LOCAL': ['retiro_local'],
          'ENTREGADOS': ['entregado'],
          'CANCELADOS': ['cancelado_vuelto_stock'],
          'DEVOLUCION': ['devolucion_vuelto_stock'],
        };

        if (activeTab !== 'TODAS') {
            const allowedStates = tabMap[activeTab];
            if (allowedStates) {
                result = result.filter(o => allowedStates.includes(o.logisticsStatus));
            }
        }

        return result;
    }, [orders, selectedAccount, searchQuery, dateFrom, dateTo, activeTab]);

    // --- Actions ---

    const handleAction = (order: Order, action: string) => {
        switch (action) {
            case 'PASAR_A_LISTO':
                updateOrderLogisticsStatus(order.id, 'listo_para_entregar');
                break;
            case 'MARCAR_ENTREGADO':
                updateOrderLogisticsStatus(order.id, 'entregado');
                break;
            case 'VER':
                setSelectedOrder(order);
                break;
            case 'ETIQUETA':
                toast.success('Descargando etiqueta...');
                break;
        }
    };

    const renderActions = (order: Order, isModal: boolean = false) => {
        const buttons = [];

        if (order.logisticsStatus === 'pendiente_preparacion') {
            buttons.push(
                <button key="listo" onClick={() => handleAction(order, 'PASAR_A_LISTO')} className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300">
                    <FontAwesomeIcon icon={faBox} size="xs"/> Listo
                </button>
            );
        }

        if (order.logisticsStatus === 'retiro_local') {
             buttons.push(
                <button key="entregado" onClick={() => handleAction(order, 'MARCAR_ENTREGADO')} className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-300">
                    <FontAwesomeIcon icon={faCheck} size="xs"/> Entregado
                </button>
            );
        }
        
        // Common "Ver" button
        if (!isModal) {
            buttons.push(
                <button key="ver" onClick={() => handleAction(order, 'VER')} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">
                    <FontAwesomeIcon icon={faEye} size="xs"/> Ver
                </button>
            );
        }

        return <div className="flex gap-2 flex-wrap items-center justify-end">{buttons}</div>;
    };

    // Filter Options
    const accountOptions = [
        { value: 'Todas', label: 'Todas las Cuentas' },
        { value: 'Cuenta 1', label: 'Cuenta 1' },
        { value: 'Cuenta 2', label: 'Cuenta 2' },
        { value: 'Cuenta 3', label: 'Cuenta 3' },
    ];

    const currentTitle = activeTab === 'TODAS' ? 'Logística: Todos los pedidos' : 
                         activeTab === 'PENDIENTE_PREPARACION' ? 'Pendientes de Preparación' :
                         activeTab.replace(/_/g, ' ');

    return (
        <PageLayout
            title={currentTitle}
            subtitle="Gestión de envíos y logística"
            faIcon={{ icon: faTruck }}
            headerActions={
                <button 
                  onClick={simulateMeliUpdates}
                  className="text-xs bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 shadow-sm transition-colors font-medium"
                >
                    Simular Update MELI
                </button>
            }
            searchAndFilters={
                <SearchAndFilters
                    searchTerm={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Buscar por ID, comprador..."
                    filters={[
                        {
                            value: selectedAccount,
                            onChange: (val) => setAccount(val as MeliAccount),
                            options: accountOptions
                        }
                    ]}
                    dateFilter={{
                        startDate: dateFrom,
                        endDate: dateTo,
                        onStartDateChange: (val) => setDateRange(val, dateTo),
                        onEndDateChange: (val) => setDateRange(dateFrom, val)
                    }}
                />
            }
        >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                         <thead className="bg-gray-50 dark:bg-gray-750">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cuenta / ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Comprador</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Items</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado Logistica</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado MELI</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Etiqueta</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                       <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                           {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No se encontraron pedidos
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{order.account}</div>
                                            <div className="text-xs text-gray-500 font-mono mt-0.5">{order.meliOrderId}</div>
                                            <div className="text-xs text-gray-400 mt-0.5">{new Date(order.date).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{order.buyerName}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-[150px]" title={order.buyerAddress}>{order.buyerAddress}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-600 dark:text-gray-300">
                                                {order.items.length > 0 && (
                                                    <span>{order.items[0].quantity}x {order.items[0].title} {order.items.length > 1 && <span className="text-gray-400">(+{order.items.length - 1} más)</span>}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                                order.logisticsStatus === 'entregado' ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400' :
                                                order.logisticsStatus === 'cancelado_vuelto_stock' || order.logisticsStatus === 'devolucion_vuelto_stock' ? 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400' :
                                                'bg-blue-50 text-blue-700 ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400'
                                            }`}>
                                                {order.logisticsStatus.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                                 order.meliStatus === 'cancelled' ? 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400' :
                                                 order.meliStatus === 'delivered' ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400' :
                                                 'bg-yellow-50 text-yellow-800 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            }`}>
                                                {order.meliStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button 
                                                onClick={() => handleAction(order, 'ETIQUETA')}
                                                className="text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors"
                                                title="Imprimir Etiqueta"
                                            >
                                                <FontAwesomeIcon icon={faPrint} className="w-4 h-4" />
                                            </button>
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
