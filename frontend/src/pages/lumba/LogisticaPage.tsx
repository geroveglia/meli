import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLumbaStore, Order, LogisticsState, MeliAccount } from '../../stores/lumbaStore';
import { OrderDetailModal } from '../../components/lumba/OrderDetailModal';
import { toast } from 'sonner';
import { sweetAlert } from '../../utils/sweetAlert';
import { PageLayout } from '../../components/PageLayout';
import { SearchAndFilters } from '../../components/SearchAndFilters';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruck, faBox, faCheck, faEye } from '@fortawesome/free-solid-svg-icons';

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
                sweetAlert.success('Estado actualizado', 'El pedido está listo para entregar');
                break;
            case 'MARCAR_ENTREGADO':
                updateOrderLogisticsStatus(order.id, 'entregado');
                sweetAlert.success('Entregado', 'El pedido ha sido marcado como entregado');
                break;
            case 'VER':
                setSelectedOrder(order);
                break;
            case 'ETIQUETA':
                toast.success('Descargando etiqueta...');
                sweetAlert.info('Descargando', 'La etiqueta se está generando...');
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

    const titleMap: Record<string, string> = {
        'TODAS': 'Logística: Todos los pedidos',
        'PENDIENTE_PREPARACION': 'Pendiente de preparación',
        'LISTO_PARA_ENTREGAR': 'Listo para entregar',
        'DESPACHADO_MELI': 'Despachado M.L.',
        'RETIRO_EN_LOCAL': 'Retiro en local',
        'ENTREGADOS': 'Entregados',
        'CANCELADOS': 'Cancelados',
        'DEVOLUCION': 'Devolución'
    };

    const currentTitle = titleMap[activeTab] || activeTab.replace(/_/g, ' ');

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
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Id venta RTSS</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Pack Id ML</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Id venta ML</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Fecha ML</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Antes de las 15hs</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Estado ML</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Estado etiqueta</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Gestión Interna Venta</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Publicación</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Cant</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Variante</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Entrega ML</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Estado Envío ML</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Última modificación</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">Acciones</th>
                            </tr>
                        </thead>
                       <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                           {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={15} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
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
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-medium">
                                            {order.shippingCutoff !== '-' ? (
                                                <span className="text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">{order.shippingCutoff}</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
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
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                                order.tagStatus === 'impresas' ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400' :
                                                order.tagStatus === 'error' ? 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400' :
                                                'bg-yellow-50 text-yellow-800 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            }`}>
                                                {order.tagStatus}
                                            </span>
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
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 cursor-pointer">
                                                {order.items.length > 0 ? order.items[0].title : '-'}
                                                {order.items.length > 1 && <span className="text-gray-400 ml-1">(+{order.items.length - 1})</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-500">
                                            {order.items.length > 0 ? order.items[0].quantity : 0}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {order.items.length > 0 && order.items[0].variant ? order.items[0].variant : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                             <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                                 order.shippingStatus === 'delivered' ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400' :
                                                 'bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-700/30 dark:text-gray-400'
                                            }`}>
                                                {order.shippingStatus === 'delivered' ? 'Entregado' : 'No Entregado'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-500">
                                            {order.shippingSubStatus}
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

            <OrderDetailModal 
                isOpen={!!selectedOrder} 
                onClose={() => setSelectedOrder(null)} 
                order={selectedOrder}
                renderActions={(order) => renderActions(order, true)}
            />
        </PageLayout>
    );
};
