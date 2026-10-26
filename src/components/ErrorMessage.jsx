import Icon from './Icon';

export default function ErrorMessage({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="error-box" role="alert">
      <Icon name="alert" size={28} className="error-box__icon" />
      <div className="error-box__body">
        <strong>{title}</strong>
        {message && <p>{message}</p>}
        {onRetry && (
          <button type="button" className="btn btn--outline btn--sm" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
