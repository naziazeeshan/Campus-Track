export default function Button({ variant = 'primary', icon: Icon, className = '', children, ...props }) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
