import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="py-6 px-4 text-center border-b border-gray-700/50 shadow-xl bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
      <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
          One-Prompt AI Fashion Studio
        </span>
      </h1>
      <p className="text-gray-400 mt-2 text-sm max-w-2xl mx-auto">
        Upload a model, describe the entire new scene in a single prompt, and let AI create a stunning editorial image.
      </p>
    </header>
  );
};