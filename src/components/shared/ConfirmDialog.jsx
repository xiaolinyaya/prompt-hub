import Modal from './Modal'

export default function ConfirmDialog({ title, message, confirmLabel = '确认', cancelLabel = '取消', onConfirm, onCancel, variant = 'primary' }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className={`btn btn-${variant}`} onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{message}</p>
    </Modal>
  )
}
