const LoginPage = () => {
  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/asana`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-6 flex flex-col items-center">
          <img
            src="https://www.rian.io/icons/rian-logo.svg"
            alt="Rian"
            width="48"
            height="48"
            className="mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900">Rian Dashboard</h1>
          <p className="text-gray-500 mt-2">Track your tasks from Asana</p>
        </div>

        {new URLSearchParams(window.location.search).get('error') && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            Authentication failed. Please try again.
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="6" r="4.5" />
            <circle cx="5" cy="16" r="4.5" />
            <circle cx="19" cy="16" r="4.5" />
          </svg>
          Login with Asana
        </button>

        <p className="text-xs text-gray-400 mt-4">
          We only request read access to your tasks and projects.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
