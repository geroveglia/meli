import React from 'react';

interface SubTabItem {
    id: string;
    label: string;
    count?: number; // Optional badge count
}

interface SubTabsProps {
    tabs: SubTabItem[];
    activeTab: string;
    onTabChange: (id: string) => void;
}

export const SubTabs: React.FC<SubTabsProps> = ({ tabs, activeTab, onTabChange }) => {
    return (
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6 flex flex-wrap gap-2">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
                            px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 border-b-2
                            ${isActive 
                                ? 'border-blue-600 text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-400 dark:border-blue-400' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800'}
                        `}
                    >
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-400'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};
