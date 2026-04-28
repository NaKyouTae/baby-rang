import { InputHTMLAttributes, forwardRef } from 'react';

type FormInputProps = InputHTMLAttributes<HTMLInputElement>;

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className = '', disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        className={`w-full rounded-[4px] border border-gray-200 bg-white px-3 py-3 text-[14px] placeholder:text-gray-400 outline-none focus:border-gray-400 transition-colors ${disabled ? 'font-normal text-gray-400' : 'font-normal text-app-black'} ${className}`}
        {...props}
      />
    );
  },
);

FormInput.displayName = 'FormInput';

export default FormInput;
