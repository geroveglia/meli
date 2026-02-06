import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Order } from '../../stores/lumbaStore';

interface OrderDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    renderActions: (order: Order) => React.ReactNode;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ isOpen, onClose, order, renderActions }) => {
    if (!order) return null;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 dark:bg-black/50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 mb-4"
                                >
                                    Detalle del Pedido #{order.meliOrderId}
                                </Dialog.Title>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 mb-6">
                                    {/* 1. Basic Info */}
                                    <div className="col-span-1 md:col-span-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Información Básica</h4>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Cuenta</p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{order.account}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Fecha de Compra</p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{new Date(order.date).toLocaleDateString()} {new Date(order.date).toLocaleTimeString()}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">ID Venta (Interno)</p>
                                        <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{order.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">ID Venta (MELI)</p>
                                        <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{order.meliOrderId}</p>
                                    </div>
                                    
                                    {order.packId && (
                                        <div className="col-span-1 md:col-span-2">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Pack ID</p>
                                            <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{order.packId}</p>
                                        </div>
                                    )}

                                    {/* 2. Buyer Info */}
                                    <div className="col-span-1 md:col-span-2 mt-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Comprador</h4>
                                    </div>
                                    
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Nombre</p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{order.buyerName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Dirección de Envío</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{order.buyerAddress}</p>
                                    </div>
                                    
                                    {/* 3. Statuses */}
                                    <div className="col-span-1 md:col-span-2 mt-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Estados y Gestión</h4>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Estado MELI</p>
                                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                            {order.meliStatus}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Gestión Logística</p>
                                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                                            {order.logisticsStatus.replace(/_/g, " ")}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Gestión Ventas</p>
                                        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-200">
                                            {order.salesStatus.replace(/_/g, " ")}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Facturación</p>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {order.invoiceStatus === 'invoiced' ? 'Facturado' : order.invoiceStatus === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                                            </span>
                                            {order.billingType && <span className="text-xs text-gray-500">Tipo: {order.billingType}</span>}
                                        </div>
                                    </div>

                                    {/* 4. Shipping & Logistics Detail */}
                                    <div className="col-span-1 md:col-span-2 mt-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Detalle Logístico</h4>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Etiqueta</p>
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${order.tagStatus === 'impresas' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {order.tagStatus}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Empaquetado</p>
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${order.packaged ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {order.packaged ? 'Sí' : 'No'}
                                        </span>
                                    </div>
                                    
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Envío</p>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">{order.shippingStatus}</p>
                                        <p className="text-xs text-gray-500">Subestado: {order.shippingSubStatus}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Corte de envío</p>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">{order.shippingCutoff}</p>
                                    </div>

                                    {/* 5. Documents */}
                                    <div className="col-span-1 md:col-span-2 mt-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Documentación</h4>
                                    </div>
                                    
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Documento Cliente</p>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">
                                            {order.docType && order.docNumber ? `${order.docType}: ${order.docNumber}` : "No especificado"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Pagado</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">${order.total.toLocaleString()}</p>
                                    </div>
                                    
                                    <div className="col-span-1 md:col-span-2">
                                        <p className="text-xs text-gray-400 text-right">Última actualización: {new Date(order.lastUpdated).toLocaleString()}</p>
                                    </div>

                                </div>

                                <div className="mb-6">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Items</h4>
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                                        {order.items.map(item => (
                                            <div key={item.id} className="flex justify-between text-sm">
                                                <span className="text-gray-700 dark:text-gray-300">{item.quantity}x {item.title}</span>
                                                <span className="font-medium text-gray-900 dark:text-gray-100">${item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-row justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    {renderActions(order)}
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
