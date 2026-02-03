import React from 'react';
import { NavLink } from 'react-router-dom';

export const MainTabs: React.FC = () => {
    
    const getLinkClass = ({ isActive }: { isActive: boolean }) => 
        `px-6 py-3 font-bold text-sm border-b-2 transition-colors duration-200 ${
            isActive 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
        }`;

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4">
            <nav className="flex space-x-4">
                <NavLink to="/ventas" className={getLinkClass}>
                    VENTAS
                </NavLink>
                <NavLink to="/logistica" className={getLinkClass}>
                    LOGISTICA
                </NavLink>
            </nav>
        </div>
    );
};
