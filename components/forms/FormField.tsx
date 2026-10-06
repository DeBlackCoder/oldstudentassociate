import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  helpText?: string;
}

export function FormField({ label, name, error, required, children, helpText }: FormFieldProps) {
  return (
    <div className="mb-6">
      <label htmlFor={name} className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {children}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      className={`
        w-full px-4 py-3 border rounded-none
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-[#1a472a] focus:ring-opacity-20
        ${error ? 'border-red-500' : 'border-gray-300'}
        ${className}
      `}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: Array<{ value: string; label: string }>;
}

export function Select({ error, options, className = '', ...props }: SelectProps) {
  return (
    <select
      className={`
        w-full px-4 py-3 border rounded-none
        transition-all duration-200 bg-white
        focus:outline-none focus:ring-2 focus:ring-[#1a472a] focus:ring-opacity-20
        ${error ? 'border-red-500' : 'border-gray-300'}
        ${className}
      `}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ error, className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`
        w-full px-4 py-3 border rounded-none
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-[#1a472a] focus:ring-opacity-20
        ${error ? 'border-red-500' : 'border-gray-300'}
        ${className}
      `}
      rows={4}
      {...props}
    />
  );
}

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        className={`
          mt-1 w-5 h-5 border-2 border-gray-300 rounded-none
          text-[#1a472a] focus:ring-2 focus:ring-[#1a472a] focus:ring-opacity-20
          cursor-pointer
          ${className}
        `}
        {...props}
      />
      <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
        {label}
      </span>
    </label>
  );
}
