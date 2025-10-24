
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: string[];
}

const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
  const baseStyles = 'w-full bg-slate-900 border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition';
  
  if (label) {
    return (
      <div>
        <label className="block text-sm font-semibold mb-1">{label}:</label>
        <select className={`${baseStyles} ${className}`} {...props}>
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <select className={`${baseStyles} ${className}`} {...props}>
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
};

export default Select;