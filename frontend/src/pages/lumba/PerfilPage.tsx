import React from 'react';

export const PerfilPage: React.FC = () => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4">Perfil de Usuario</h1>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">Usuario Demo</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">demo@lumba.com</p>
                </div>
            </div>
        </div>
    );
};
