// ==================== TOAST NOTIFICATION SYSTEM ====================

class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.init();
    }

    init() {
        // Create toast container if not exists
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    show(options = {}) {
        const {
            type = 'info', // success, error, warning, info
            title = '',
            message = '',
            duration = 5000,
            closable = true
        } = options;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Icon based on type
        const icons = {
            success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>',
            error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>',
            warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            ${closable ? '<button class="toast-close" aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>' : ''}
            ${duration > 0 ? '<div class="toast-progress" style="animation-duration: ' + duration + 'ms"></div>' : ''}
        `;

        // Add to container
        this.container.appendChild(toast);
        this.toasts.push(toast);

        // Close button handler
        if (closable) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => this.remove(toast));
        }

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }

        return toast;
    }

    remove(toast) {
        toast.classList.add('hiding');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
                this.toasts = this.toasts.filter(t => t !== toast);
            }
        }, 300);
    }

    success(message, title = 'Thành công') {
        return this.show({ type: 'success', title, message });
    }

    error(message, title = 'Lỗi') {
        return this.show({ type: 'error', title, message });
    }

    warning(message, title = 'Cảnh báo') {
        return this.show({ type: 'warning', title, message });
    }

    info(message, title = 'Thông báo') {
        return this.show({ type: 'info', title, message });
    }

    clearAll() {
        this.toasts.forEach(toast => this.remove(toast));
    }
}

// Create global toast instance
const Toast = new ToastManager();

// ==================== MODAL/DIALOG SYSTEM ====================

class ModalManager {
    constructor() {
        this.activeModal = null;
    }

    show(options = {}) {
        return new Promise((resolve) => {
            const {
                type = 'info', // success, error, warning, info, question
                title = '',
                message = '',
                confirmText = 'OK',
                cancelText = 'Hủy',
                showCancel = false,
                confirmStyle = 'primary', // primary, danger
                onConfirm = null,
                onCancel = null
            } = options;

            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            // Icon based on type
            const icons = {
                success: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>',
                error: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>',
                warning: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
                info: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>',
                question: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m.08 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>'
            };

            const dialog = document.createElement('div');
            dialog.className = `modal-dialog ${type}`;
            dialog.innerHTML = `
                <div class="modal-header">
                    <div class="modal-icon">${icons[type]}</div>
                    <div class="modal-header-content">
                        <h3 class="modal-title">${title}</h3>
                    </div>
                </div>
                <div class="modal-body">
                    <p class="modal-message">${message}</p>
                </div>
                <div class="modal-footer">
                    ${showCancel ? `<button class="modal-btn modal-btn-secondary" data-action="cancel">${cancelText}</button>` : ''}
                    <button class="modal-btn modal-btn-${confirmStyle}" data-action="confirm">${confirmText}</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            this.activeModal = overlay;

            // Button handlers
            const buttons = dialog.querySelectorAll('.modal-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.getAttribute('data-action');
                    if (action === 'confirm') {
                        if (onConfirm) onConfirm();
                        resolve(true);
                    } else {
                        if (onCancel) onCancel();
                        resolve(false);
                    }
                    this.close();
                });
            });

            // Click outside to close
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    if (onCancel) onCancel();
                    resolve(false);
                    this.close();
                }
            });

            // ESC to close
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    if (onCancel) onCancel();
                    resolve(false);
                    this.close();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    close() {
        if (this.activeModal && this.activeModal.parentNode) {
            this.activeModal.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(() => {
                if (this.activeModal && this.activeModal.parentNode) {
                    this.activeModal.parentNode.removeChild(this.activeModal);
                    this.activeModal = null;
                }
            }, 200);
        }
    }

    alert(message, title = 'Thông báo', type = 'info') {
        return this.show({
            type,
            title,
            message,
            confirmText: 'OK',
            showCancel: false
        });
    }

    confirm(message, title = 'Xác nhận', type = 'question') {
        return this.show({
            type,
            title,
            message,
            confirmText: 'Xác nhận',
            cancelText: 'Hủy',
            showCancel: true,
            confirmStyle: type === 'warning' ? 'danger' : 'primary'
        });
    }

    success(message, title = 'Thành công') {
        return this.alert(message, title, 'success');
    }

    error(message, title = 'Lỗi') {
        return this.alert(message, title, 'error');
    }

    warning(message, title = 'Cảnh báo') {
        return this.alert(message, title, 'warning');
    }

    info(message, title = 'Thông báo') {
        return this.alert(message, title, 'info');
    }
}

// Create global modal instance
const Modal = new ModalManager();

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

// Export for use in other scripts
window.Toast = Toast;
window.Modal = Modal;
