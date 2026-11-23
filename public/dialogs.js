// Native modal dialogs provide focus confinement, inert background and Escape support.
const noticeQueue = [];
let activeNotice = null;
const noticeDialog = document.getElementById('noticeDialog');
const noticeAccept = document.getElementById('noticeAccept');
const noticeCancel = document.getElementById('noticeCancel');

function showConfirmation(message, options = {}) {
    return enqueueNotice(message, { ...options, confirmation: true });
}

async function showError(message) {
    await enqueueNotice(message, { title: 'Une erreur est survenue', confirmation: false });
}

function enqueueNotice(message, options) {
    return new Promise(resolve => {
        noticeQueue.push({ message, options, resolve, trigger: document.activeElement });
        displayNextNotice();
    });
}

function displayNextNotice() {
    if (activeNotice || noticeQueue.length === 0) return;
    activeNotice = noticeQueue.shift();
    const { message, options } = activeNotice;
    document.getElementById('noticeTitle').textContent = options.title || 'Confirmer cette action';
    document.getElementById('noticeMessage').textContent = String(message);
    noticeCancel.hidden = !options.confirmation;
    noticeAccept.textContent = options.confirmation ? (options.acceptLabel || 'Confirmer') : 'Fermer';
    noticeAccept.dataset.destructive = String(Boolean(options.destructive));
    noticeDialog.showModal();
    (options.confirmation ? noticeCancel : noticeAccept).focus();
}

function finishNotice(accepted) {
    if (!activeNotice) return;
    activeNotice.accepted = accepted;
    noticeDialog.close();
}

noticeAccept.addEventListener('click', () => finishNotice(true));
noticeCancel.addEventListener('click', () => finishNotice(false));
noticeDialog.addEventListener('cancel', event => {
    event.preventDefault();
    finishNotice(false);
});
noticeDialog.addEventListener('close', () => {
    if (!activeNotice) return;
    const completed = activeNotice;
    activeNotice = null;
    completed.trigger?.focus();
    completed.resolve(Boolean(completed.accepted));
    displayNextNotice();
});
