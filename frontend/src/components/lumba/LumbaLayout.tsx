import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopBarFilters } from './TopBarFilters';
import { MainTabs } from './MainTabs';

export const LumbaLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 flex flex-col">
            <TopBarFilters />
            <MainTabs />
            
            <main className="flex-grow p-4 md:p-6 overflow-x-hidden">
                <div className="max-w-7xl mx-auto h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
