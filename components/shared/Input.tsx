

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  const baseStyles = 'w-full bg-slate-900 border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition';
  
  // This component will now always return just the input element.
  // The label logic has been moved to the parent component (SettingsTab) for more flexibility.
  if (label) {
     console.warn("The 'label' prop on the Input component is deprecated and will be removed. Please handle labels in the parent component.");
  }

  return <input className={`${baseStyles} ${className}`} {...props} />;
};

export default Input;
