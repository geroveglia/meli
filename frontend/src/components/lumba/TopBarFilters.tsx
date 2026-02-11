import React from 'react';
import { useLumbaStore, MeliAccount } from '../../stores/lumbaStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

export const TopBarFilters: React.FC = () => {
    const { 
        selectedAccount, 
        setAccount, 
        accounts,
        fetchAccounts,
        fetchOrders,
        searchQuery, 
        setSearchQuery,
        dateFrom,
        dateTo,
        setDateRange
    } = useLumbaStore();
    const { logout } = useAuthStore();
    const navigate = useNavigate();

    React.useEffect(() => {
        fetchAccounts();
    }, []);

    // Re-fetch orders when account changes
    React.useEffect(() => {
        fetchOrders();
    }, [selectedAccount, fetchOrders]);

    const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === "Todas") {
            setAccount("Todas");
        } else {
            const acc = accounts.find(a => typeof a !== 'string' && a.id === val);
            if (acc) setAccount(acc);
        }
    };

    const getAccountValue = (acc: MeliAccount) => {
        if (acc === "Todas") return "Todas";
        return acc.id;
    };

    const getAccountLabel = (acc: MeliAccount) => {
        if (acc === "Todas") return "Todas";
        return acc.name;
    };

    const currentParamsValue = selectedAccount === "Todas" ? "Todas" : selectedAccount.id;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Filters Group */}
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                
                {/* Account Selector */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-medium uppercase">Cuenta MELI</label>
                    <select 
                        value={currentParamsValue} 
                        onChange={handleAccountChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    >
                        {accounts.map((acc, idx) => (
                            <option key={typeof acc === 'string' ? acc : acc.id} value={getAccountValue(acc)}>
                                {getAccountLabel(acc)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Search */}
                <div className="flex flex-col gap-1 flex-grow md:flex-grow-0 md:min-w-[200px]">
                    <label className="text-xs text-gray-500 font-medium uppercase">Buscar</label>
                    <input 
                        type="text" 
                        placeholder="ID, Comprador..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    />
                </div>

                {/* Dates */}
                <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-medium uppercase">Desde</label>
                        <input 
                            type="date" 
                            value={dateFrom}
                            onChange={(e) => setDateRange(e.target.value, dateTo)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-medium uppercase">Hasta</label>
                        <input 
                            type="date" 
                            value={dateTo}
                            onChange={(e) => setDateRange(dateFrom, e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                        />
                    </div>
                </div>

            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <button 
                    onClick={() => navigate('/perfil')}
                    className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
                >
                    Perfil
                </button>
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                <button 
                    onClick={handleLogout}
                    className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                >
                    Salir
                </button>
            </div>
        </div>
    );
};
