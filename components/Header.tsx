import React from 'react';

const Header: React.FC = () => {
  return (
    <>
      <header className="flex flex-col sm:flex-row sm:justify-center sm:items-center text-white mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 py-2">
          Ứng dụng viết kịch bản đặc biệt
        </h1>
      </header>
    </>
  );
};

export default Header;