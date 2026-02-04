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
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Cuenta</p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{order.account}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Fecha</p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{new Date(order.date).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Comprador</p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{order.buyerName}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{order.buyerAddress}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">${order.total.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Estado Interno (Ventas)</p>
                                        <span className="inline-flex items-center rounded-md bg-gray-800 px-2 py-1 text-xs font-medium text-white dark:bg-gray-700 dark:text-gray-100">
                                            {order.salesStatus}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Estado Logistica</p>
                                        <span className="inline-flex items-center rounded-md bg-gray-800 px-2 py-1 text-xs font-medium text-white dark:bg-gray-700 dark:text-gray-100">
                                            {order.logisticsStatus}
                                        </span>
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Estado MELI</p>
                                        <span className="inline-flex items-center rounded-md bg-gray-800 px-2 py-1 text-xs font-medium text-white dark:bg-gray-700 dark:text-gray-100">
                                            {order.meliStatus}
                                        </span>
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
