import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Order } from '../../stores/lumbaStore';
import { Button } from '../Button';

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
                            <Dialog.Panel id="printable-order-detail" className="w-full max-w-7xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-5 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 mb-4"
                                >
                                    Detalle del Pedido #{order.meliOrderId}
                                </Dialog.Title>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                                    {/* Column 1: Info & Buyer */}
                                    <div className="space-y-6">
                                        {/* Basic Info */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Información Básica</h4>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Cuenta</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                        {typeof order.account === 'string' ? order.account : order.account.name}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Fecha de Compra</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{new Date(order.date).toLocaleDateString()} {new Date(order.date).toLocaleTimeString()}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">ID Interno</p>
                                                        <p className="text-xs font-mono text-gray-900 dark:text-gray-100">{order.id}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">ID MELI</p>
                                                        <p className="text-xs font-mono text-gray-900 dark:text-gray-100">{order.meliOrderId}</p>
                                                    </div>
                                                </div>
                                                {order.packId && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Pack ID</p>
                                                        <p className="text-xs font-mono text-gray-900 dark:text-gray-100">{order.packId}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Buyer */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Comprador</h4>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Nombre</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{order.buyerName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Dirección</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300">{order.buyerAddress}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Statuses & Docs */}
                                    <div className="space-y-6">
                                        {/* Statuses */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Estados</h4>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Estado MELI</p>
                                                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                        {order.meliStatus}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Gestión Logística</p>
                                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                                                        {order.logisticsStatus.replace(/_/g, " ")}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Gestión Ventas</p>
                                                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-200">
                                                        {order.salesStatus.replace(/_/g, " ")}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Facturación</p>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {order.invoiceStatus === 'invoiced' ? 'Facturado' : order.invoiceStatus === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                                                        </span>
                                                        {order.billingType && <span className="text-[10px] text-gray-500">Tipo: {order.billingType}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Docs */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Documentación / Financiero</h4>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Documento</p>
                                                    <p className="text-sm text-gray-900 dark:text-gray-100">
                                                        {order.docType && order.docNumber ? `${order.docType}: ${order.docNumber}` : "No especificado"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Pagado</p>
                                                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">${order.total.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 3: Logistics Detail & Items */}
                                    <div className="space-y-6">
                                        {/* Logistics Detail */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Detalle Logístico</h4>
                                            <div className="grid grid-cols-2 gap-3 mb-2">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Etiqueta</p>
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${order.tagStatus === 'impresas' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {order.tagStatus}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Empaquetado</p>
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${order.packaged ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {order.packaged ? 'Sí' : 'No'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Envío</p>
                                                    <p className="text-sm text-gray-900 dark:text-gray-100">{order.shippingStatus}</p>
                                                    <p className="text-[10px] text-gray-500">{order.shippingSubStatus !== "-" ? order.shippingSubStatus : ""}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Corte de envío</p>
                                                    <p className="text-sm text-gray-900 dark:text-gray-100">{order.shippingCutoff}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400">Act: {new Date(order.lastUpdated).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Items */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Items ({order.items.length})</h4>
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 space-y-2 max-h-[150px] overflow-y-auto">
                                                {order.items.map(item => (
                                                    <div key={item.id} className="flex justify-between text-xs border-b border-gray-200 dark:border-gray-600 last:border-0 pb-1 last:pb-0">
                                                        <div className="flex flex-col">
                                                            <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[150px] md:max-w-[200px]" title={item.title}>{item.quantity}x {item.title}</span>
                                                        </div>
                                                        <span className="text-gray-900 dark:text-gray-100 whitespace-nowrap ml-2">${item.price}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-row justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    {renderActions(order)}
                                    <Button
                                        onClick={onClose}
                                        variant="secondary"
                                        size="sm"
                                    >
                                        Cerrar
                                    </Button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
