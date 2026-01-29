import { Link } from "react-router-dom";

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Bienvenido</h1>
          <p className="text-gray-600">Portal de Gestión</p>
        </div>

        <div className="space-y-4">
          <Link to="/login" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Iniciar Sesión
          </Link>

          <Link to="/register" className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Registrarse
          </Link>
        </div>
      </div>
    </div>
  );
};
