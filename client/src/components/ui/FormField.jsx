export default function FormField({ field, value, onChange, options }) {
  const common = {
    id: field.name,
    name: field.name,
    value: value ?? '',
    required: field.required,
    disabled: field.disabled,
    onChange: (e) => onChange(field.name, e.target.value),
  };
  let input;
  if (field.type === 'select') {
    input = (
      <select {...common}>
        <option value="">{field.placeholder || 'Select...'}</option>
        {(field.options || options || []).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  } else if (field.type === 'textarea') {
    input = <textarea rows={3} placeholder={field.placeholder} {...common} />;
  } else {
    input = (
      <input
        type={field.type || 'text'}
        min={field.min}
        step={field.step}
        placeholder={field.placeholder}
        autoComplete={field.type === 'password' ? 'new-password' : undefined}
        {...common}
      />
    );
  }
  return (
    <div className={`form-group ${field.full ? 'full' : ''}`}>
      <label htmlFor={field.name}>
        {field.label}{field.required && <span className="req"> *</span>}
      </label>
      {input}
    </div>
  );
}
